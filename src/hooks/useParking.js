import { useMemo } from 'react'
import { addNote, removeNote, restoreNote, sortNotes } from '../lib/parking.js'
import { normalizeNotes } from '../lib/sanitize.js'
import { usePersistentState } from './usePersistentState.js'

const EMPTY = []

/** ที่พักความคิด (key: parking) notes เรียงใหม่สุดก่อน
 *  remove คืนสำเนาเดิมของโน้ต เพื่อให้ผู้เรียกทำ "เลิกทำ" ด้วย restore(สำเนา) ได้ */
export function useParking() {
  const [stored, setStored] = usePersistentState('parking', EMPTY)
  const clean = useMemo(() => normalizeNotes(stored), [stored])
  const notes = useMemo(() => sortNotes(clean), [clean])
  const setNotes = (next) =>
    setStored((raw) => {
      const current = normalizeNotes(raw)
      return typeof next === 'function' ? next(current) : next
    })

  return {
    notes,
    add: (text) => {
      let created = null
      setNotes((all) => {
        const result = addNote(all, text)
        created = result.note
        return result.notes
      })
      return created
    },
    remove: (id) => {
      const snapshot = clean.find((n) => n.id === id) ?? null
      setNotes((all) => removeNote(all, id))
      return snapshot
    },
    restore: (note) => setNotes((all) => restoreNote(all, note)),
  }
}
