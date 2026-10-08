export type SavedCard<T> = { mission: T; notes: [string, string, string] }

const storageKey = 'la-fora-card-v1'
const languageKey = 'out-there-language'
const rhythmKey = 'out-there-weekly-rhythm-v1'

export function localDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function isDateKey(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const [, year, month, day] = match
  const date = new Date(Number(year), Number(month) - 1, Number(day))
  return date.getFullYear() === Number(year) && date.getMonth() === Number(month) - 1 && date.getDate() === Number(day)
}

export function readWeeklyRhythm(today = new Date()): string[] {
  try {
    const raw = localStorage.getItem(rhythmKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    const todayKey = localDateKey(today)
    const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6)
    const firstDayKey = localDateKey(firstDay)
    return [...new Set(parsed.filter((value): value is string => typeof value === 'string' && isDateKey(value) && value >= firstDayKey && value <= todayKey))].sort()
  } catch {
    return []
  }
}

export function recordWeeklyPause(today = new Date()): boolean {
  try {
    const dates = new Set(readWeeklyRhythm(today))
    dates.add(localDateKey(today))
    localStorage.setItem(rhythmKey, JSON.stringify([...dates].sort()))
    return true
  } catch {
    return false
  }
}

export type Language = 'en' | 'pt-BR'

export function readLanguage(): Language | null {
  try {
    const language = localStorage.getItem(languageKey)
    return language === 'en' || language === 'pt-BR' ? language : null
  } catch {
    return null
  }
}

export function writeLanguage(language: Language): boolean {
  try {
    localStorage.setItem(languageKey, language)
    return true
  } catch {
    return false
  }
}

export function readSavedCard<T>(): SavedCard<T> | null {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return null
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object' || !('mission' in value) || !('notes' in value)) return null
    const card = value as SavedCard<T>
    if (!Array.isArray(card.notes) || card.notes.length !== 3 || card.notes.some((note) => typeof note !== 'string')) return null
    return card
  } catch {
    return null
  }
}

export function writeSavedCard<T>(card: SavedCard<T>): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(card))
    return true
  } catch {
    return false
  }
}

export function clearSavedCard(): boolean {
  try {
    localStorage.removeItem(storageKey)
    return true
  } catch {
    return false
  }
}
