/* ตรรกะของที่พักความคิด (ฟังก์ชันล้วน) — โน้ต = { id, text, createdAt } เรียงใหม่สุดก่อน */

import { newId } from './id.js'
import { MAX_TITLE } from './tasks.js'

/** ใหม่สุดก่อน (เวลาเท่ากันคงลำดับเดิม) */
export const sortNotes = (list) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt))

/** เพิ่มโน้ต คืน { notes, note } (note = null ถ้าข้อความว่าง) ยาวเท่าชื่องานเพื่อแปลงเป็นงานได้ไม่ขาด */
export function addNote(all, text, now = new Date()) {
  const clean = String(text ?? '')
    .trim()
    .slice(0, MAX_TITLE)
  if (!clean) return { notes: all, note: null }
  const note = { id: newId('p'), text: clean, createdAt: now.toISOString() }
  return { notes: [note, ...all], note }
}

export const removeNote = (all, id) => all.filter((n) => n.id !== id)

/** ใส่โน้ตกลับ (เลิกทำ): กลับเข้าที่เดิมตามเวลาที่จด */
export const restoreNote = (all, note) =>
  all.some((n) => n.id === note.id) ? all : sortNotes([...all, note])
