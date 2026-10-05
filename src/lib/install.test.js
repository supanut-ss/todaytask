// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

async function load() {
  vi.resetModules()
  return import('./install.js')
}

function installEvent(outcome = 'accepted') {
  const event = new Event('beforeinstallprompt', { cancelable: true })
  event.prompt = vi.fn().mockResolvedValue(undefined)
  event.userChoice = Promise.resolve({ outcome })
  return event
}

describe('install', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    window.matchMedia = undefined
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('ตรวจ iPhone / iPad / iPadOS ที่แกล้งเป็น Mac / อื่นๆ', async () => {
    const { detectIOS } = await load()
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' })).toBe(
      true,
    )
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X)' })).toBe(true)
    expect(detectIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 5 })).toBe(
      true,
    )
    expect(detectIOS({ userAgent: 'Macintosh', platform: 'MacIntel', maxTouchPoints: 0 })).toBe(
      false,
    )
    expect(detectIOS({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' })).toBe(false)
    expect(detectIOS(null)).toBe(false)
  })

  it('ตรวจโหมดแอปที่ติดตั้งแล้ว (display-mode และ navigator.standalone ของ iOS)', async () => {
    const { isStandalone } = await load()
    expect(isStandalone({ matchMedia: () => ({ matches: true }), navigator: {} })).toBe(true)
    expect(
      isStandalone({ matchMedia: () => ({ matches: false }), navigator: { standalone: true } }),
    ).toBe(true)
    expect(isStandalone({ matchMedia: () => ({ matches: false }), navigator: {} })).toBe(false)
    expect(isStandalone({ navigator: {} })).toBe(false) // ไม่มี matchMedia
    expect(isStandalone(null)).toBe(false)
  })

  it('เริ่มต้น: ยังกดติดตั้งไม่ได้ และยังไม่ได้ติดตั้ง', async () => {
    const m = await load()
    expect(m.getInstallSnapshot()).toEqual({ canPrompt: false, installed: false })
    expect(await m.promptInstall()).toBe('unavailable')
  })

  it('ได้อีเวนต์ติดตั้ง -> เก็บไว้ ไม่ให้เบราว์เซอร์โชว์เอง และแจ้งผู้ติดตาม', async () => {
    const m = await load()
    m.initInstall()
    const cb = vi.fn()
    m.subscribeInstall(cb)
    const event = installEvent()
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    expect(m.getInstallSnapshot().canPrompt).toBe(true)
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('กดติดตั้ง: เรียก prompt ครั้งเดียว คืนผลที่ผู้ใช้เลือก และปุ่มหายไป', async () => {
    const m = await load()
    m.initInstall()
    const event = installEvent('accepted')
    window.dispatchEvent(event)
    expect(await m.promptInstall()).toBe('accepted')
    expect(event.prompt).toHaveBeenCalledTimes(1)
    expect(m.getInstallSnapshot().canPrompt).toBe(false)
    expect(await m.promptInstall()).toBe('unavailable') // อีเวนต์ใช้ซ้ำไม่ได้
  })

  it('ผู้ใช้ปฏิเสธกล่องติดตั้ง -> คืน dismissed', async () => {
    const m = await load()
    m.initInstall()
    window.dispatchEvent(installEvent('dismissed'))
    expect(await m.promptInstall()).toBe('dismissed')
  })

  it('appinstalled -> ถือว่าติดตั้งแล้ว ปุ่มหาย', async () => {
    const m = await load()
    m.initInstall()
    window.dispatchEvent(installEvent())
    window.dispatchEvent(new Event('appinstalled'))
    expect(m.getInstallSnapshot()).toEqual({ canPrompt: false, installed: true })
  })

  it('เรียก initInstall ซ้ำไม่ทำให้ฟังซ้อน', async () => {
    const m = await load()
    m.initInstall()
    m.initInstall()
    const cb = vi.fn()
    m.subscribeInstall(cb)
    window.dispatchEvent(installEvent())
    expect(cb).toHaveBeenCalledTimes(1)
  })

  it('snapshot เป็นก้อนเดิมจนกว่าสถานะจะเปลี่ยน (ไม่ทำให้ React วนซ้ำ)', async () => {
    const m = await load()
    expect(m.getInstallSnapshot()).toBe(m.getInstallSnapshot())
  })
})
