// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { initInstall, resetInstallForTests } from './lib/install.js'
import { byText, cleanup, click, mount } from './test-utils.jsx'

const installEvent = (outcome = 'accepted') => {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}
const fireInstallable = async (event = installEvent()) => {
  await act(async () => window.dispatchEvent(event))
  return event
}
const setUA = (ua) =>
  Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const originalUA = navigator.userAgent
const originalMatchMedia = window.matchMedia

beforeAll(() => initInstall())

describe('PWA ในหน้าจอ (เฟส 5)', () => {
  beforeEach(() => {
    window.localStorage.clear()
    window.matchMedia = undefined
  })
  afterEach(async () => {
    await cleanup()
    window.matchMedia = originalMatchMedia // คืนก่อน reset ไม่งั้นสถานะ "ติดตั้งแล้ว" ค้างข้ามเทสต์
    resetInstallForTests()
    delete globalThis.__pwa
    delete globalThis.__pwaUpdates
    setUA(originalUA)
    Object.defineProperty(navigator, 'storage', { value: undefined, configurable: true })
  })

  describe('แบนเนอร์อัปเดตเวอร์ชัน', () => {
    it('มีเวอร์ชันใหม่ -> ขึ้นแบนเนอร์ กด "อัปเดต" แล้วสั่งเปลี่ยนเวอร์ชัน', async () => {
      globalThis.__pwa = { needRefresh: true }
      const c = await mount('/')
      expect(c.textContent).toContain('มีเวอร์ชันใหม่ แตะเพื่ออัปเดต')
      await click(byText(c, 'อัปเดต'))
      expect(globalThis.__pwaUpdates).toBe(1)
    })

    it('"ไว้ก่อน" ซ่อนแบนเนอร์ โดยไม่อัปเดต', async () => {
      globalThis.__pwa = { needRefresh: true }
      const c = await mount('/')
      await click(byText(c, 'ไว้ก่อน'))
      expect(c.textContent).not.toContain('มีเวอร์ชันใหม่')
      expect(globalThis.__pwaUpdates).toBeUndefined()
    })

    it('ไม่มีเวอร์ชันใหม่ -> ไม่มีแบนเนอร์', async () => {
      const c = await mount('/')
      expect(c.textContent).not.toContain('มีเวอร์ชันใหม่')
    })
  })

  describe('แจ้งว่าใช้ออฟไลน์ได้', () => {
    it('เก็บไฟล์ครบแล้ว -> ข้อความล่างจอ', async () => {
      globalThis.__pwa = { offlineReady: true }
      const c = await mount('/')
      expect(c.textContent).toContain('ใช้ตอนไม่มีเน็ตได้แล้ว')
    })

    it('ปกติไม่แจ้ง', async () => {
      const c = await mount('/')
      expect(c.textContent).not.toContain('ใช้ตอนไม่มีเน็ตได้แล้ว')
    })
  })

  describe('แบนเนอร์ชวนติดตั้ง', () => {
    it('ยังไม่มีอีเวนต์ติดตั้ง -> ไม่ขึ้น', async () => {
      const c = await mount('/')
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
    })

    it('เบราว์เซอร์ส่งอีเวนต์ -> ขึ้นแบนเนอร์ กด "ติดตั้ง" แล้วเรียกกล่องของเบราว์เซอร์ และแบนเนอร์หาย', async () => {
      const c = await mount('/')
      const event = await fireInstallable()
      expect(c.textContent).toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
      await click(byText(c, 'ติดตั้ง'))
      expect(event.prompt).toHaveBeenCalledTimes(1)
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
    })

    it('"ไม่ใช่ตอนนี้" ปิดแบนเนอร์ และจำไว้แม้เปิดแอปใหม่', async () => {
      let c = await mount('/')
      await fireInstallable()
      await click(byText(c, 'ไม่ใช่ตอนนี้'))
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
      expect(JSON.parse(window.localStorage.getItem('tw:v1:ui')).installDismissed).toBe(true)

      await cleanup()
      resetInstallForTests()
      c = await mount('/')
      await fireInstallable()
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
    })

    it('ถ้ามีเวอร์ชันใหม่ด้วย แสดงแบนเนอร์อัปเดตก่อน (ทีละอัน)', async () => {
      globalThis.__pwa = { needRefresh: true }
      const c = await mount('/')
      await fireInstallable()
      expect(c.textContent).toContain('มีเวอร์ชันใหม่')
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
    })

    it('เปิดจากแอปที่ติดตั้งแล้ว -> ไม่ชวนติดตั้ง', async () => {
      window.matchMedia = (q) => ({ matches: q.includes('standalone') })
      resetInstallForTests()
      const c = await mount('/')
      await fireInstallable()
      expect(c.textContent).not.toContain('ติดตั้งแอปไว้ที่หน้าจอหลัก')
    })
  })

  describe('การ์ดติดตั้งในหน้าตั้งค่า', () => {
    const card = (c) => c.querySelector('section[aria-label="ติดตั้งแอป"]')

    it('เบราว์เซอร์ทั่วไปที่ไม่มีปุ่มติดตั้ง: บอกให้ใช้เมนูของเบราว์เซอร์', async () => {
      const c = await mount('/settings')
      expect(card(c).textContent).toContain('ติดตั้งแอปลงหน้าจอหลัก')
      expect(card(c).textContent).toContain('ถ้าไม่เห็นปุ่มติดตั้ง')
      expect(byText(card(c), 'ติดตั้งแอป')).toBeUndefined()
    })

    it('Android/Chrome: มีปุ่ม "ติดตั้งแอป" กดแล้วเรียกกล่องของเบราว์เซอร์', async () => {
      const c = await mount('/settings')
      const event = await fireInstallable()
      expect(card(c).textContent).not.toContain('ถ้าไม่เห็นปุ่มติดตั้ง')
      await click(byText(card(c), 'ติดตั้งแอป'))
      expect(event.prompt).toHaveBeenCalledTimes(1)
    })

    it('iPhone: ให้ขั้นตอนเพิ่มไปหน้าจอโฮม และเตือนว่าข้อมูลใน Safari ไม่ตามไป', async () => {
      setUA(IPHONE)
      const c = await mount('/settings')
      expect(card(c).textContent).toContain('เพิ่มไปยังหน้าจอโฮม')
      expect(card(c).textContent).toContain('เก็บข้อมูลแยกจาก Safari')
      expect(byText(card(c), 'ติดตั้งแอป')).toBeUndefined()
    })

    it('ติดตั้งแล้ว: บอกว่าติดตั้งแล้ว ไม่มีปุ่มและไม่มีคำแนะนำ', async () => {
      window.matchMedia = (q) => ({ matches: q.includes('standalone') })
      resetInstallForTests()
      const c = await mount('/settings')
      expect(card(c).textContent).toContain('ติดตั้งแล้ว')
      expect(byText(card(c), 'ติดตั้งแอป')).toBeUndefined()
      expect(card(c).textContent).not.toContain('ถ้าไม่เห็นปุ่มติดตั้ง')
    })
  })

  describe('ที่เก็บข้อมูลถาวร ในหน้าตั้งค่า', () => {
    const setStorage = (value) =>
      Object.defineProperty(navigator, 'storage', { value, configurable: true })

    it('ได้รับแล้ว', async () => {
      setStorage({ persisted: async () => true, persist: async () => true })
      const c = await mount('/settings')
      await act(async () => {})
      expect(c.textContent).toContain('รับปากเก็บข้อมูลไว้ถาวรแล้ว')
    })

    it('ยังไม่ได้รับ', async () => {
      setStorage({ persisted: async () => false, persist: async () => false })
      const c = await mount('/settings')
      await act(async () => {})
      expect(c.textContent).toContain('ยังไม่รับปากเก็บถาวร')
    })

    it('เบราว์เซอร์ไม่รองรับ: ไม่แสดงบรรทัดนี้เลย', async () => {
      const c = await mount('/settings')
      await act(async () => {})
      expect(c.textContent).not.toContain('เก็บข้อมูลไว้ถาวร')
      expect(c.textContent).not.toContain('ยังไม่รับปากเก็บถาวร')
    })
  })
})
