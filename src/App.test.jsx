// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDays, today } from './lib/date.js'
import { byText, cleanup, click, mount, typeInto } from './test-utils.jsx'

describe('App (เฟส 1)', () => {
  beforeEach(() => window.localStorage.clear())

  afterEach(cleanup)

  it('หน้าแรกแสดง "วันนี้" ช่องจดเร็ว และลิงก์ตั้งค่า', async () => {
    const c = await mount('/')
    expect(c.querySelector('h1').textContent).toBe('วันนี้')
    expect(c.querySelector('input[type="text"]')).not.toBeNull()
    expect(c.querySelector('a[aria-label="ตั้งค่า"]')).not.toBeNull()
  })

  it('ปุ่มจดไว้ปิดอยู่จนกว่าจะพิมพ์ แล้วจดได้ ขึ้นข้อความ และเห็นในที่พักความคิด', async () => {
    const c = await mount('/')
    const input = c.querySelector('input[type="text"]')
    const send = c.querySelector('button[aria-label="จดไว้"]')
    expect(send.disabled).toBe(true)

    await act(async () => typeInto(input, 'ต้องซื้อหมึกปริ้นท์'))
    expect(send.disabled).toBe(false)
    await click(send)

    expect(input.value).toBe('') // ล้างช่องแล้ว
    expect(c.textContent).toContain('จดไว้แล้ว')
    expect(JSON.parse(window.localStorage.getItem('tw:v1:parking'))[0].text).toBe(
      'ต้องซื้อหมึกปริ้นท์',
    )

    await click(byText(c, 'ดู')) // ปุ่มบน snackbar พาไปที่พักความคิด
    expect(window.location.pathname).toBe('/parking')
    expect(c.querySelector('h1').textContent).toBe('ที่พักความคิด')
    expect(c.textContent).toContain('ต้องซื้อหมึกปริ้นท์')
  })

  it('ข้อความว่างหรือมีแต่ช่องว่างจดไม่ได้', async () => {
    const c = await mount('/')
    await act(async () => typeInto(c.querySelector('input[type="text"]'), '   '))
    expect(c.querySelector('button[aria-label="จดไว้"]').disabled).toBe(true)
    expect(window.localStorage.getItem('tw:v1:parking')).toBeNull()
  })

  it('ลบรายการในที่พักความคิดได้', async () => {
    window.localStorage.setItem(
      'tw:v1:parking',
      JSON.stringify([{ id: 'p_1', text: 'ถามพี่เอ', createdAt: new Date().toISOString() }]),
    )
    const c = await mount('/parking')
    expect(c.textContent).toContain('ถามพี่เอ')
    await click(c.querySelector('button[aria-label="ลบ: ถามพี่เอ"]'))
    expect(c.textContent).not.toContain('ถามพี่เอ')
    expect(c.textContent).toContain('ยังไม่มีอะไรในที่พักความคิด')
  })

  it('/day/<พรุ่งนี้> แสดง "พรุ่งนี้"', async () => {
    const c = await mount(`/day/${addDays(today(), 1)}`)
    expect(c.querySelector('h1').textContent).toBe('พรุ่งนี้')
  })

  it('/day/<วันนี้> เด้งกลับไป "/" ให้มี URL เดียว', async () => {
    const c = await mount(`/day/${today()}`)
    expect(window.location.pathname).toBe('/')
    expect(c.querySelector('h1').textContent).toBe('วันนี้')
  })

  it('วันที่ไม่ถูกต้อง และเส้นทางที่ไม่มี ขึ้นหน้าไม่พบ', async () => {
    let c = await mount('/day/2026-02-30')
    expect(c.textContent).toContain('ไม่พบหน้านี้')
    await cleanup()
    c = await mount('/ไม่มีหน้านี้')
    expect(c.textContent).toContain('ไม่พบหน้านี้')
  })

  it('ตั้งค่าบอกสถานะการเก็บข้อมูล', async () => {
    const c = await mount('/settings')
    expect(c.querySelector('h1').textContent).toBe('ตั้งค่า')
    expect(c.textContent).toContain('บันทึกลงเครื่องได้ปกติ')
  })
})
