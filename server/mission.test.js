import assert from 'node:assert/strict'
import test from 'node:test'
import { generateMission, parseMission, validateMissionInput } from './mission.js'

test('accepts bounded preferences and normalizes optional context', () => {
  assert.deepEqual(validateMissionInput({
    language: 'en',
    duration: 10,
    environment: 'porch',
    movement: 'still',
    focus: 'sounds',
    context: '  rainy morning  ',
  }), {
    language: 'en',
    duration: 10,
    environment: 'porch',
    movement: 'still',
    focus: 'sounds',
    context: 'rainy morning',
  })
})

test('rejects unsupported choices, locales and oversized context', () => {
  assert.throws(() => validateMissionInput({ duration: 20, language: 'en' }), /Invalid mission preferences/)
  assert.throws(() => validateMissionInput({ language: 'fr', duration: 5, environment: 'porch', movement: 'still', focus: 'sounds', context: '' }), /Invalid mission preferences/)
  assert.throws(() => validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'shapes', context: 'x'.repeat(201), language: 'en' }), /Invalid mission preferences/)
  assert.throws(() => validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'shapes', context: '', language: 'pt' }), /Invalid mission preferences/)
})

test('accepts only a safe mission with one question and three concise steps', () => {
  const mission = parseMission(JSON.stringify({
    title: 'Listen nearby',
    question: 'Which sound changes when you become still?',
    steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice a sound you had missed.'],
  }), { duration: 5 })
  assert.equal(mission.duration, 5)
  assert.equal(mission.steps.length, 3)
})

test('accepts Gemma wrapping one mission in an array but rejects multiple missions', () => {
  const mission = { title: 'Sons da varanda', question: 'Que sons discretos você percebe ao redor?', steps: ['Fique em um lugar conhecido.', 'Escute por um minuto.', 'Perceba um som distante.'] }
  assert.equal(parseMission(JSON.stringify([mission]), { duration: 5 }).title, mission.title)
  assert.throws(() => parseMission(JSON.stringify([mission, mission]), { duration: 5 }), /invalid/i)
})

test('rejects malformed, incomplete, mismatched and unsafe model output', () => {
  assert.throws(() => parseMission('not json', { duration: 5 }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['one'] }), { duration: 5 }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['step', 'step', 'step'], duration: 60 }), { duration: 5 }), /invalid/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'x', question: 'y', steps: ['Climb a roof.', 'Listen quietly.', 'Walk back.'] }), { duration: 5 }), /safety/i)
  assert.throws(() => parseMission(JSON.stringify({ title: 'Climb a roof.', question: 'Which sound changes when you become still?', steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice one sound you had missed.'] }), { duration: 5 }), /safety/i)
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
  assert.deepEqual(JSON.parse(request.options.body).generationConfig.thinkingConfig, { thinkingLevel: 'minimal' })
  assert.equal(mission.duration, 5)
  assert.equal(mission.steps.length, 3)
})

test('ignores Gemma thought parts and parses only its final response', async () => {
  const input = validateMissionInput({ duration: 10, environment: 'porch', movement: 'still', focus: 'sounds', context: '', language: 'en' })
  const result = await generateMission(input, {
    apiKey: 'key', model: 'gemma-4-26b-a4b-it',
    fetchImpl: async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [
      { text: 'Reasoning that is not JSON', thought: true },
      { text: JSON.stringify({ title: 'Listen nearby', question: 'Which sound changes when you become still?', steps: ['Stand in a familiar place.', 'Listen for one minute.', 'Notice a sound you had missed.'] }) },
    ] } }] }) }),
  })
  assert.equal(result.title, 'Listen nearby')
})


test('requests and accepts a Brazilian Portuguese mission when selected', async () => {
  const input = validateMissionInput({ duration: 5, environment: 'porch', movement: 'still', focus: 'sounds', context: '', language: 'pt-BR' })
  let sentPrompt = ''
  const mission = await generateMission(input, {
    apiKey: 'key', model: 'gemma-4-26b-a4b-it',
    fetchImpl: async (_url, options) => {
      sentPrompt = JSON.parse(options.body).contents[0].parts[0].text
      return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: JSON.stringify({ title: 'Sons da varanda', question: 'Que sons discretos você consegue perceber agora?', steps: ['Fique em um lugar familiar.', 'Escute por um minuto.', 'Perceba um som que passaria despercebido.'] }) }] } }] }) }
    },
  })
  assert.match(sentPrompt, /Brazilian Portuguese/)
  assert.match(sentPrompt, /property names exactly in English as "title", "question", and "steps"/)
  assert.equal(mission.title, 'Sons da varanda')
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
