// @vitest-environment jsdom
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { applyTheme, resolveTheme, sanitizeSettings } from './theme.js'

const root = document.documentElement
const setDarkPreference = (dark) => {
  window.matchMedia = () => ({ matches: dark, addEventListener() {}, removeEventListener() {} })
}

describe('theme', () => {
  const originalMatchMedia = window.matchMedia
  beforeEach(() => {
    document.head.innerHTML = '<meta name="theme-color" content="#F8F7FD">'
    delete root.dataset.theme
    delete root.dataset.accent
    window.localStorage.clear()
  })
  afterEach(() => {
    window.matchMedia = originalMatchMedia
  })

  it('ค่าที่ผิดรูปแบบกลับเป็นค่าเริ่มต้น', () => {
    expect(sanitizeSettings(null)).toEqual({ theme: 'auto', accent: 'butter' })
    expect(sanitizeSettings({ theme: 'neon', accent: 'red' })).toEqual({
      theme: 'auto',
      accent: 'butter',
    })
    expect(sanitizeSettings({ theme: 'dark', accent: 'mint', extra: 1 })).toEqual({
      theme: 'dark',
      accent: 'mint',
    })
    expect(sanitizeSettings('ข้อความ')).toEqual({ theme: 'auto', accent: 'butter' })
  })

  it('auto แปลงตามเครื่อง ส่วน light/dark ไม่สนเครื่อง', () => {
    expect(resolveTheme('auto', true)).toBe('dark')
    expect(resolveTheme('auto', false)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
    expect(resolveTheme('light', true)).toBe('light')
  })

  it('applyTheme ตั้งและล้างแอตทริบิวต์บน <html>', () => {
    setDarkPreference(false)
    applyTheme({ theme: 'dark', accent: 'mint' })
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.accent).toBe('mint')
    applyTheme({ theme: 'light', accent: 'butter' })
    expect(root.dataset.theme).toBeUndefined()
    expect(root.dataset.accent).toBeUndefined()
  })

  it('auto: ตามโหมดมืดของเครื่อง', () => {
    setDarkPreference(true)
    applyTheme({ theme: 'auto', accent: 'peach' })
    expect(root.dataset.theme).toBe('dark')
    expect(root.dataset.accent).toBe('peach')
    setDarkPreference(false)
    applyTheme({ theme: 'auto', accent: 'peach' })
    expect(root.dataset.theme).toBeUndefined()
  })

  it('เครื่องที่ไม่มี matchMedia ก็ไม่พัง (ใช้โหมดสว่าง)', () => {
    window.matchMedia = undefined
    expect(() => applyTheme({ theme: 'auto', accent: 'butter' })).not.toThrow()
    expect(root.dataset.theme).toBeUndefined()
  })

  describe('สคริปต์ใน index.html (ใส่ธีมก่อนวาดหน้าจอ)', () => {
    const html = readFileSync(resolve(import.meta.dirname, '../../index.html'), 'utf8')
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1]
    const run = () => new Function(script)()

    it('มีสคริปต์นี้อยู่จริง และอยู่ก่อนโมดูลหลัก', () => {
      expect(html.indexOf('<script>')).toBeGreaterThan(-1)
      expect(html.indexOf('<script>')).toBeLessThan(html.indexOf('type="module"'))
    })

    it('ผู้ใช้เลือกมืด -> ตั้ง data-theme และสีแถบสถานะ ไม่ว่าเครื่องจะเป็นอะไร', () => {
      setDarkPreference(false)
      window.localStorage.setItem(
        'tw:v1:settings',
        JSON.stringify({ theme: 'dark', accent: 'mint' }),
      )
      run()
      expect(root.dataset.theme).toBe('dark')
      expect(root.dataset.accent).toBe('mint')
      expect(document.querySelector('meta[name="theme-color"]').content).toBe('#17152B')
    })

    it('ผู้ใช้เลือกสว่าง -> ไม่เป็นมืด แม้เครื่องเป็นโหมดมืด', () => {
      setDarkPreference(true)
      window.localStorage.setItem(
        'tw:v1:settings',
        JSON.stringify({ theme: 'light', accent: 'butter' }),
      )
      run()
      expect(root.dataset.theme).toBeUndefined()
      expect(root.dataset.accent).toBeUndefined()
    })

    it('ยังไม่เคยตั้งค่า (auto) -> ตามเครื่อง', () => {
      setDarkPreference(true)
      run()
      expect(root.dataset.theme).toBe('dark')
      delete root.dataset.theme
      setDarkPreference(false)
      run()
      expect(root.dataset.theme).toBeUndefined()
    })

    it('ข้อมูลใน storage เสีย -> ไม่โยนข้อผิดพลาด', () => {
      window.localStorage.setItem('tw:v1:settings', '{พัง')
      expect(run).not.toThrow()
    })

    it('ค่าสีที่ไม่รู้จักถูกเมิน', () => {
      window.localStorage.setItem('tw:v1:settings', JSON.stringify({ accent: '<script>' }))
      run()
      expect(root.dataset.accent).toBeUndefined()
    })
  })
})
