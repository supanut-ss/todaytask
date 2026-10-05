import { describe, expect, it } from 'vitest'
import { normalizeNotes, normalizeTasks, sanitizeCurrent, sanitizeList } from './sanitize.js'

const good = {
  id: 't_1',
  title: 'งาน',
  status: 'todo',
  date: '2026-10-04',
  order: 0,
  createdAt: '2026-10-04T01:00:00.000Z',
  doneAt: null,
}

describe('sanitize: ข้อมูลที่รูปร่างผิด (ตอนอ่านจาก localStorage)', () => {
  it.each([
    ['สตริง', 'ไม่ใช่ json'],
    ['ตัวเลข', 42],
    ['null', null],
    ['undefined', undefined],
    ['object', { a: 1 }],
    ['boolean', true],
  ])('ไม่ใช่ array (%s) -> ถือว่าว่าง ไม่โยนข้อผิดพลาด', (_n, value) => {
    expect(normalizeTasks(value)).toEqual([])
    expect(normalizeNotes(value)).toEqual([])
  })

  it('array ที่มีสมาชิกแปลกๆ ปนอยู่: เก็บเฉพาะที่ใช้ได้', () => {
    const list = [
      good,
      null,
      undefined,
      7,
      'x',
      [],
      {},
      { id: 't_2' },
      { ...good, id: 't_3', date: 'ผิด' },
    ]
    expect(normalizeTasks(list).map((t) => t.id)).toEqual(['t_1'])
  })

  it('ผลลัพธ์ทุกรายการพร้อมใช้ (มีทุกฟิลด์ ชนิดถูก) เรียงและเปรียบเทียบได้โดยไม่พัง', () => {
    const [t] = normalizeTasks([
      { id: 'a', title: ' ก ', date: '2026-10-04', order: 'x', createdAt: 5 },
    ])
    expect(t).toEqual({
      id: 'a',
      title: 'ก',
      status: 'todo',
      date: '2026-10-04',
      order: 0,
      createdAt: '1970-01-01T00:00:00.000Z',
      doneAt: null,
    })
    expect(() => t.createdAt.localeCompare('x')).not.toThrow()
  })

  it('โน้ต: ข้อความไม่ใช่ string ถูกข้าม', () => {
    expect(
      normalizeNotes([
        { id: 'p', text: 123 },
        { id: 'q', text: 'ดี', createdAt: '2026-10-04T01:00:00Z' },
      ]).map((n) => n.id),
    ).toEqual(['q'])
  })

  it('id ซ้ำเก็บตัวแรก และนับจำนวนที่ข้าม', () => {
    const r = sanitizeList([good, good, null], (x) => (x ? good : null))
    expect(r.items).toHaveLength(1)
    expect(r.skipped).toBe(2)
  })

  it('งานปัจจุบันที่รูปร่างผิด -> null', () => {
    expect(sanitizeCurrent('x')).toBeNull()
    expect(sanitizeCurrent([1])).toBeNull()
    expect(sanitizeCurrent({ id: 't', date: '2026-10-04' })).toEqual({
      id: 't',
      date: '2026-10-04',
    })
  })
})
