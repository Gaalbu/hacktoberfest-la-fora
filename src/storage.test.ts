import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearSavedCard, readLanguage, readSavedCard, writeLanguage, writeSavedCard } from './storage'

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
})
