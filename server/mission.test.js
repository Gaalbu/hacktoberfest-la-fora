import assert from 'node:assert/strict'
import test from 'node:test'
import { generateMission, parseMission, validateMissionInput } from './mission.js'

test('accepts bounded preferences and normalizes optional context', () => {
  assert.deepEqual(validateMissionInput({
    duration: 10,
    environment: 'porch',
    movement: 'still',
    focus: 'sounds',
    context: '  rainy morning  ',
    language: 'en',
  }), {
    duration: 10,
    environment: 'porch',
    movement: 'still',
    focus: 'sounds',
    context: 'rainy morning',
    language: 'en',
  })
})

test('rejects unsupported choices and oversized context', () => {
  assert.throws(() => validateMissionInput({ duration: 20 }), /Invalid mission preferences/)
  assert.throws(() => validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'shapes', context: 'x'.repeat(201) }), /Invalid mission preferences/)
})

test('accepts only a safe mission with one question and three concise steps', () => {
  const mission = parseMission(JSON.stringify({
    title: 'Listen nearby',
    question: 'Which sound changes when you become still?',
    steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice a sound you had missed.'],
  }), { duration: 5, language: 'en' })
  assert.equal(mission.duration, 5)
  assert.equal(mission.steps.length, 3)
})

test('rejects malformed, incomplete, mismatched and unsafe model output', () => {
  assert.throws(() => parseMission('not json', { duration: 5, language: 'en' }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['one'] }), { duration: 5, language: 'en' }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['step', 'step', 'step'], duration: 60 }), { duration: 5, language: 'en' }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['Climb a roof.', 'Listen quietly.', 'Walk back.'] }), { duration: 5, language: 'en' }), /safety/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'Climb a roof.', question: 'Which sound changes when you become still?', steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice one sound you had missed.'] }), { duration: 5, language: 'en' }), /safety/i)
})

test('reports missing credentials without contacting the provider', async () => {
  await assert.rejects(generateMission({}, { apiKey: '' }), { status: 503 })
})

test('sends the key in a header and returns only the validated mission', async () => {
  let request
  const input = validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'sounds', context: '', language: 'en' })
  const mission = await generateMission(input, {
    apiKey: 'test-only-secret', model: 'gemma-4-26b-a4b-it',
    fetchImpl: async (url, options) => {
      request = { url, options }
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Listen nearby', question: 'Which sound changes when you become still?', steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice one sound you had missed.'] }) }] } }] }) }
    },
  })
  assert.match(request.url, /gemma-4-26b-a4b-it:generateContent/)
  assert.equal(request.options.headers['x-goog-api-key'], 'test-only-secret')
  assert.equal(request.url.includes('test-only-secret'), false)
  assert.equal(mission.duration, 5)
  assert.equal(mission.steps.length, 3)
})

test('maps quota, provider failure and timeout without leaking upstream details', async () => {
  const input = validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'sounds', context: '', language: 'en' })
  await assert.rejects(generateMission(input, { apiKey: 'key', model: 'm', fetchImpl: async () => ({ ok: false, status: 429 }) }), { status: 429 })
  await assert.rejects(generateMission(input, { apiKey: 'key', model: 'm', fetchImpl: async () => ({ ok: false, status: 500 }) }), { status: 502 })
  await assert.rejects(generateMission(input, { apiKey: 'key', model: 'm', fetchImpl: async () => { throw new DOMException('sensitive provider details', 'TimeoutError') } }), { status: 504 })
})

test('retries invalid model output once, then stops', async () => {
  const input = validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'sounds', context: '', language: 'en' })
  let calls = 0
  const result = await generateMission(input, {
    apiKey: 'key', model: 'm',
    fetchImpl: async () => {
      calls += 1
      const text = calls === 1 ? 'not json' : JSON.stringify({ title: 'Listen nearby', question: 'Which sound changes when you become still?', steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice one sound you had missed.'] })
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) }
    },
  })
  assert.equal(calls, 2)
  assert.equal(result.title, 'Listen nearby')

  calls = 0
  await assert.rejects(generateMission(input, { apiKey: 'key', model: 'm', fetchImpl: async () => { calls += 1; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'invalid' }] } }] }) } } }), { message: 'Invalid mission format' })
  assert.equal(calls, 2)
})
