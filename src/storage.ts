export type SavedCard<T> = { mission: T; notes: [string, string, string] }

const storageKey = 'la-fora-card-v1'

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
