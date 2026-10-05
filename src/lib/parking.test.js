import { describe, expect, it } from 'vitest'
import { addNote, removeNote, restoreNote, sortNotes } from './parking.js'

const at = (iso) => new Date(iso)

describe('parking', () => {
  it('เพิ่มโน้ตไว้บนสุด ตัดช่องว่าง และไม่เพิ่มถ้าว่าง', () => {
    let all = addNote([], '  ซื้อหมึก  ', at('2026-10-04T03:00:00Z')).notes
    const { notes, note } = addNote(all, 'ถามพี่เอ', at('2026-10-04T04:00:00Z'))
    expect(note.text).toBe('ถามพี่เอ')
    expect(note.id).toMatch(/^p_[0-9a-f]{12}$/)
    expect(notes.map((n) => n.text)).toEqual(['ถามพี่เอ', 'ซื้อหมึก'])
    all = notes
    expect(addNote(all, '   ')).toEqual({ notes: all, note: null })
  })

  it('จำกัดความยาว 200 ตัวอักษรเท่าชื่องาน', () => {
    expect(addNote([], 'ก'.repeat(300)).note.text).toHaveLength(200)
  })

  it('เรียงใหม่สุดก่อน', () => {
    const list = [
      { id: 'a', text: 'เก่า', createdAt: '2026-10-04T01:00:00.000Z' },
      { id: 'b', text: 'ใหม่', createdAt: '2026-10-04T05:00:00.000Z' },
    ]
    expect(sortNotes(list).map((n) => n.id)).toEqual(['b', 'a'])
    expect(list[0].id).toBe('a') // ไม่แก้ของเดิม
  })

  it('ลบแล้วเลิกทำ: กลับเข้าที่เดิมตามเวลาที่จด', () => {
    let all = []
    for (const [text, time] of [
      ['ก', '2026-10-04T01:00:00Z'],
      ['ข', '2026-10-04T02:00:00Z'],
      ['ค', '2026-10-04T03:00:00Z'],
    ])
      all = addNote(all, text, at(time)).notes
    const middle = all.find((n) => n.text === 'ข')
    const after = removeNote(all, middle.id)
    expect(after.map((n) => n.text)).toEqual(['ค', 'ก'])
    expect(restoreNote(after, middle).map((n) => n.text)).toEqual(['ค', 'ข', 'ก'])
    expect(restoreNote(all, middle)).toBe(all) // ยังอยู่แล้ว = ไม่ซ้ำ
  })
})
