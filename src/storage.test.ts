import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSavedCard, readLanguage, readSavedCard, readWeeklyRhythm, recordWeeklyPause, writeLanguage, writeSavedCard } from './storage'

const mission = { title: 'Listen nearby', question: 'What did you notice?', steps: ['Stand here.', 'Listen now.', 'Write it down.'], duration: 5 }

afterEach(() => vi.unstubAllGlobals())

describe('saved observation card', () => {
  it('persists only supported interface languages', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    expect(writeLanguage('pt-BR')).toBe(true)
    expect(readLanguage()).toBe('pt-BR')
    values.set('out-there-language', 'fr')
    expect(readLanguage()).toBeNull()
  })

  it('writes and reads one card and its notes', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const card = { mission, notes: ['birds', '', ''] as [string, string, string] }
    expect(writeSavedCard(card)).toBe(true)
    expect(readSavedCard()).toEqual(card)
    expect(clearSavedCard()).toBe(true)
    expect(readSavedCard()).toBeNull()
  })

  it('handles corrupt or unavailable storage without crashing', () => {
    vi.stubGlobal('localStorage', { getItem: () => '{', setItem: () => { throw new Error('blocked') }, removeItem: () => { throw new Error('blocked') } })
    expect(readSavedCard()).toBeNull()
    expect(writeSavedCard({ mission, notes: ['', '', ''] })).toBe(false)
    expect(clearSavedCard()).toBe(false)
  })

  it('records a local pause once per day and keeps only the rolling seven days', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const today = new Date(2026, 9, 8, 12)
    values.set('out-there-weekly-rhythm-v1', JSON.stringify(['2026-10-01', '2026-10-03', '2026-10-08']))

    expect(readWeeklyRhythm(today)).toEqual(['2026-10-03', '2026-10-08'])
    expect(recordWeeklyPause(today)).toBe(true)
    expect(recordWeeklyPause(today)).toBe(true)
    expect(readWeeklyRhythm(today)).toEqual(['2026-10-03', '2026-10-08'])
  })

  it('ignores invalid dates, future dates and keeps the rhythm when the card is cleared', () => {
    const values = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    })
    const today = new Date(2026, 9, 8, 12)
    values.set('out-there-weekly-rhythm-v1', JSON.stringify(['2026-02-31', '2026-10-09', '2026-10-07']))
    writeSavedCard({ mission, notes: ['', '', ''] })

    expect(readWeeklyRhythm(today)).toEqual(['2026-10-07'])
    expect(clearSavedCard()).toBe(true)
    expect(readWeeklyRhythm(today)).toEqual(['2026-10-07'])
  })

  it('handles blocked rhythm storage without crashing', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked') },
      setItem: () => { throw new Error('blocked') },
      removeItem: () => { throw new Error('blocked') },
    })
    expect(readWeeklyRhythm(new Date(2026, 9, 8))).toEqual([])
    expect(recordWeeklyPause(new Date(2026, 9, 8))).toBe(false)
  })
})
