// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import {
  BACKUP_FORMAT,
  backupFileName,
  buildBackup,
  clearAll,
  mergeData,
  parseBackup,
  readAll,
  replaceData,
  sanitizeTask,
  writeAll,
} from './backup.js'
import * as storage from './storage.js'

const task = (over = {}) => ({
  id: 't_1',
  title: 'งาน',
  status: 'todo',
  date: '2026-10-04',
  order: 0,
  createdAt: '2026-10-04T01:00:00.000Z',
  doneAt: null,
  ...over,
})
const note = (over = {}) => ({
  id: 'p_1',
  text: 'โน้ต',
  createdAt: '2026-10-04T01:00:00.000Z',
  ...over,
})
const file = (obj) => JSON.stringify(obj)
const valid = (data = {}) => ({
  app: 'todaytask',
  format: 1,
  exportedAt: '2026-10-04T05:00:00.000Z',
  data: {
    tasks: [task()],
    parking: [note()],
    settings: { theme: 'dark', accent: 'mint' },
    current: null,
    ...data,
  },
})

describe('backup: สร้างไฟล์', () => {
  it('ใส่ชื่อแอป เวอร์ชัน เวลา และข้อมูลครบ', () => {
    const b = buildBackup({ tasks: [task()], parking: [] }, new Date('2026-10-04T05:00:00Z'))
    expect(b).toMatchObject({
      app: 'todaytask',
      format: BACKUP_FORMAT,
      exportedAt: '2026-10-04T05:00:00.000Z',
    })
    expect(b.data).toEqual({ tasks: [task()], parking: [], settings: null, current: null })
  })

  it('ชื่อไฟล์มีวันที่ท้องถิ่น', () => {
    expect(backupFileName(new Date(2026, 9, 4, 23, 59))).toBe('todaytask-backup-2026-10-04.json')
  })
})

describe('backup: อ่านไฟล์', () => {
  it('ไฟล์ปกติ: คืนข้อมูลและจำนวน', () => {
    const r = parseBackup(file(valid()))
    expect(r.ok).toBe(true)
    expect(r.counts).toEqual({ tasks: 1, parking: 1 })
    expect(r.skipped).toBe(0)
    expect(r.exportedAt).toBe('2026-10-04T05:00:00.000Z')
    expect(r.data.settings).toEqual({ theme: 'dark', accent: 'mint' })
  })

  it.each([
    ['ว่างเปล่า', ''],
    ['ไม่ใช่ JSON', 'นี่ไม่ใช่ json'],
    ['ไม่ใช่ของแอปนี้', file({ app: 'other', format: 1, data: {} })],
    ['เป็น array', file([1, 2])],
    ['เป็น null', 'null'],
    ['ไม่มีเวอร์ชัน', file({ app: 'todaytask', data: {} })],
    ['ไม่มี data', file({ app: 'todaytask', format: 1 })],
    ['เวอร์ชันใหม่กว่า', file({ app: 'todaytask', format: 99, data: {} })],
  ])('ปฏิเสธไฟล์ที่ %s พร้อมข้อความอธิบาย', (_name, text) => {
    const r = parseBackup(text)
    expect(r.ok).toBe(false)
    expect(r.error.length).toBeGreaterThan(5)
  })

  it('ไฟล์ใหญ่ผิดปกติถูกปฏิเสธ', () => {
    expect(parseBackup('x'.repeat(10_000_001)).ok).toBe(false)
  })

  it('ข้ามรายการเสีย แต่เก็บรายการดีไว้ และนับจำนวนที่ข้าม', () => {
    const r = parseBackup(
      file(
        valid({
          tasks: [
            task({ id: 'ok' }),
            task({ id: '' }), // id ว่าง
            task({ id: 'x2', title: '   ' }), // ชื่อว่าง
            task({ id: 'x3', date: '2026-02-30' }), // วันที่ไม่มีจริง
            { id: 'x4' }, // ไม่ครบ
            null,
            'ข้อความ',
          ],
          parking: [note({ id: 'ok' }), note({ id: 'bad', text: '' })],
        }),
      ),
    )
    expect(r.ok).toBe(true)
    expect(r.data.tasks.map((t) => t.id)).toEqual(['ok'])
    expect(r.data.parking.map((n) => n.id)).toEqual(['ok'])
    expect(r.skipped).toBe(7)
  })

  it('ตัด id ซ้ำ (เก็บตัวแรก)', () => {
    const r = parseBackup(file(valid({ tasks: [task({ title: 'แรก' }), task({ title: 'ซ้ำ' })] })))
    expect(r.data.tasks).toHaveLength(1)
    expect(r.data.tasks[0].title).toBe('แรก')
    expect(r.skipped).toBe(1)
  })

  it('ซ่อมค่าที่ผิดเล็กน้อย: สถานะแปลก, order ไม่ใช่เลข, ไม่มีเวลา, ชื่อยาวเกิน, ฟิลด์แปลกปลอม', () => {
    const t = sanitizeTask({
      id: 't_9',
      title: ` ${'ก'.repeat(300)} `,
      status: 'weird',
      date: '2026-10-04',
      order: 'x',
      createdAt: 'ไม่ใช่เวลา',
      doneAt: '2026-10-04T01:00:00.000Z',
      evil: '<script>',
    })
    expect(t).toEqual({
      id: 't_9',
      title: 'ก'.repeat(200),
      status: 'todo', // สถานะแปลก = ยังไม่เสร็จ
      date: '2026-10-04',
      order: 0,
      createdAt: '1970-01-01T00:00:00.000Z',
      doneAt: null, // งานที่ยังไม่เสร็จไม่มีเวลาเสร็จ
    })
    expect(t).not.toHaveProperty('evil')
  })

  it('งานที่เสร็จคงเวลาเสร็จไว้', () => {
    expect(sanitizeTask(task({ status: 'done', doneAt: '2026-10-04T03:00:00.000Z' })).doneAt).toBe(
      '2026-10-04T03:00:00.000Z',
    )
  })

  it('การตั้งค่าและงานปัจจุบันถูกตรวจ; ไม่มีการตั้งค่า = null', () => {
    const r = parseBackup(
      file(
        valid({ settings: { theme: 'neon', accent: 'x' }, current: { id: 't_1', date: 'ผิด' } }),
      ),
    )
    expect(r.data.settings).toEqual({ theme: 'auto', accent: 'butter' })
    expect(r.data.current).toBeNull()
    expect(parseBackup(file(valid({ settings: undefined }))).data.settings).toBeNull()
  })

  it('ข้อมูลที่ไม่ใช่ array ถือว่าว่าง ไม่พัง', () => {
    const r = parseBackup(file(valid({ tasks: 'x', parking: { a: 1 } })))
    expect(r.ok).toBe(true)
    expect(r.counts).toEqual({ tasks: 0, parking: 0 })
  })
})

describe('backup: รวมและแทนที่', () => {
  const current = {
    tasks: [task({ id: 'a', title: 'เดิม' })],
    parking: [note({ id: 'n1', text: 'โน้ตเดิม' })],
    settings: { theme: 'light', accent: 'butter' },
    current: { id: 'a', date: '2026-10-04' },
  }
  const incoming = {
    tasks: [task({ id: 'a', title: 'จากไฟล์ (id ซ้ำ)' }), task({ id: 'b', title: 'ใหม่จากไฟล์' })],
    parking: [note({ id: 'n2', text: 'โน้ตจากไฟล์' })],
    settings: { theme: 'dark', accent: 'mint' },
    current: null,
  }

  it('รวม: ข้อมูลเดิมอยู่ครบ (id ซ้ำใช้ของเดิม) เพิ่มเฉพาะที่ยังไม่มี การตั้งค่าคงเดิม', () => {
    const m = mergeData(current, incoming)
    expect(m.tasks.map((t) => [t.id, t.title])).toEqual([
      ['a', 'เดิม'],
      ['b', 'ใหม่จากไฟล์'],
    ])
    expect(m.parking.map((n) => n.id)).toEqual(['n1', 'n2'])
    expect(m.settings).toEqual(current.settings)
    expect(m.current).toEqual(current.current)
  })

  it('รวมซ้ำสองรอบ ผลเท่าเดิม (ไม่เบิ้ล)', () => {
    const once = mergeData(current, incoming)
    expect(mergeData(once, incoming)).toEqual(once)
  })

  it('แทนที่: ใช้ตามไฟล์ทั้งหมด', () => {
    const r = replaceData(current, incoming)
    expect(r.tasks.map((t) => t.id)).toEqual(['a', 'b'])
    expect(r.tasks[0].title).toBe('จากไฟล์ (id ซ้ำ)')
    expect(r.parking.map((n) => n.id)).toEqual(['n2'])
    expect(r.settings).toEqual({ theme: 'dark', accent: 'mint' })
    expect(r.current).toBeNull()
  })

  it('แทนที่: ไฟล์ไม่มีการตั้งค่า -> คงของเดิม', () => {
    expect(replaceData(current, { ...incoming, settings: null }).settings).toEqual(current.settings)
  })
})

describe('backup: อ่าน/เขียน/ล้างใน storage', () => {
  beforeEach(() => window.localStorage.clear())

  it('writeAll แล้ว readAll ได้เหมือนเดิม และ null ลบ key ทิ้ง', () => {
    const data = {
      tasks: [task()],
      parking: [note()],
      settings: { theme: 'dark', accent: 'peach' },
      current: { id: 't_1', date: '2026-10-04' },
    }
    writeAll(data)
    expect(readAll()).toEqual(data)
    writeAll({ ...data, settings: null, current: null })
    expect(window.localStorage.getItem('tw:v1:settings')).toBeNull()
    expect(window.localStorage.getItem('tw:v1:current')).toBeNull()
    expect(readAll().tasks).toEqual([task()])
  })

  it('เลิกทำ: เขียน snapshot กลับแล้วได้สถานะเดิมแม้ key นั้นเคยไม่มี', () => {
    writeAll({ tasks: [task()], parking: [], settings: null, current: null })
    const before = readAll()
    writeAll({
      tasks: [],
      parking: [note()],
      settings: { theme: 'dark', accent: 'mint' },
      current: null,
    })
    writeAll(before)
    expect(readAll()).toEqual(before)
    expect(window.localStorage.getItem('tw:v1:settings')).toBeNull()
  })

  it('clearAll ลบข้อมูลผู้ใช้ แต่ไม่แตะค่าชั่วคราวของหน้าจอ (ui)', () => {
    writeAll({
      tasks: [task()],
      parking: [note()],
      settings: { theme: 'dark', accent: 'mint' },
      current: null,
    })
    storage.write('ui', { installDismissed: true })
    clearAll()
    expect(readAll()).toEqual({ tasks: [], parking: [], settings: null, current: null })
    expect(storage.read('ui')).toEqual({ installDismissed: true })
  })
})
