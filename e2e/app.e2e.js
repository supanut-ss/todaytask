import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  launch,
  makeTwoVersions,
  newMobileContext,
  open,
  runAxe,
  sampleData,
  startServer,
  DIST,
} from './helpers.mjs'

/* ทดสอบแอปที่ build แล้ว (dist) ในเบราว์เซอร์จริง
   วันที่ที่ใช้ในเทสต์คิดจากนาฬิกาของเบราว์เซอร์ (ตั้งเขตเวลา Asia/Bangkok) ไม่ผูกกับวันที่จริงของเครื่อง */

let browser
let server

beforeAll(async () => {
  server = await startServer({ dir: DIST })
  browser = await launch()
})
afterAll(async () => {
  await browser?.close()
  await server?.close()
})

const bangkokToday = () => new Date(Date.now() + 7 * 3600_000).toISOString().slice(0, 10)
const text = (page, selector = 'body') => page.locator(selector).innerText()
const stored = (page, key) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k)), `tw:v1:${key}`)

describe('ใช้งานหลัก', () => {
  it('เปิดครั้งแรก: ไม่มี error ฟอนต์ไทยโหลดจริง และเพิ่ม/ติ๊ก/จดโน้ตได้ ข้อมูลอยู่หลังรีเฟรช', async () => {
    const ctx = await newMobileContext(browser)
    const page = await open(ctx, server.url)

    expect(await text(page, 'h1')).toBe('วันนี้')
    expect(await text(page)).toContain('ยังไม่มีงานของวันนี้')
    // ฟอนต์ที่ใช้จริงคือ IBM Plex Sans Thai (โฮสต์เอง ไม่ใช่ฟอนต์สำรองของเครื่อง)
    const fonts = await page.evaluate(async () => {
      await document.fonts.load('600 16px "IBM Plex Sans Thai"', 'ทำวันนี้')
      return [...document.fonts].filter((f) => f.status === 'loaded').map((f) => f.family)
    })
    expect(fonts.some((f) => f.includes('IBM Plex Sans Thai'))).toBe(true)

    await page.getByRole('button', { name: 'เพิ่มงานแรก' }).click()
    await page.getByLabel('เพิ่มงานวันนี้').fill('เขียนสรุปประชุม')
    await page.keyboard.press('Enter')
    await page.getByLabel('เพิ่มงานวันนี้').fill('โอนค่าเช่าห้อง')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'ปิด', exact: true }).click()

    expect(await text(page)).toContain('เสร็จ 0 จาก 2')
    await page.getByRole('button', { name: 'เสร็จแล้ว', exact: true }).click() // จากการ์ดทำอยู่ตอนนี้
    expect(await text(page)).toContain('เสร็จ 1 จาก 2')
    expect(await text(page, 'section[aria-label="ทำอยู่ตอนนี้"]')).toContain('โอนค่าเช่าห้อง')

    await page.getByRole('textbox', { name: 'จดสิ่งที่แทรกเข้ามา' }).fill('ซื้อหมึกปริ้นท์')
    await page.keyboard.press('Enter')
    expect(await text(page)).toContain('จดไว้แล้ว')

    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await text(page)).toContain('เสร็จ 1 จาก 2')
    expect((await stored(page, 'parking')).map((n) => n.text)).toEqual(['ซื้อหมึกปริ้นท์'])
    expect(page.errors).toEqual([])
    await ctx.close()
  })

  it('ทุกหน้าไม่ล้นแนวนอน ที่ความกว้าง 320 / 390 / 768 / 1280', async () => {
    for (const width of [320, 390, 768, 1280]) {
      const ctx = await newMobileContext(browser, {
        seed: sampleData(bangkokToday()),
        width,
        height: 800,
      })
      const page = await open(ctx, server.url)
      for (const path of [
        '/',
        '/parking',
        '/settings',
        `/day/${bangkokToday()}`,
        '/ไม่มีหน้านี้',
      ]) {
        await page.goto(server.url + path)
        await page.waitForLoadState('networkidle')
        const overflow = await page.evaluate(() => {
          const el = document.scrollingElement
          return el.scrollWidth - el.clientWidth
        })
        expect(overflow, `${path} @${width}px ล้น ${overflow}px`).toBeLessThanOrEqual(0)
      }
      await ctx.close()
    }
  })

  it('ชื่องานยาว 200 ตัวอักษรไม่เว้นวรรค: ไม่ดันหน้าจอล้น และแถวยังกดได้', async () => {
    const long = 'ก'.repeat(200)
    const seed = sampleData(bangkokToday())
    seed['tw:v1:tasks'][0].title = long
    seed['tw:v1:parking'][0].text = long
    const ctx = await newMobileContext(browser, { seed, width: 320, height: 700 })
    const page = await open(ctx, server.url)
    for (const path of ['/', '/parking']) {
      await page.goto(server.url + path)
      await page.waitForLoadState('networkidle')
      const overflow = await page.evaluate(
        () => document.scrollingElement.scrollWidth - document.scrollingElement.clientWidth,
      )
      expect(overflow, path).toBeLessThanOrEqual(0)
      const wide = await page.evaluate(
        () =>
          [...document.querySelectorAll('main *')].filter(
            (el) => el.getBoundingClientRect().right > window.innerWidth + 1,
          ).length,
      )
      expect(wide, `${path}: มีองค์ประกอบล้นขอบขวา`).toBe(0)
    }
    await ctx.close()
  })

  it('ใช้คีย์บอร์ดล้วนได้: Tab ถึงปุ่มทุกตัว มีวงโฟกัสที่เห็นชัด และเพิ่มงานด้วย Enter', async () => {
    const ctx = await newMobileContext(browser, {
      seed: sampleData(bangkokToday()),
      width: 1024,
      height: 800,
      isMobile: false,
    })
    const page = await open(ctx, server.url)
    const seen = []
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab')
      seen.push(
        await page.evaluate(() => {
          const el = document.activeElement
          const s = getComputedStyle(el)
          return {
            tag: el.tagName,
            name:
              el.getAttribute('aria-label') ||
              el.textContent.trim().slice(0, 20) ||
              el.getAttribute('type'),
            outline: s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) >= 2,
          }
        }),
      )
    }
    const interactive = seen.filter((s) => ['A', 'BUTTON', 'INPUT'].includes(s.tag))
    expect(interactive.length).toBeGreaterThan(15)
    const noRing = interactive.filter((s) => !s.outline)
    expect(noRing, `ไม่มีวงโฟกัส: ${JSON.stringify(noRing)}`).toEqual([])

    await page.getByRole('button', { name: 'เพิ่มงานวันนี้' }).focus()
    await page.keyboard.press('Enter')
    await page.keyboard.type('งานจากคีย์บอร์ด')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Escape')
    expect((await stored(page, 'tasks')).some((t) => t.title === 'งานจากคีย์บอร์ด')).toBe(true)
    await ctx.close()
  })
})

describe('ออฟไลน์และ PWA', () => {
  it('service worker ทำงาน เก็บไฟล์ครบ และ manifest ติดตั้งได้ (ไม่มี installability error)', async () => {
    const ctx = await newMobileContext(browser)
    const page = await open(ctx, server.url)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload() // ให้หน้าถูกควบคุมโดย service worker
    await page.waitForLoadState('networkidle')
    const info = await page.evaluate(async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      const names = await caches.keys()
      const cache = await caches.open(names.find((n) => n.includes('precache')))
      const cached = (await cache.keys()).map((r) => new URL(r.url).pathname.replace(/^\//, ''))
      // รายการที่ sw.js สั่งให้เก็บไว้ (precache manifest)
      const sw = await (await fetch('/sw.js')).text()
      const expected = [...new Set([...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]))]
      return {
        active: reg.active?.state,
        controlled: Boolean(navigator.serviceWorker.controller),
        cached,
        expected,
      }
    })
    expect(info).toMatchObject({ active: 'activated', controlled: true })
    // ไฟล์ทุกอันที่ sw.js สั่งเก็บ ต้องอยู่ในแคชจริงครบ (ไม่ผูกกับตัวเลขตายตัว)
    const missing = info.expected.filter(
      (url) => !info.cached.includes(url === 'index.html' ? 'index.html' : url),
    )
    expect(missing, `ขาดในแคช: ${missing}`).toEqual([])
    expect(info.expected.length).toBeGreaterThanOrEqual(15)
    // และมีของจำเป็นสำหรับออฟไลน์: หน้าแอป ฟอนต์ไทย ไอคอน
    expect(info.expected).toEqual(expect.arrayContaining(['index.html', 'manifest.webmanifest']))
    expect(info.expected.some((u) => /thai-400-normal.*\.woff2$/.test(u))).toBe(true)
    expect(info.expected.some((u) => /\.js$/.test(u))).toBe(true)

    const cdp = await ctx.newCDPSession(page)
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors')
    // Playwright เปิดแท็บแบบไม่ระบุตัวตน (incognito) ซึ่งติดตั้งไม่ได้อยู่แล้ว จึงตัดข้อนี้ออก เหลือเฉพาะปัญหาที่เกิดจากแอปเอง
    expect(installabilityErrors.filter((e) => e.errorId !== 'in-incognito')).toEqual([])

    const manifest = await page.evaluate(async () => {
      const href = document.querySelector('link[rel="manifest"]').href
      const res = await fetch(href)
      return { type: res.headers.get('content-type'), json: await res.json() }
    })
    expect(manifest.type).toContain('application/manifest+json')
    expect(manifest.json).toMatchObject({ name: 'ทำวันนี้', display: 'standalone', start_url: '/' })
    for (const icon of manifest.json.icons) {
      const res = await page.request.get(server.url + icon.src)
      expect(res.status(), icon.src).toBe(200)
    }
    await ctx.close()
  })

  it('ปิดเน็ตแล้วเปิดแอปได้ทุกหน้า (รวมลิงก์ลึก) ใช้งานและบันทึกได้ และข้อมูลยังอยู่เมื่อเน็ตกลับมา', async () => {
    const ctx = await newMobileContext(browser, { seed: sampleData(bangkokToday()) })
    const page = await open(ctx, server.url)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForLoadState('networkidle')

    await ctx.setOffline(true)
    const tomorrow = new Date(Date.now() + 7 * 3600_000 + 86_400_000).toISOString().slice(0, 10)
    for (const [path, heading] of [
      ['/', 'วันนี้'],
      ['/settings', 'ตั้งค่า'],
      ['/parking', 'ที่พักความคิด'],
      [`/day/${tomorrow}`, 'พรุ่งนี้'],
    ]) {
      await page.goto(server.url + path)
      await page.waitForLoadState('domcontentloaded')
      expect(await text(page, 'h1'), `ออฟไลน์ ${path}`).toBe(heading)
    }
    await page.goto(server.url + '/')
    await page.getByRole('textbox', { name: 'จดสิ่งที่แทรกเข้ามา' }).fill('จดตอนออฟไลน์')
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'เพิ่มงานวันนี้' }).click()
    await page.getByLabel('เพิ่มงานวันนี้').fill('งานตอนออฟไลน์')
    await page.keyboard.press('Enter')
    expect((await stored(page, 'tasks')).some((t) => t.title === 'งานตอนออฟไลน์')).toBe(true)

    await ctx.setOffline(false)
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(await text(page)).toContain('งานตอนออฟไลน์')
    expect((await stored(page, 'parking')).some((n) => n.text === 'จดตอนออฟไลน์')).toBe(true)
    await ctx.close()
  })

  it('deploy เวอร์ชันใหม่: ขึ้นแบนเนอร์ "ไว้ก่อน" ไม่รีโหลด "อัปเดต" แล้วเปลี่ยนเป็นเวอร์ชันใหม่ ข้อมูลไม่หาย', async () => {
    const { v1, v2 } = makeTwoVersions()
    const local = await startServer({ dir: v1 })
    const ctx = await newMobileContext(browser, { seed: sampleData(bangkokToday()) })
    const page = await open(ctx, local.url)
    await page.evaluate(() => navigator.serviceWorker.ready)
    await page.reload()
    await page.waitForLoadState('networkidle')
    const before = await stored(page, 'tasks')

    local.setDir(v2) // เหมือนอัปโหลดไฟล์ใหม่ทับบน Plesk
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
    await page.getByText('มีเวอร์ชันใหม่ แตะเพื่ออัปเดต').waitFor()

    await page.getByRole('button', { name: 'ไว้ก่อน' }).click()
    expect(await text(page)).not.toContain('มีเวอร์ชันใหม่')

    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update())
    // หลังกด "ไว้ก่อน" และเช็กซ้ำ service worker ตัวเดิมที่รออยู่ยังเป็นตัวเดิม จึงต้องปลุกแบนเนอร์ใหม่ด้วยการเปิดหน้าอีกครั้ง
    await page.reload()
    await page.waitForLoadState('networkidle')
    await page.getByText('มีเวอร์ชันใหม่ แตะเพื่ออัปเดต').waitFor()

    const navigated = page.waitForEvent('framenavigated')
    await page.getByRole('button', { name: 'อัปเดต', exact: true }).click()
    await navigated
    await page.waitForLoadState('networkidle')
    await page.waitForFunction(() => navigator.serviceWorker.controller?.state === 'activated')

    const swText = await page.evaluate(async () => await (await fetch('/sw.js')).text())
    expect(swText).toContain('เวอร์ชัน 2')
    expect(await text(page)).not.toContain('มีเวอร์ชันใหม่')
    expect(await stored(page, 'tasks')).toEqual(before)
    await ctx.close()
    await local.close()
  })
})

describe('ธีมและการเข้าถึง (axe บนเบราว์เซอร์จริง รวมคอนทราสต์)', () => {
  const combos = []
  for (const scheme of ['light', 'dark'])
    for (const accent of ['butter', 'mint', 'peach']) combos.push([scheme, accent])

  it.each(combos)(
    'โหมด %s + ไฮไลต์ %s: ทุกหน้าไม่มีข้อผิดพลาดการเข้าถึงหรือคอนทราสต์',
    async (scheme, accent) => {
      const ctx = await newMobileContext(browser, {
        seed: sampleData(bangkokToday()),
        settings: { theme: scheme, accent },
      })
      const page = await open(ctx, server.url)
      const problems = []
      for (const path of ['/', '/parking', '/settings', '/ไม่มีหน้านี้']) {
        await page.goto(server.url + path)
        await page.waitForLoadState('networkidle')
        await page.waitForTimeout(3300) // ให้ข้อความ "ใช้ตอนไม่มีเน็ตได้แล้ว" หายก่อน
        if (path === '/') await page.getByLabel('ตัวเลือกของ อ่านบทที่ 4 วิชาสถิติ').click() // เปิดแผงตัวเลือกด้วย
        for (const v of await runAxe(page)) problems.push({ path, ...v })
      }
      expect(problems, JSON.stringify(problems, null, 2)).toEqual([])
      await ctx.close()
    },
  )

  it('"อัตโนมัติ" ตามโหมดมืดของเครื่องสดๆ และเลือกสว่างแล้วไม่ตามเครื่อง', async () => {
    const ctx = await newMobileContext(browser, { colorScheme: 'light' })
    const page = await open(ctx, server.url + '/settings')
    const theme = () => page.evaluate(() => document.documentElement.dataset.theme ?? 'light')
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor)

    expect(await theme()).toBe('light')
    const lightBg = await bg()
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    expect(await bg()).not.toBe(lightBg)
    expect(
      await page.evaluate(() =>
        document.querySelector('meta[name="theme-color"]').content.toLowerCase(),
      ),
    ).toBe('#1b2036')

    await page.getByRole('button', { name: 'สว่าง', exact: true }).click()
    expect(await theme()).toBe('light')
    await page.emulateMedia({ colorScheme: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    expect(await theme()).toBe('light')

    // เปิดใหม่: ธีมที่เลือกไว้ถูกใส่ก่อนวาดหน้าจอ (ไม่กะพริบ)
    await page.getByRole('button', { name: 'มืด', exact: true }).click()
    await page.reload({ waitUntil: 'commit' })
    await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark')
    await ctx.close()
  })
})

describe('เวลาและเขตเวลา', () => {
  it('เปิดแอปค้างข้ามเที่ยงคืน: "วันนี้" เปลี่ยนเอง งานที่ไม่เสร็จกลายเป็นงานค้าง', async () => {
    const ctx = await newMobileContext(browser)
    const page = await ctx.newPage()
    await page.clock.install({ time: new Date('2026-10-04T16:59:00Z') }) // 23:59 ตามเวลาไทย
    const day = '2026-10-04'
    const now = new Date('2026-10-04T10:00:00Z').toISOString()
    await ctx.addInitScript(
      ({ now, day }) => {
        if (sessionStorage.getItem('__s')) return
        sessionStorage.setItem('__s', '1')
        localStorage.setItem(
          'tw:v1:tasks',
          JSON.stringify([
            {
              id: 'a',
              title: 'ยังไม่เสร็จก่อนเที่ยงคืน',
              status: 'todo',
              date: day,
              order: 0,
              createdAt: now,
              doneAt: null,
            },
            {
              id: 'b',
              title: 'เสร็จแล้ว',
              status: 'done',
              date: day,
              order: 1,
              createdAt: now,
              doneAt: now,
            },
          ]),
        )
      },
      { now, day },
    )
    await page.goto(server.url)
    await page.waitForLoadState('domcontentloaded')

    expect(await text(page)).toContain('อาทิตย์ 4 ตุลาคม 2569')
    expect(await text(page)).not.toContain('ค้างจากก่อนหน้า')

    await page.clock.fastForward('02:00') // ข้ามเที่ยงคืน
    await page.getByText('จันทร์ 5 ตุลาคม 2569').waitFor()
    expect(await text(page, 'h1')).toBe('วันนี้')
    const group = page.locator('section[aria-label="ค้างจากก่อนหน้า"]')
    expect(await group.innerText()).toContain('ยังไม่เสร็จก่อนเที่ยงคืน')
    expect(await group.innerText()).toContain('ค้าง 1 วัน')
    expect(await text(page)).toContain('ยังไม่มีงานของวันนี้')
    await ctx.close()
  })

  it.each([
    ['Asia/Bangkok', 'อาทิตย์ 4 ตุลาคม 2569'],
    ['Pacific/Auckland', 'จันทร์ 5 ตุลาคม 2569'],
    ['America/Los_Angeles', 'อาทิตย์ 4 ตุลาคม 2569'],
    ['Pacific/Kiritimati', 'จันทร์ 5 ตุลาคม 2569'],
    ['Pacific/Pago_Pago', 'อาทิตย์ 4 ตุลาคม 2569'],
  ])('เขตเวลา %s: "วันนี้" ตามเวลาท้องถิ่นของเครื่อง = %s', async (timezoneId, expected) => {
    // เวลาเดียวกันทั่วโลก 2026-10-04 12:00 UTC
    const ctx = await newMobileContext(browser, { timezoneId })
    const page = await ctx.newPage()
    await page.clock.install({ time: new Date('2026-10-04T12:00:00Z') })
    await page.goto(server.url)
    await page.waitForLoadState('domcontentloaded')
    expect(await text(page)).toContain(expected)
    const stripCount = await page.locator('nav[aria-label="เลือกวัน"] a').count()
    expect(stripCount).toBe(7)
    await ctx.close()
  })
})

describe('สภาพแวดล้อมแย่ๆ', () => {
  it('localStorage ถูกปิด: ไม่พัง ขึ้นคำเตือน และยังเพิ่มงานได้ (เก็บชั่วคราว)', async () => {
    const ctx = await newMobileContext(browser)
    await ctx.addInitScript(() => {
      Object.defineProperty(window, 'localStorage', {
        get() {
          throw new DOMException('denied', 'SecurityError')
        },
      })
    })
    const page = await open(ctx, server.url)
    expect(await text(page)).toContain('บันทึกข้อมูลลงเครื่องนี้ไม่ได้')
    await page.getByRole('button', { name: 'เพิ่มงานแรก' }).click()
    await page.getByLabel('เพิ่มงานวันนี้').fill('งานชั่วคราว')
    await page.keyboard.press('Enter')
    expect(await text(page)).toContain('งานชั่วคราว')
    expect(page.errors.filter((e) => !/denied|SecurityError/.test(e))).toEqual([])
    await ctx.close()
  })

  it('พื้นที่เก็บข้อมูลเต็ม (QuotaExceeded) ระหว่างใช้งาน: แอปไม่ล้ม ขึ้นคำเตือน งานยังอยู่ในหน้าจอ', async () => {
    const ctx = await newMobileContext(browser)
    const page = await open(ctx, server.url)
    await page.evaluate(() => {
      Storage.prototype.setItem = () => {
        throw new DOMException('full', 'QuotaExceededError')
      }
    })
    await page.getByRole('button', { name: 'เพิ่มงานแรก' }).click()
    await page.getByLabel('เพิ่มงานวันนี้').fill('งานตอนเต็ม')
    await page.keyboard.press('Enter')
    expect(await text(page)).toContain('งานตอนเต็ม')
    expect(await text(page)).toContain('บันทึกข้อมูลลงเครื่องนี้ไม่ได้')
    await ctx.close()
  })

  it('ข้อมูลใน localStorage เสียหาย: เปิดแอปได้ ไม่ขาว', async () => {
    const ctx = await newMobileContext(browser, {
      seed: { 'tw:v1:parking': 'ไม่ใช่ json' },
    })
    await ctx.addInitScript(() => {
      localStorage.setItem('tw:v1:tasks', '{พัง')
      localStorage.setItem('tw:v1:settings', '[1,2')
    })
    const page = await open(ctx, server.url)
    expect(await text(page, 'h1')).toBe('วันนี้')
    await ctx.close()
  })
})

describe('สำรอง/กู้คืนในเบราว์เซอร์จริง', () => {
  it('สำรองเป็นไฟล์จริง ล้างข้อมูล แล้วกู้คืนจากไฟล์ได้ข้อมูลเท่าเดิม', async () => {
    const seed = sampleData(bangkokToday())
    const ctx = await newMobileContext(browser, { seed, acceptDownloads: true })
    const page = await open(ctx, server.url + '/settings')
    const before = { tasks: await stored(page, 'tasks'), parking: await stored(page, 'parking') }

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'สำรองข้อมูล' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^todaytask-backup-\d{4}-\d{2}-\d{2}\.json$/)
    const path = await download.path()
    const file = JSON.parse(readFileSync(path, 'utf8'))
    expect(file).toMatchObject({ app: 'todaytask', format: 1 })
    expect(file.data.tasks).toHaveLength(8)

    await page.getByRole('button', { name: 'ล้างข้อมูลทั้งหมด' }).click()
    await page.getByRole('button', { name: 'ลบทั้งหมด' }).click()
    expect(await stored(page, 'tasks')).toBeNull() // ล้างแล้ว key หายไปเลย

    await page.locator('input[type="file"]').setInputFiles(path)
    await page.getByText('พบข้อมูลในไฟล์สำรอง').waitFor()
    await page.getByRole('button', { name: 'แทนที่ข้อมูลเดิม' }).click()
    expect(await stored(page, 'tasks')).toEqual(before.tasks)
    expect(await stored(page, 'parking')).toEqual(before.parking)
    await ctx.close()
  })

  it('ไฟล์ที่ไม่ใช่ไฟล์สำรอง: ขึ้นข้อความอธิบาย ไม่แตะข้อมูล', async () => {
    const seed = sampleData(bangkokToday())
    const ctx = await newMobileContext(browser, { seed })
    const page = await open(ctx, server.url + '/settings')
    await page.locator('input[type="file"]').setInputFiles({
      name: 'x.json',
      mimeType: 'application/json',
      buffer: Buffer.from('{"hello":1}'),
    })
    await page.getByText('กู้คืนไม่ได้').waitFor()
    expect(await stored(page, 'tasks')).toHaveLength(8)
    await ctx.close()
  })
})
