// @vitest-environment jsdom
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = resolve(import.meta.dirname, '..')
const config = readFileSync(resolve(root, 'public/web.config'), 'utf8')
const html = readFileSync(resolve(root, 'index.html'), 'utf8')

describe('web.config', () => {
  it('เป็น XML ที่ถูกต้อง (IIS จะ error 500 ทั้งเว็บถ้า XML เสีย)', () => {
    const doc = new DOMParser().parseFromString(config, 'application/xml')
    expect(doc.querySelector('parsererror')?.textContent).toBeUndefined()
    expect(doc.documentElement.tagName).toBe('configuration')
  })

  it('มี header ความปลอดภัยพื้นฐานที่เปิดใช้งานจริง (ไม่ได้อยู่ในคอมเมนต์)', () => {
    const doc = new DOMParser().parseFromString(config, 'application/xml')
    const names = [...doc.querySelectorAll('customHeaders > add')].map((n) =>
      n.getAttribute('name'),
    )
    expect(names).toEqual(
      expect.arrayContaining([
        'X-Content-Type-Options',
        'X-Frame-Options',
        'Referrer-Policy',
        'Permissions-Policy',
      ]),
    )
    expect(names).not.toContain('Content-Security-Policy') // ยังปิดไว้ตามที่ตั้งใจ
    expect(doc.querySelector('customHeaders > remove[name="X-Powered-By"]')).not.toBeNull()
  })

  it('CSP ที่เตรียมไว้ในคอมเมนต์ ผูกกับสคริปต์ใน index.html ถูกตัว (hash ตรง)', () => {
    const script = /<script>([\s\S]*?)<\/script>/.exec(html)[1]
    const hash = createHash('sha256').update(script, 'utf8').digest('base64')
    expect(config).toContain(`'sha256-${hash}'`)
  })

  it('ไม่มีสคริปต์ inline อื่นใน index.html นอกจากตัวใส่ธีม (CSP จะได้ครอบคลุม)', () => {
    const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>/g)]
    expect(inline).toHaveLength(1)
  })
})
