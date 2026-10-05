// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'

// โหลดโมดูลใหม่ทุกเทสต์ เพื่อให้สถานะภายใน (cache, persistent) เริ่มสะอาด
async function load() {
  vi.resetModules()
  return import('./storage.js')
}

describe('storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.restoreAllMocks()
  })

  it('เขียนแล้วอ่านกลับได้ และใช้ key ที่มี prefix เวอร์ชัน', async () => {
    const s = await load()
    expect(s.write('tasks', [{ id: 't_1' }])).toBe(true)
    expect(s.read('tasks', [])).toEqual([{ id: 't_1' }])
    expect(window.localStorage.getItem('tw:v1:tasks')).toBe('[{"id":"t_1"}]')
  })

  it('คืน fallback เมื่อยังไม่มีข้อมูล และคืนค่าเดิม (same reference) ถ้าข้อมูลไม่เปลี่ยน', async () => {
    const s = await load()
    const empty = []
    expect(s.read('nope', empty)).toBe(empty)
    s.write('a', { x: 1 })
    expect(s.read('a')).toBe(s.read('a')) // จำเป็นต่อ useSyncExternalStore
  })

  it('คืน fallback เมื่อข้อมูลใน storage เสีย (JSON พัง)', async () => {
    window.localStorage.setItem('tw:v1:broken', '{not json')
    const s = await load()
    expect(s.read('broken', 'ใช้ค่านี้')).toBe('ใช้ค่านี้')
  })

  it('แจ้งผู้ติดตามเมื่อเขียน/ลบ และยกเลิกการติดตามได้', async () => {
    const s = await load()
    const cb = vi.fn()
    const off = s.subscribe('n', cb)
    s.write('n', 1)
    s.remove('n')
    expect(cb).toHaveBeenCalledTimes(2)
    off()
    s.write('n', 2)
    expect(cb).toHaveBeenCalledTimes(2)
  })

  it('แท็บอื่นเปลี่ยนข้อมูล -> แจ้งหน้านี้ให้อัปเดต', async () => {
    const s = await load()
    const cb = vi.fn()
    s.subscribe('parking', cb)
    window.dispatchEvent(new StorageEvent('storage', { key: 'tw:v1:parking' }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'ของแอปอื่น' }))
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('รายชื่อข้อมูลไม่รวม key ของแอปอื่น', async () => {
    window.localStorage.setItem('other', '1')
    const s = await load()
    s.write('tasks', [])
    s.write('parking', [])
    expect(s.keys().sort()).toEqual(['parking', 'tasks'])
  })

  it('เขียนไม่ได้ (พื้นที่เต็ม) -> เก็บในหน่วยความจำ แอปยังใช้ต่อได้ และแจ้งสถานะ', async () => {
    const s = await load()
    expect(s.isPersistent()).toBe(true)
    const status = vi.fn()
    s.subscribeStatus(status)
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('full', 'QuotaExceededError')
    })
    expect(s.write('tasks', [1, 2])).toBe(false)
    expect(s.read('tasks', [])).toEqual([1, 2])
    expect(s.isPersistent()).toBe(false)
    expect(status).toHaveBeenCalledTimes(1)
  })

  it('localStorage ถูกปิดตั้งแต่แรก -> ใช้หน่วยความจำและบอกว่าไม่ถาวร', async () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const s = await load()
    expect(s.isPersistent()).toBe(false)
    s.write('k', 'v')
    expect(s.read('k')).toBe('v')
  })
})
