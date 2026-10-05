// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDays, today } from '../lib/date.js'
import {
  byText,
  cleanup,
  click,
  makeTask,
  mount,
  savedTasks,
  seedTasks,
  taskTitles,
  type,
} from '../test-utils.jsx'

const TODAY = today()
const TOMORROW = addDays(TODAY, 1)
const YESTERDAY = addDays(TODAY, -1)

const note = (text, createdAt = new Date().toISOString()) => ({
  id: `p_${Math.random().toString(16).slice(2, 14)}`,
  text,
  createdAt,
})
const seedNotes = (...notes) => window.localStorage.setItem('tw:v1:parking', JSON.stringify(notes))
const savedNotes = () => JSON.parse(window.localStorage.getItem('tw:v1:parking') ?? '[]')
const btn = (c, label) => c.querySelector(`button[aria-label="${label}"]`)
const noteTexts = (c) => [...c.querySelectorAll('ul li p:first-child')].map((p) => p.textContent)
const localISO = (daysAgo, h, m) => {
  const d = new Date()
  d.setDate(d.getDate() - daysAgo)
  d.setHours(h, m, 0, 0)
  return d.toISOString()
}

describe('ที่พักความคิด (เฟส 4)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('เรียงใหม่สุดก่อน และบอกเวลาที่จดเป็นภาษาคน', async () => {
    seedNotes(note('เก่า', localISO(1, 9, 5)), note('ใหม่', localISO(0, 10, 42)))
    const c = await mount('/parking')
    expect(noteTexts(c)).toEqual(['ใหม่', 'เก่า'])
    expect(c.textContent).toContain('จดเมื่อ วันนี้ 10:42')
    expect(c.textContent).toContain('จดเมื่อ เมื่อวาน 09:05')
  })

  it('"ทำวันนี้": โน้ตกลายเป็นงานของวันนี้ ชื่อตรงกัน และเลิกทำได้', async () => {
    const a = note('ต้องซื้อหมึกปริ้นท์', localISO(0, 9, 0))
    seedNotes(a, note('ถามพี่เอ', localISO(0, 10, 0)))
    const c = await mount('/parking')

    await click(btn(c, 'ทำวันนี้: ต้องซื้อหมึกปริ้นท์'))
    expect(noteTexts(c)).toEqual(['ถามพี่เอ'])
    expect(savedNotes().map((n) => n.text)).toEqual(['ถามพี่เอ'])
    expect(savedTasks()).toHaveLength(1)
    expect(savedTasks()[0]).toMatchObject({
      title: 'ต้องซื้อหมึกปริ้นท์',
      date: TODAY,
      status: 'todo',
    })
    expect(c.textContent).toContain('เพิ่มเป็นงานวันนี้แล้ว')

    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks()).toEqual([])
    expect(noteTexts(c)).toEqual(['ถามพี่เอ', 'ต้องซื้อหมึกปริ้นท์']) // กลับที่เดิมตามเวลาที่จด
  })

  it('"เลือกวัน" -> พรุ่งนี้', async () => {
    seedNotes(note('ส่งลิงก์ประชุม'))
    const c = await mount('/parking')
    expect(c.querySelector('[role="group"]')).toBeNull()
    await click(btn(c, 'เลือกวัน: ส่งลิงก์ประชุม'))
    await click(byText(c.querySelector('[role="group"]'), 'พรุ่งนี้'))
    expect(savedTasks()[0]).toMatchObject({ title: 'ส่งลิงก์ประชุม', date: TOMORROW })
    expect(c.textContent).toContain('เพิ่มเป็นงานพรุ่งนี้แล้ว')
    expect(savedNotes()).toEqual([])
  })

  it('"เลือกวัน" -> วันที่เลือกเอง และไม่ยอมรับวันที่ผ่านมาแล้ว', async () => {
    seedNotes(note('โทรหาศูนย์บริการ'))
    const c = await mount('/parking')
    await click(btn(c, 'เลือกวัน: โทรหาศูนย์บริการ'))
    const dateInput = c.querySelector('input[type="date"]')

    await type(dateInput, YESTERDAY)
    expect(savedTasks()).toEqual([]) // วันที่ผ่านไปแล้ว ไม่ทำอะไร
    expect(savedNotes()).toHaveLength(1)

    const target = addDays(TODAY, 6)
    await type(dateInput, target)
    expect(savedTasks()[0]).toMatchObject({ title: 'โทรหาศูนย์บริการ', date: target })
    expect(savedNotes()).toEqual([])
  })

  it('ลบแล้วเลิกทำ: โน้ตกลับเข้าที่เดิม', async () => {
    seedNotes(
      note('ก', localISO(0, 8, 0)),
      note('ข', localISO(0, 9, 0)),
      note('ค', localISO(0, 10, 0)),
    )
    const c = await mount('/parking')
    await click(btn(c, 'ลบ: ข'))
    expect(noteTexts(c)).toEqual(['ค', 'ก'])
    expect(c.textContent).toContain('ลบแล้ว')
    await click(byText(c, 'เลิกทำ'))
    expect(noteTexts(c)).toEqual(['ค', 'ข', 'ก'])
  })

  it('จัดการทีละใบ: งานต่อท้ายลิสต์ของวันตามลำดับ และโน้ตอื่นไม่ถูกแตะ', async () => {
    seedTasks([makeTask({ title: 'งานเดิม', date: TODAY, order: 0 })])
    seedNotes(
      note('ก', localISO(0, 8, 0)),
      note('ข', localISO(0, 9, 0)),
      note('ค', localISO(0, 10, 0)),
    )
    const c = await mount('/parking')
    await click(btn(c, 'ทำวันนี้: ก'))
    await click(btn(c, 'ทำวันนี้: ค'))
    expect(noteTexts(c)).toEqual(['ข'])
    const today = savedTasks()
      .filter((t) => t.date === TODAY)
      .sort((a, b) => a.order - b.order)
    expect(today.map((t) => t.title)).toEqual(['งานเดิม', 'ก', 'ค'])
  })

  it('โน้ตสุดท้ายถูกจัดการแล้ว -> กลับเป็นสถานะว่าง', async () => {
    seedNotes(note('เดียว'))
    const c = await mount('/parking')
    await click(btn(c, 'ทำวันนี้: เดียว'))
    expect(c.textContent).toContain('ยังไม่มีอะไรในที่พักความคิด')
  })

  it('งานที่แปลงมาโผล่ที่หน้าวันนี้ (ทั้งในรายการและการ์ดทำอยู่ตอนนี้)', async () => {
    seedNotes(note('ซื้อของเข้าบ้าน'))
    const c = await mount('/parking')
    await click(btn(c, 'ทำวันนี้: ซื้อของเข้าบ้าน'))
    await click(c.querySelector('a[aria-label="ทำวันนี้ กลับหน้าแรก"]'))
    expect(window.location.pathname).toBe('/')
    expect(taskTitles(c)).toEqual(['ซื้อของเข้าบ้าน'])
    expect(c.querySelector('section[aria-label="ทำอยู่ตอนนี้"]').textContent).toContain(
      'ซื้อของเข้าบ้าน',
    )
    expect(c.querySelector('a[href="/parking"]:not([aria-label])').textContent).not.toMatch(/\d/) // ที่พักว่างแล้ว ไม่มีตัวเลข
  })

  it('ทั้งสายงาน: จดจากช่องล่างจอ -> ไปที่พักความคิด -> ทำวันนี้ -> เห็นในหน้าแรก', async () => {
    const c = await mount('/')
    await type(c.querySelector('input[placeholder^="มีอะไร"]'), 'ตอบอีเมลฝ่ายบัญชี')
    await click(c.querySelector('button[aria-label="จดไว้"]'))
    await click(byText(c, 'ดู'))
    expect(window.location.pathname).toBe('/parking')
    await click(btn(c, 'ทำวันนี้: ตอบอีเมลฝ่ายบัญชี'))
    await click(c.querySelector('a[aria-label="ทำวันนี้ กลับหน้าแรก"]'))
    expect(taskTitles(c)).toEqual(['ตอบอีเมลฝ่ายบัญชี'])
  })

  it('ช่องจดเร็วจำกัด 200 ตัวอักษร เท่ากับชื่องาน (แปลงเป็นงานแล้วไม่ขาด)', async () => {
    const c = await mount('/')
    expect(c.querySelector('input[placeholder^="มีอะไร"]').maxLength).toBe(200)
  })
})
