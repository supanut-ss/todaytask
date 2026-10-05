import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { makeManifest, manifest } from '../pwa-manifest.js'

const root = resolve(import.meta.dirname, '..')
const publicFile = (p) => resolve(root, 'public', p.replace(/^\//, ''))

/** อ่านขนาดภาพจากหัวไฟล์ PNG (IHDR) */
function pngSize(file) {
  const buf = readFileSync(file)
  expect(buf.subarray(1, 4).toString()).toBe('PNG')
  return `${buf.readUInt32BE(16)}x${buf.readUInt32BE(20)}`
}

describe('manifest ของ PWA', () => {
  it('มีค่าที่เบราว์เซอร์ต้องการเพื่อให้ติดตั้งได้', () => {
    expect(manifest).toMatchObject({
      name: 'ทำวันนี้',
      short_name: 'ทำวันนี้',
      lang: 'th',
      start_url: '/',
      scope: '/',
      display: 'standalone',
    })
    expect(manifest.background_color).toMatch(/^#[0-9A-F]{6}$/i)
    expect(manifest.theme_color).toMatch(/^#[0-9A-F]{6}$/i)
    expect(manifest.short_name.length).toBeLessThanOrEqual(12) // ใต้ไอคอนแสดงได้ไม่ยาว
  })

  it('ไอคอนทุกอันมีไฟล์จริงและขนาดตรงกับที่ประกาศ', () => {
    for (const icon of manifest.icons) {
      const file = publicFile(icon.src)
      expect(existsSync(file), icon.src).toBe(true)
      expect(pngSize(file), icon.src).toBe(icon.sizes)
    }
  })

  it('มีไอคอน 192 และ 512 แบบ any และ 512 แบบ maskable', () => {
    const has = (sizes, purpose) =>
      manifest.icons.some((i) => i.sizes === sizes && i.purpose === purpose)
    expect(has('192x192', 'any')).toBe(true)
    expect(has('512x512', 'any')).toBe(true)
    expect(has('512x512', 'maskable')).toBe(true)
  })

  it('ไอคอนของ iOS และ favicon มีไฟล์ ขนาดถูก', () => {
    expect(pngSize(publicFile('apple-touch-icon.png'))).toBe('180x180')
    expect(pngSize(publicFile('favicon-32.png'))).toBe('32x32')
    expect(existsSync(publicFile('favicon.ico'))).toBe(true)
  })
})

describe('index.html', () => {
  const html = readFileSync(resolve(root, 'index.html'), 'utf8')

  it('มี meta สำหรับติดตั้งและ safe area', () => {
    expect(html).toContain('viewport-fit=cover')
    expect(html).toContain('name="apple-mobile-web-app-capable"')
    expect(html).toContain('name="apple-mobile-web-app-title" content="ทำวันนี้"')
    expect(html).toContain('rel="apple-touch-icon"')
    expect(html).toContain('name="theme-color"')
    expect(html).toContain('<html lang="th">')
  })
})

describe('web.config (IIS)', () => {
  const config = readFileSync(resolve(root, 'public/web.config'), 'utf8')

  it('ตอบ manifest เป็นชนิดที่ถูก และมีกฎให้ทุกเส้นทางตกมาที่ index.html', () => {
    expect(config).toContain('fileExtension=".webmanifest" mimeType="application/manifest+json"')
    expect(config).toContain('url="/todaytask/index.html"')
  })

  it('ห้ามแคช sw.js, index.html และ manifest (ไม่งั้นอัปเดตเวอร์ชันไม่ขึ้น)', () => {
    for (const file of ['sw.js', 'index.html', 'manifest.webmanifest']) {
      const block = new RegExp(
        `<location path="${file.replace('.', '\\.')}">[\\s\\S]*?</location>`,
      ).exec(config)
      expect(block, file).not.toBeNull()
      expect(block[0]).toContain('cacheControlMode="DisableCache"')
    }
  })
})

describe('manifest เมื่อแอปอยู่ใต้ path ย่อย (/todaytask/)', () => {
  const sub = makeManifest('/todaytask/')

  it('id / start_url / scope ชี้ที่ path ย่อย', () => {
    expect(sub).toMatchObject({ id: '/todaytask/', start_url: '/todaytask/', scope: '/todaytask/' })
  })

  it('ไอคอนขึ้นต้นด้วย path ย่อย และตรงกับไฟล์ใน public/icons', () => {
    for (const icon of sub.icons) {
      expect(icon.src.startsWith('/todaytask/icons/'), icon.src).toBe(true)
      expect(existsSync(publicFile(icon.src.replace('/todaytask/', ''))), icon.src).toBe(true)
    }
  })

  it('ค่าเริ่มต้น (root) ไม่เปลี่ยน', () => {
    expect(manifest.start_url).toBe('/')
    expect(manifest.icons[0].src).toBe('/icons/icon-192.png')
  })
})
