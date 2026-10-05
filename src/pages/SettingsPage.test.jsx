// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { today } from '../lib/date.js'
import { byText, cleanup, click, makeTask, mount, savedTasks, seedTasks } from '../test-utils.jsx'

const TODAY = today()
const root = document.documentElement
const originalMatchMedia = window.matchMedia
const originalUA = navigator.userAgent
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const setUA = (ua) =>
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })

const flush = () => act(async () => new Promise((r) => setTimeout(r, 0)))
const readBlob = (blob) =>
  new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.readAsText(blob)
  })
const note = (text, id = `p_${text}`) => ({ id, text, createdAt: new Date().toISOString() })
const seedNotes = (...notes) => window.localStorage.setItem('tw:v1:parking', JSON.stringify(notes))
const savedNotes = () => JSON.parse(window.localStorage.getItem('tw:v1:parking') ?? '[]')
const savedSettings = () => JSON.parse(window.localStorage.getItem('tw:v1:settings') ?? 'null')
const savedUi = () => JSON.parse(window.localStorage.getItem('tw:v1:ui') ?? 'null')
const pressed = (c, groupLabel) =>
  [...c.querySelectorAll(`[aria-label="${groupLabel}"] button`)].filter(
    (b) => b.getAttribute('aria-pressed') === 'true',
  )

function mockDarkPreference(initial) {
  const listeners = new Set()
  const mq = {
    matches: initial,
    addEventListener: (_t, cb) => listeners.add(cb),
    removeEventListener: (_t, cb) => listeners.delete(cb),
  }
  window.matchMedia = () => mq
  return {
    set: (value) => {
      mq.matches = value
      listeners.forEach((cb) => cb())
    },
    listenerCount: () => listeners.size,
  }
}

beforeEach(() => {
  window.localStorage.clear()
  window.matchMedia = undefined
})
afterEach(async () => {
  await cleanup()
  window.matchMedia = originalMatchMedia
  setUA(originalUA)
  delete root.dataset.theme
  delete root.dataset.accent
  delete navigator.canShare
  delete navigator.share
  vi.restoreAllMocks()
})

describe('ธีมและสีไฮไลต์ (เฟส 6)', () => {
  it('ค่าเริ่มต้น: อัตโนมัติ + เหลือง', async () => {
    const c = await mount('/settings')
    expect(pressed(c, 'เลือกธีม').map((b) => b.textContent)).toEqual(['อัตโนมัติ'])
    expect(pressed(c, 'เลือกสีไฮไลต์').map((b) => b.getAttribute('aria-label'))).toEqual([
      'สีเหลือง',
    ])
  })

  it('เลือกมืด -> ใช้ทันที จำไว้ แล้วเลือกสว่างกลับได้', async () => {
    const c = await mount('/settings')
    await click(byText(c, 'มืด'))
    expect(root.dataset.theme).toBe('dark')
    expect(savedSettings()).toEqual({ theme: 'dark', accent: 'butter' })
    expect(pressed(c, 'เลือกธีม').map((b) => b.textContent)).toEqual(['มืด'])
    await click(byText(c, 'สว่าง'))
    expect(root.dataset.theme).toBeUndefined()
    expect(savedSettings().theme).toBe('light')
  })

  it('เลือกสีไฮไลต์ -> ตั้ง data-accent และเลือกเหลืองคืนค่าเดิม', async () => {
    const c = await mount('/settings')
    await click(c.querySelector('button[aria-label="สีเขียว"]'))
    expect(root.dataset.accent).toBe('mint')
    await click(c.querySelector('button[aria-label="สีชมพู"]'))
    expect(root.dataset.accent).toBe('peach')
    expect(savedSettings().accent).toBe('peach')
    await click(c.querySelector('button[aria-label="สีเหลือง"]'))
    expect(root.dataset.accent).toBeUndefined()
  })

  it('เปิดแอปใหม่แล้วยังใช้ธีมที่เลือกไว้ (ทุกหน้า ไม่ใช่แค่หน้าตั้งค่า)', async () => {
    window.localStorage.setItem('tw:v1:settings', JSON.stringify({ theme: 'dark', accent: 'mint' }))
    await mount('/')
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.accent).toBe('mint')
  })

  it('ค่าที่เสียใน storage -> ใช้ค่าเริ่มต้น ไม่พัง', async () => {
    window.localStorage.setItem('tw:v1:settings', JSON.stringify({ theme: 'neon', accent: 7 }))
    const c = await mount('/settings')
    expect(pressed(c, 'เลือกธีม').map((b) => b.textContent)).toEqual(['อัตโนมัติ'])
    expect(root.dataset.theme).toBeUndefined()
  })

  it('อัตโนมัติ: ตามเครื่องทันทีที่สลับโหมดมืด/สว่าง และเลิกฟังเมื่อเลือกค่าตายตัว', async () => {
    const media = mockDarkPreference(false)
    const c = await mount('/settings')
    expect(root.dataset.theme).toBeUndefined()
    await act(async () => media.set(true))
    expect(root.dataset.theme).toBe('dark')
    await act(async () => media.set(false))
    expect(root.dataset.theme).toBeUndefined()

    expect(media.listenerCount()).toBe(1)
    await click(byText(c, 'สว่าง'))
    expect(media.listenerCount()).toBe(0)
    await act(async () => media.set(true))
    expect(root.dataset.theme).toBeUndefined() // เลือกสว่างไว้ ไม่ตามเครื่อง
  })
})

describe('สำรองข้อมูล (เฟส 6)', () => {
  let blobs, anchors
  beforeEach(() => {
    blobs = []
    anchors = []
    URL.createObjectURL = vi.fn((blob) => {
      blobs.push(blob)
      return 'blob:test'
    })
    URL.revokeObjectURL = vi.fn()
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      anchors.push({ download: this.download, href: this.href })
    })
  })

  it('ดาวน์โหลดไฟล์ JSON ที่มีงานและที่พักความคิดครบ ตั้งชื่อตามวันที่ และบันทึกเวลาสำรองล่าสุด', async () => {
    seedTasks([makeTask({ id: 't_a', title: 'งาน ก', date: TODAY })])
    seedNotes(note('โน้ต ข'))
    const c = await mount('/settings')
    expect(c.textContent).toContain('ยังไม่เคยสำรองข้อมูล')

    await click(byText(c, 'สำรองข้อมูล'))
    await flush()

    expect(anchors).toHaveLength(1)
    expect(anchors[0].download).toBe(`todaytask-backup-${TODAY}.json`)
    const json = JSON.parse(await readBlob(blobs[0]))
    expect(json).toMatchObject({ app: 'todaytask', format: 1 })
    expect(json.data.tasks.map((t) => t.title)).toEqual(['งาน ก'])
    expect(json.data.parking.map((n) => n.text)).toEqual(['โน้ต ข'])
    expect(c.textContent).toContain('สำรองข้อมูลแล้ว')
    expect(savedUi().lastBackupAt).toBeTruthy()
    expect(c.textContent).toContain('สำรองล่าสุด: วันนี้')
  })

  it('ไม่มีข้อมูล -> ไม่สร้างไฟล์เปล่า บอกผู้ใช้', async () => {
    const c = await mount('/settings')
    await click(byText(c, 'สำรองข้อมูล'))
    await flush()
    expect(anchors).toHaveLength(0)
    expect(c.textContent).toContain('ยังไม่มีข้อมูลให้สำรอง')
    expect(savedUi()?.lastBackupAt ?? null).toBeNull()
  })

  it('iPhone: ใช้แผงแชร์ (บันทึกลงไฟล์ได้) ไม่ใช้ดาวน์โหลดตรง', async () => {
    setUA(IPHONE)
    navigator.canShare = () => true
    navigator.share = vi.fn().mockResolvedValue(undefined)
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    const c = await mount('/settings')
    await click(byText(c, 'สำรองข้อมูล'))
    await flush()
    expect(navigator.share).toHaveBeenCalledTimes(1)
    expect(navigator.share.mock.calls[0][0].files[0].name).toBe(`todaytask-backup-${TODAY}.json`)
    expect(anchors).toHaveLength(0)
    expect(c.textContent).toContain('ส่งไฟล์สำรองแล้ว')
    expect(savedUi().lastBackupAt).toBeTruthy()
  })

  it('iPhone: ผู้ใช้ปิดแผงแชร์เอง -> ไม่นับว่าสำรองแล้ว และไม่ดาวน์โหลดซ้อน', async () => {
    setUA(IPHONE)
    navigator.canShare = () => true
    navigator.share = vi
      .fn()
      .mockRejectedValue(Object.assign(new Error('cancel'), { name: 'AbortError' }))
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    const c = await mount('/settings')
    await click(byText(c, 'สำรองข้อมูล'))
    await flush()
    expect(anchors).toHaveLength(0)
    expect(savedUi()?.lastBackupAt ?? null).toBeNull()
    expect(c.textContent).not.toContain('สำรองข้อมูลแล้ว')
  })

  it('iPhone: แชร์ล้มเหลวด้วยเหตุอื่น -> ถอยไปดาวน์โหลดตรง', async () => {
    setUA(IPHONE)
    navigator.canShare = () => true
    navigator.share = vi.fn().mockRejectedValue(new Error('boom'))
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    const c = await mount('/settings')
    await click(byText(c, 'สำรองข้อมูล'))
    await flush()
    expect(anchors).toHaveLength(1)
  })
})

describe('กู้คืนข้อมูล (เฟส 6)', () => {
  const backupFile = (data, over = {}) =>
    new File(
      [
        JSON.stringify({
          app: 'todaytask',
          format: 1,
          exportedAt: new Date().toISOString(),
          data,
          ...over,
        }),
      ],
      'backup.json',
      { type: 'application/json' },
    )
  const incomingTask = (over = {}) => ({
    id: 't_in',
    title: 'งานจากไฟล์',
    status: 'todo',
    date: TODAY,
    order: 0,
    createdAt: '2026-10-04T01:00:00.000Z',
    doneAt: null,
    ...over,
  })

  async function pick(c, file) {
    const input = c.querySelector('input[type="file"]')
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    await act(async () => input.dispatchEvent(new Event('change', { bubbles: true })))
    await flush()
  }

  it('ไฟล์ดี: แสดงสรุปจำนวน ยังไม่เปลี่ยนข้อมูลจนกว่าจะเลือกวิธี', async () => {
    seedTasks([makeTask({ id: 't_old', title: 'งานเดิม', date: TODAY })])
    const c = await mount('/settings')
    await pick(
      c,
      backupFile({
        tasks: [incomingTask(), incomingTask({ id: 't_2' })],
        parking: [note('โน้ตจากไฟล์')],
      }),
    )
    expect(c.textContent).toContain('พบข้อมูลในไฟล์สำรอง')
    expect(c.textContent).toContain('งาน 2 รายการ · ที่พักความคิด 1 รายการ')
    expect(savedTasks().map((t) => t.id)).toEqual(['t_old']) // ยังไม่แตะ
  })

  it('รวม: เพิ่มเฉพาะที่ยังไม่มี ข้อมูลเดิมอยู่ครบ แล้วเลิกทำได้', async () => {
    seedTasks([makeTask({ id: 't_old', title: 'งานเดิม', date: TODAY })])
    const c = await mount('/settings')
    await pick(
      c,
      backupFile({
        tasks: [incomingTask(), incomingTask({ id: 't_old', title: 'ซ้ำ id' })],
        parking: [note('โน้ต')],
      }),
    )
    await click(byText(c, 'รวมกับข้อมูลเดิม'))

    expect(savedTasks().map((t) => [t.id, t.title])).toEqual([
      ['t_old', 'งานเดิม'],
      ['t_in', 'งานจากไฟล์'],
    ])
    expect(savedNotes()).toHaveLength(1)
    expect(c.textContent).toContain('รวมข้อมูลแล้ว: เพิ่มงาน 1 รายการ ที่พักความคิด 1 รายการ')
    expect(c.textContent).not.toContain('พบข้อมูลในไฟล์สำรอง') // แผงปิดแล้ว

    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks().map((t) => t.id)).toEqual(['t_old'])
    expect(savedNotes()).toEqual([])
  })

  it('รวมไฟล์เดิมซ้ำ -> บอกว่าไม่มีรายการใหม่', async () => {
    seedTasks([makeTask({ id: 't_in', title: 'อยู่แล้ว', date: TODAY })])
    const c = await mount('/settings')
    await pick(c, backupFile({ tasks: [incomingTask()], parking: [] }))
    await click(byText(c, 'รวมกับข้อมูลเดิม'))
    expect(c.textContent).toContain('ไม่มีรายการใหม่ในไฟล์')
    expect(savedTasks()).toHaveLength(1)
  })

  it('แทนที่: ใช้ตามไฟล์ทั้งหมด (รวมการตั้งค่า) แล้วเลิกทำได้', async () => {
    seedTasks([makeTask({ id: 't_old', title: 'งานเดิม', date: TODAY })])
    seedNotes(note('โน้ตเดิม'))
    const c = await mount('/settings')
    await pick(
      c,
      backupFile({
        tasks: [incomingTask()],
        parking: [],
        settings: { theme: 'dark', accent: 'mint' },
      }),
    )
    await click(byText(c, 'แทนที่ข้อมูลเดิม'))
    expect(savedTasks().map((t) => t.id)).toEqual(['t_in'])
    expect(savedNotes()).toEqual([])
    expect(root.dataset.theme).toBe('dark') // ธีมจากไฟล์ใช้ทันที
    expect(root.dataset.accent).toBe('mint')

    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks().map((t) => t.id)).toEqual(['t_old'])
    expect(savedNotes().map((n) => n.text)).toEqual(['โน้ตเดิม'])
    expect(savedSettings()).toBeNull() // เดิมไม่เคยตั้งค่า จึงกลับเป็นไม่มี
    expect(root.dataset.theme).toBeUndefined()
  })

  it('บอกจำนวนรายการที่ข้ามเพราะข้อมูลไม่สมบูรณ์', async () => {
    const c = await mount('/settings')
    await pick(
      c,
      backupFile({
        tasks: [incomingTask(), { id: 'x' }, incomingTask({ id: 'y', date: '2026-02-30' })],
        parking: [],
      }),
    )
    expect(c.textContent).toContain('ข้าม 2 รายการที่ข้อมูลไม่สมบูรณ์')
  })

  it('ยกเลิก: ปิดแผงโดยไม่เปลี่ยนอะไร', async () => {
    seedTasks([makeTask({ id: 't_old', title: 'งานเดิม', date: TODAY })])
    const c = await mount('/settings')
    await pick(c, backupFile({ tasks: [incomingTask()], parking: [] }))
    await click(byText(c, 'ยกเลิก'))
    expect(c.textContent).not.toContain('พบข้อมูลในไฟล์สำรอง')
    expect(savedTasks().map((t) => t.id)).toEqual(['t_old'])
  })

  it.each([
    ['ไฟล์ที่ไม่ใช่ JSON', new File(['นี่ไม่ใช่ json'], 'x.json'), 'ไม่ใช่ไฟล์สำรอง'],
    [
      'ไฟล์ของแอปอื่น',
      new File([JSON.stringify({ app: 'other', format: 1, data: {} })], 'x.json'),
      'ไม่ใช่ไฟล์สำรองของ "ทำวันนี้"',
    ],
    [
      'ไฟล์จากเวอร์ชันใหม่กว่า',
      new File([JSON.stringify({ app: 'todaytask', format: 99, data: {} })], 'x.json'),
      'เวอร์ชันที่ใหม่กว่า',
    ],
  ])('%s: ขึ้นข้อความอธิบาย ไม่เปลี่ยนข้อมูล', async (_name, file, message) => {
    seedTasks([makeTask({ id: 't_old', title: 'งานเดิม', date: TODAY })])
    const c = await mount('/settings')
    await pick(c, file)
    expect(c.querySelector('[role="alert"]').textContent).toContain('กู้คืนไม่ได้')
    expect(c.querySelector('[role="alert"]').textContent).toContain(message)
    expect(byText(c, 'รวมกับข้อมูลเดิม')).toBeUndefined()
    expect(savedTasks().map((t) => t.id)).toEqual(['t_old'])
    await click(byText(c.querySelector('[role="alert"]'), 'ปิด'))
    expect(c.querySelector('[role="alert"]')).toBeNull()
  })

  it('สำรองแล้วกู้คืนข้อมูลชุดเดียวกัน (รอบเต็ม) ได้ข้อมูลเท่าเดิม', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    const captured = []
    const RealBlob = globalThis.Blob
    globalThis.Blob = class extends RealBlob {
      constructor(parts, opts) {
        super(parts, opts)
        captured.push(parts.join(''))
      }
    }
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const tasks = [
      makeTask({ id: 't_1', title: 'ก', date: TODAY, order: 0 }),
      makeTask({
        id: 't_2',
        title: 'ข',
        date: TODAY,
        order: 1,
        status: 'done',
        doneAt: new Date().toISOString(),
      }),
    ]
    seedTasks(tasks)
    seedNotes(note('โน้ต'))
    const c = await mount('/settings')
    await click(byText(c, 'สำรองข้อมูล'))
    await flush()
    globalThis.Blob = RealBlob

    const exported = captured.find((s) => s.includes('"todaytask"'))
    window.localStorage.clear()
    await cleanup()
    const c2 = await mount('/settings')
    await pick(c2, new File([exported], 'backup.json', { type: 'application/json' }))
    await click(byText(c2, 'แทนที่ข้อมูลเดิม'))
    expect(savedTasks()).toEqual(tasks)
    expect(savedNotes().map((n) => n.text)).toEqual(['โน้ต'])
  })
})

describe('ล้างข้อมูลทั้งหมด (เฟส 6)', () => {
  it('ต้องกดยืนยันก่อน ยกเลิกแล้วข้อมูลอยู่ครบ', async () => {
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    const c = await mount('/settings')
    await click(byText(c, 'ล้างข้อมูลทั้งหมด'))
    expect(c.querySelector('[role="alertdialog"]').textContent).toContain(
      'ล้างข้อมูลทั้งหมดในเครื่องนี้?',
    )
    expect(savedTasks()).toHaveLength(1) // แค่เปิดแผง ยังไม่ลบ
    await click(byText(c.querySelector('[role="alertdialog"]'), 'ยกเลิก'))
    expect(c.querySelector('[role="alertdialog"]')).toBeNull()
    expect(savedTasks()).toHaveLength(1)
  })

  it('ยืนยัน: ลบงาน ที่พักความคิด การตั้งค่า แต่ไม่แตะค่าชั่วคราวของหน้าจอ แล้วเลิกทำได้', async () => {
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    seedNotes(note('โน้ต'))
    window.localStorage.setItem(
      'tw:v1:settings',
      JSON.stringify({ theme: 'dark', accent: 'peach' }),
    )
    window.localStorage.setItem(
      'tw:v1:ui',
      JSON.stringify({ installDismissed: true, lastBackupAt: null }),
    )
    const c = await mount('/settings')
    await click(byText(c, 'ล้างข้อมูลทั้งหมด'))
    await click(byText(c, 'ลบทั้งหมด'))

    expect(savedTasks()).toEqual([])
    expect(savedNotes()).toEqual([])
    expect(savedSettings()).toBeNull()
    expect(savedUi().installDismissed).toBe(true)
    expect(root.dataset.theme).toBeUndefined() // กลับเป็นค่าเริ่มต้น
    expect(c.textContent).toContain('ล้างข้อมูลแล้ว')

    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks()).toHaveLength(1)
    expect(savedNotes()).toHaveLength(1)
    expect(savedSettings()).toEqual({ theme: 'dark', accent: 'peach' })
    expect(root.dataset.theme).toBe('dark')
  })

  it('"สำรองก่อน" ในแผงยืนยัน ทำงานเหมือนปุ่มสำรอง (แผงยังเปิดอยู่ให้ตัดสินใจต่อ)', async () => {
    URL.createObjectURL = vi.fn(() => 'blob:x')
    const clicks = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function () {
      clicks.push(this.download)
    })
    seedTasks([makeTask({ title: 'ก', date: TODAY })])
    const c = await mount('/settings')
    await click(byText(c, 'ล้างข้อมูลทั้งหมด'))
    await click(byText(c, 'สำรองก่อน'))
    await flush()
    expect(clicks).toEqual([`todaytask-backup-${TODAY}.json`])
    expect(c.querySelector('[role="alertdialog"]')).not.toBeNull()
    expect(savedTasks()).toHaveLength(1)
  })
})
