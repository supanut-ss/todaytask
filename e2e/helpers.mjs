import { cpSync, mkdtempSync, readFileSync, appendFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { chromium } from 'playwright-core'
import { startServer } from './server.mjs'

export const ROOT = resolve(import.meta.dirname, '..')
export const DIST = join(ROOT, 'dist')
export const AXE = join(ROOT, 'node_modules/axe-core/axe.min.js')

export async function launch() {
  return chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || undefined,
    args: process.getuid?.() === 0 ? ['--no-sandbox'] : [],
  })
}

export { startServer }

/** ข้อมูลตัวอย่าง: วันนี้ 5 งาน (2 เสร็จ) + ค้าง 2 งาน + พรุ่งนี้ 1 งาน + โน้ต 2 ใบ */
export function sampleData(baseISO) {
  const shift = (n) => {
    const [y, m, d] = baseISO.split('-').map(Number)
    const date = new Date(Date.UTC(y, m - 1, d + n))
    return date.toISOString().slice(0, 10)
  }
  const now = new Date().toISOString()
  const T = (id, title, date, order, extra = {}) => ({
    id,
    title,
    status: 'todo',
    date,
    order,
    createdAt: now,
    doneAt: null,
    ...extra,
  })
  return {
    'tw:v1:tasks': [
      T('t1', 'เขียนสรุปประชุมส่งหัวหน้า', shift(0), 0),
      T('t2', 'อ่านบทที่ 4 วิชาสถิติ', shift(0), 1),
      T('t3', 'โอนค่าเช่าห้อง', shift(0), 2),
      T('t4', 'ตอบอีเมลลูกค้า', shift(0), 3, { status: 'done', doneAt: now }),
      T('t5', 'จองคิวหมอฟัน', shift(0), 4, { status: 'done', doneAt: now }),
      T('t6', 'เตรียมสไลด์พรีเซนต์', shift(-2), 0),
      T('t7', 'ส่งรายงานค่าใช้จ่าย', shift(-1), 0),
      T('t8', 'ประชุมทีมตอน 10 โมง', shift(1), 0),
    ],
    'tw:v1:parking': [
      { id: 'p1', text: 'ต้องซื้อหมึกปริ้นท์', createdAt: now },
      { id: 'p2', text: 'ถามพี่เอเรื่องงบเดือนหน้า', createdAt: now },
    ],
  }
}

/** สร้างบริบทเบราว์เซอร์แบบมือถือ (ใส่ข้อมูลตัวอย่างครั้งเดียวต่อแท็บ) */
export async function newMobileContext(
  browser,
  { seed, settings, width = 390, height = 844, ...options } = {},
) {
  const context = await browser.newContext({
    viewport: { width, height },
    isMobile: width < 700,
    hasTouch: true,
    locale: 'th-TH',
    timezoneId: 'Asia/Bangkok',
    ...options,
  })
  if (seed || settings) {
    await context.addInitScript(
      ({ seed, settings }) => {
        if (sessionStorage.getItem('__seeded')) return
        sessionStorage.setItem('__seeded', '1')
        for (const [k, v] of Object.entries(seed ?? {})) localStorage.setItem(k, JSON.stringify(v))
        if (settings) localStorage.setItem('tw:v1:settings', JSON.stringify(settings))
      },
      { seed, settings },
    )
  }
  return context
}

/** เปิดหน้าและรอให้นิ่ง (ฟอนต์พร้อม) พร้อมเก็บข้อผิดพลาดในคอนโซล */
export async function open(context, url) {
  const page = await context.newPage()
  page.errors = []
  page.on('console', (m) => m.type() === 'error' && page.errors.push(m.text()))
  page.on('pageerror', (e) => page.errors.push(String(e)))
  await page.goto(url)
  await page.waitForLoadState('networkidle')
  await page.evaluate(() => document.fonts.ready)
  return page
}

/** ทำสำเนา dist สองชุดเพื่อจำลอง "deploy เวอร์ชันใหม่" (v2 = sw.js เปลี่ยนไปหนึ่งไบต์) */
export function makeTwoVersions() {
  const base = mkdtempSync(join(tmpdir(), 'todaytask-'))
  const v1 = join(base, 'v1')
  const v2 = join(base, 'v2')
  cpSync(DIST, v1, { recursive: true })
  cpSync(DIST, v2, { recursive: true })
  appendFileSync(join(v2, 'sw.js'), '\n// เวอร์ชัน 2\n')
  return { v1, v2 }
}

export const readDist = (name) => readFileSync(join(DIST, name), 'utf8')

export async function runAxe(page) {
  await page.addScriptTag({ path: AXE })
  return page.evaluate(async () => {
    const result = await window.axe.run(document, {
      resultTypes: ['violations'],
    })
    return result.violations.map((v) => ({
      id: v.id,
      impact: v.impact,
      help: v.help,
      nodes: v.nodes.slice(0, 4).map((n) => ({
        target: n.target.join(' '),
        summary: n.failureSummary?.split('\n').slice(0, 3).join(' | '),
      })),
    }))
  })
}
