import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { DIST_ROOT, launch, newMobileContext, startServer, sampleData } from './helpers.mjs'

/* ตรวจว่า Content-Security-Policy ที่เตรียมไว้ในคอมเมนต์ของ web.config "ใช้ได้จริง":
   เปิดแอปด้วย CSP นี้แล้วฟีเจอร์ทุกอย่างยังทำงาน และไม่มีการถูกบล็อก
   (รวมกรณีควบคุม: ถ้า hash ผิด สคริปต์ธีมต้องถูกบล็อก เพื่อพิสูจน์ว่าเทสต์นี้จับของจริงได้) */

const config = readFileSync(new URL('../public/web.config', import.meta.url), 'utf8')
const CSP = /<add name="Content-Security-Policy" value="([^"]+)"/.exec(config)[1]

let browser
beforeAll(async () => {
  browser = await launch()
})
afterAll(() => browser?.close())

async function openWithCsp(csp, { settings } = {}) {
  const server = await startServer({ dir: DIST_ROOT, headers: { 'Content-Security-Policy': csp } })
  const ctx = await newMobileContext(browser, {
    seed: sampleData('2026-10-04'),
    settings,
    acceptDownloads: true,
  })
  const page = await ctx.newPage()
  const violations = []
  page.on(
    'console',
    (m) =>
      /Content Security Policy|Refused to/.test(m.text()) &&
      violations.push(m.text().slice(0, 160)),
  )
  page.on('pageerror', (e) => violations.push(String(e)))
  await page.goto(server.url)
  await page.waitForLoadState('networkidle')
  return { page, ctx, server, violations }
}

describe('Content-Security-Policy ที่เตรียมไว้', () => {
  it('มีนโยบายครบ และไม่เปิดช่อง (ไม่มี unsafe-eval / ไม่ยอมสคริปต์จากภายนอก)', () => {
    expect(CSP).toContain("default-src 'self'")
    expect(CSP).toContain("frame-ancestors 'none'")
    expect(CSP).not.toContain('unsafe-eval')
    expect(CSP).not.toMatch(/script-src[^;]*'unsafe-inline'/)
    expect(CSP).not.toMatch(/https?:\/\//)
  })

  it('เปิดแอปด้วย CSP นี้: ไม่มีการถูกบล็อก ธีมจากสคริปต์ inline ทำงาน และฟีเจอร์หลักใช้ได้ครบ', async () => {
    const { page, ctx, server, violations } = await openWithCsp(CSP, {
      settings: { theme: 'dark', accent: 'mint' },
    })

    // สคริปต์ inline ที่ใส่ธีมก่อนวาดหน้าจอ ผ่านเพราะ hash ตรง
    expect(await page.evaluate(() => document.documentElement.dataset.theme)).toBe('dark')
    // ฟอนต์ (font-src), สไตล์ inline ของ React (style-src), รูป (img-src)
    const fonts = await page.evaluate(async () => {
      await document.fonts.load('600 16px "IBM Plex Sans Thai"', 'ทำวันนี้')
      return [...document.fonts].some((f) => f.status === 'loaded')
    })
    expect(fonts).toBe(true)
    expect(
      await page.evaluate(() =>
        [...document.images].every((i) => i.complete && i.naturalWidth > 0),
      ),
    ).toBe(true)
    // service worker (worker-src) + manifest (manifest-src)
    await page.evaluate(() => navigator.serviceWorker.ready)
    expect(
      await page.evaluate(
        async () => (await fetch(document.querySelector('link[rel=manifest]').href)).status,
      ),
    ).toBe(200)
    // ใช้งานจริง: เพิ่มงาน, จดโน้ต, ดาวน์โหลดไฟล์สำรอง (blob:)
    await page.getByRole('button', { name: 'เพิ่มงานวันนี้' }).click()
    await page.getByLabel('เพิ่มงานวันนี้', { exact: true }).fill('งานภายใต้ CSP')
    await page.keyboard.press('Enter')
    expect(await page.locator('body').innerText()).toContain('งานภายใต้ CSP')
    await page.goto(server.url + '/settings')
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'สำรองข้อมูล' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^todaytask-backup-/)

    expect(violations).toEqual([])
    await ctx.close()
    await server.close()
  })

  it('กรณีควบคุม: hash ผิด -> สคริปต์ธีมถูกบล็อกและรายงานการละเมิด (พิสูจน์ว่าเทสต์ข้างบนจับของจริง)', async () => {
    const tampered = CSP.replace(
      /'sha256-[^']+'/,
      "'sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='",
    )
    const { ctx, server, violations } = await openWithCsp(tampered, {
      settings: { theme: 'dark', accent: 'mint' },
    })
    expect(violations.some((v) => /script/i.test(v))).toBe(true)
    await ctx.close()
    await server.close()
  })
})
