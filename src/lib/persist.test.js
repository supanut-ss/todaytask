// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { isStoragePersisted, requestPersistentStorage } from './persist.js'

const setStorage = (value) =>
  Object.defineProperty(navigator, 'storage', { value, configurable: true })

describe('persist', () => {
  afterEach(() => setStorage(undefined))

  it('เบราว์เซอร์ไม่รองรับ -> null', async () => {
    setStorage(undefined)
    expect(await requestPersistentStorage()).toBeNull()
    expect(await isStoragePersisted()).toBeNull()
  })

  it('ได้รับอยู่แล้ว -> true โดยไม่ขอซ้ำ', async () => {
    const persist = vi.fn()
    setStorage({ persisted: async () => true, persist })
    expect(await requestPersistentStorage()).toBe(true)
    expect(persist).not.toHaveBeenCalled()
  })

  it('ยังไม่ได้รับ -> ขอ และคืนผลที่เบราว์เซอร์ตอบ', async () => {
    setStorage({ persisted: async () => false, persist: async () => true })
    expect(await requestPersistentStorage()).toBe(true)
    setStorage({ persisted: async () => false, persist: async () => false })
    expect(await requestPersistentStorage()).toBe(false)
  })

  it('เบราว์เซอร์โยนข้อผิดพลาด -> null ไม่ล้มทั้งแอป', async () => {
    setStorage({
      persisted: async () => {
        throw new Error('blocked')
      },
      persist: async () => true,
    })
    expect(await requestPersistentStorage()).toBeNull()
    expect(await isStoragePersisted()).toBeNull()
  })
})
