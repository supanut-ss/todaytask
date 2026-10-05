#!/usr/bin/env node
/* ตรวจเซิร์ฟเวอร์หลัง deploy: ทำให้อัตโนมัติในสิ่งที่ต้องไล่เช็กเองใน DevTools
   ใช้:  node scripts/verify-deploy.mjs https://drivetodev.online/todaytask/
         node scripts/verify-deploy.mjs http://127.0.0.1:4173 --allow-http   (ทดสอบในเครื่อง)
   ออกด้วยรหัส 1 ถ้ามีข้อที่ "ไม่ผ่าน" (ข้อ "เตือน" ไม่ทำให้ล้ม) */

import { pathToFileURL } from 'node:url'

const OK = 'ผ่าน'
const FAIL = 'ไม่ผ่าน'
const WARN = 'เตือน'

const noCache = (value = '') => /no-cache|no-store|max-age=0/i.test(value)
const maxAge = (value = '') => Number(/max-age=(\d+)/i.exec(value)?.[1] ?? 0)

/** รันทุกการตรวจ คืนรายการ { status, name, detail } */
export async function verifyDeploy(baseUrl, { allowHttp = false } = {}) {
  const base = new URL(baseUrl)
  if (!base.pathname.endsWith('/')) base.pathname += '/' // แอปอยู่ใต้ path ย่อยได้ เช่น https://โดเมน/todaytask/
  const results = []
  const add = (status, name, detail = '') => results.push({ status, name, detail })
  const check = (cond, name, detail, level = FAIL) =>
    add(cond ? OK : level, name, cond ? '' : detail)
  const get = (path, init) => fetch(new URL(path, base), { redirect: 'manual', ...init })

  // 1) HTTPS
  if (base.protocol === 'https:') add(OK, 'ใช้ HTTPS')
  else
    check(
      allowHttp,
      'ใช้ HTTPS',
      "ต้องเปิด HTTPS (Plesk > SSL/TLS Certificates > Let's Encrypt) PWA ติดตั้งไม่ได้ถ้าไม่มี",
    )

  // 2) http -> https
  if (base.protocol === 'https:') {
    try {
      const res = await fetch(`http://${base.host}/`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      })
      const to = res.headers.get('location') ?? ''
      check(
        [301, 302, 307, 308].includes(res.status) && to.startsWith('https://'),
        'http:// เด้งไป https://',
        `ตอบ ${res.status} ${to} ควรเปิด redirect HTTP -> HTTPS ใน Plesk`,
        WARN,
      )
    } catch {
      add(
        WARN,
        'http:// เด้งไป https://',
        'เชื่อมต่อ http ไม่ได้เพื่อตรวจ (อาจปิดพอร์ต 80 ไว้) ข้ามข้อนี้ได้ถ้าตั้งใจ',
      )
    }
  }

  // 3) หน้าแรก
  const home = await get('./')
  const homeBody = await home.text()
  check(home.status === 200, 'หน้าแรกตอบ 200', `ตอบ ${home.status}`)
  check(
    /<div id="root">/.test(homeBody) && /lang="th"/.test(homeBody),
    'หน้าแรกเป็นแอป (มี #root, lang=th)',
    'เนื้อหาไม่ใช่ index.html ของแอป อัปโหลดผิดโฟลเดอร์หรือเปล่า (ต้องเป็นเนื้อหาใน dist ไม่ใช่ตัวโฟลเดอร์ dist)',
  )
  check(
    noCache(home.headers.get('cache-control') ?? ''),
    'index.html ห้ามแคช',
    `Cache-Control: "${home.headers.get('cache-control')}" ถ้าแคช ผู้ใช้จะค้างเวอร์ชันเก่า ตรวจ <location path="index.html"> ใน web.config`,
  )

  // 4) ลิงก์ลึก (SPA fallback)
  for (const path of ['/settings', '/parking', '/day/2026-10-05']) {
    const res = await get(path.slice(1))
    const ctype = res.headers.get('content-type') ?? ''
    check(
      res.status === 200 && ctype.includes('text/html'),
      `ลิงก์ลึก ${path} เปิดได้`,
      `ตอบ ${res.status} (${ctype || 'ไม่มี content-type'}) — IIS ต้องมีโมดูล URL Rewrite และ web.config ที่ถูกต้อง หรือเปลี่ยนไปใช้ HashRouter`,
    )
  }

  // 5) ไฟล์ที่ไม่มีต้อง 404 (ไม่ตอบ HTML ปนให้ JS/CSS)
  const missing = await get('assets/ไม่มีไฟล์นี้.js')
  check(
    missing.status === 404,
    'ไฟล์ที่ไม่มีอยู่ตอบ 404',
    `ตอบ ${missing.status} (ควร 404) กฎ rewrite กว้างเกินไป`,
  )

  // 6) manifest
  const mres = await get('manifest.webmanifest')
  check(mres.status === 200, 'manifest.webmanifest ตอบ 200', `ตอบ ${mres.status}`)
  check(
    (mres.headers.get('content-type') ?? '').includes('application/manifest+json'),
    'manifest ชนิดไฟล์ถูก',
    `Content-Type: "${mres.headers.get('content-type')}" ต้องเป็น application/manifest+json (ตรวจ mimeMap ใน web.config)`,
  )
  check(
    noCache(mres.headers.get('cache-control') ?? ''),
    'manifest ห้ามแคช',
    `Cache-Control: "${mres.headers.get('cache-control')}"`,
    WARN,
  )
  let manifest = null
  try {
    manifest = JSON.parse(await mres.text())
  } catch {
    /* ตรวจต่อด้านล่าง */
  }
  check(
    manifest?.name === 'ทำวันนี้' &&
      manifest?.display === 'standalone' &&
      manifest?.start_url === base.pathname,
    'manifest มีค่าครบ',
    'อ่าน manifest ไม่ได้หรือค่าไม่ครบ',
  )
  for (const icon of manifest?.icons ?? []) {
    const res = await get(icon.src)
    check(
      res.status === 200 && (res.headers.get('content-type') ?? '').includes('image/png'),
      `ไอคอน ${icon.src}`,
      `ตอบ ${res.status} ${res.headers.get('content-type')}`,
    )
  }

  // 7) service worker
  const sw = await get('sw.js')
  const swBody = await sw.text()
  check(
    sw.status === 200 && (sw.headers.get('content-type') ?? '').includes('javascript'),
    'sw.js ตอบ 200 เป็น JavaScript',
    `ตอบ ${sw.status} ${sw.headers.get('content-type')}`,
  )
  check(
    noCache(sw.headers.get('cache-control') ?? ''),
    'sw.js ห้ามแคช (สำคัญที่สุดสำหรับการอัปเดต)',
    `Cache-Control: "${sw.headers.get('cache-control')}" ถ้า sw.js ถูกแคช ผู้ใช้จะไม่เห็นเวอร์ชันใหม่ ตรวจ <location path="sw.js"> ใน web.config`,
  )
  check(
    swBody.includes('precacheAndRoute'),
    'sw.js เป็น service worker ของแอป',
    'เนื้อหา sw.js ไม่ถูกต้อง',
  )

  // 8) ไฟล์ใน assets (แคชยาว) และฟอนต์
  const assets = [...homeBody.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((p) => p.startsWith(`${base.pathname}assets/`))
  check(
    assets.length >= 3,
    'index.html อ้างถึงไฟล์ JS/CSS/ฟอนต์ใน /assets',
    'ไม่พบการอ้างถึงไฟล์ใน /assets',
  )
  for (const path of assets) {
    const res = await get(path, { headers: { 'Accept-Encoding': 'gzip, br' } })
    check(res.status === 200, `โหลด ${path}`, `ตอบ ${res.status}`)
    if (res.status === 200) {
      check(
        maxAge(res.headers.get('cache-control') ?? '') >= 86400,
        `แคชยาว ${path.split('/').pop()}`,
        `Cache-Control: "${res.headers.get('cache-control')}" ไฟล์ที่ชื่อมี hash ควรแคชนาน (ช่วยให้เปิดเร็ว)`,
        WARN,
      )
      if (path.endsWith('.woff2'))
        check(
          (res.headers.get('content-type') ?? '').includes('font/woff2'),
          `ฟอนต์ ${path.split('/').pop()} ชนิดไฟล์ถูก`,
          `Content-Type: "${res.headers.get('content-type')}" (ตรวจ mimeMap .woff2 ใน web.config)`,
        )
    }
  }
  const js = assets.find((a) => a.endsWith('.js'))
  if (js) {
    const res = await get(js, { headers: { 'Accept-Encoding': 'gzip' } })
    await res.arrayBuffer()
    check(
      /gzip|br/.test(res.headers.get('content-encoding') ?? ''),
      'บีบอัดไฟล์ JS (gzip/br)',
      'ไม่ได้บีบอัด เปิด static compression ใน IIS/Plesk จะโหลดเร็วขึ้นมาก',
      WARN,
    )
  }

  // 9) header ความปลอดภัย
  const h = home.headers
  check(
    h.get('x-content-type-options') === 'nosniff',
    'X-Content-Type-Options: nosniff',
    'ไม่มี header นี้ (ตรวจ httpProtocol ใน web.config)',
    WARN,
  )
  check(
    Boolean(h.get('x-frame-options')) ||
      /frame-ancestors/.test(h.get('content-security-policy') ?? ''),
    'กันถูกฝังใน iframe (X-Frame-Options / frame-ancestors)',
    'ไม่มี header นี้',
    WARN,
  )
  check(Boolean(h.get('referrer-policy')), 'Referrer-Policy', 'ไม่มี header นี้', WARN)
  check(
    !h.get('x-powered-by'),
    'ไม่เปิดเผย X-Powered-By',
    `เซิร์ฟเวอร์บอกว่า "${h.get('x-powered-by')}"`,
    WARN,
  )

  // 10) web.config ต้องไม่ถูกเสิร์ฟออกไป
  const cfg = await get('web.config')
  const cfgBody = cfg.status === 200 ? await cfg.text() : ''
  check(
    !(cfg.status === 200 && cfgBody.includes('<configuration')),
    'web.config ไม่ถูกเสิร์ฟให้คนนอกอ่าน',
    'เปิด /web.config อ่านได้! ตรวจการตั้งค่า hidden segments ของ IIS',
  )

  return results
}

export function summarize(results) {
  const count = (s) => results.filter((r) => r.status === s).length
  return { pass: count(OK), fail: count(FAIL), warn: count(WARN) }
}

// รันจากบรรทัดคำสั่ง
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2)
  const url = args.find((a) => !a.startsWith('--'))
  if (!url) {
    console.error('วิธีใช้: node scripts/verify-deploy.mjs <URL> [--allow-http]')
    process.exit(2)
  }
  console.log(`\nตรวจ ${url}\n`)
  const results = await verifyDeploy(url, { allowHttp: args.includes('--allow-http') })
  const mark = { [OK]: '✓', [FAIL]: '✗', [WARN]: '!' }
  for (const r of results) {
    console.log(`${mark[r.status]} ${r.name}${r.detail ? `\n    -> ${r.detail}` : ''}`)
  }
  const { pass, fail, warn } = summarize(results)
  console.log(`\nสรุป: ผ่าน ${pass}  ไม่ผ่าน ${fail}  เตือน ${warn}`)
  console.log(fail === 0 ? 'พร้อมใช้งาน' : 'ยังมีข้อที่ต้องแก้ก่อนเปิดใช้ (ดูข้อที่มี ✗)')
  process.exit(fail === 0 ? 0 : 1)
}
