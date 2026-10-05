import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DIST, DIST_ROOT, startServer } from '../e2e/helpers.mjs'
import { summarize, verifyDeploy } from './verify-deploy.mjs'

/* ทดสอบสคริปต์ตรวจ deploy กับเซิร์ฟเวอร์จำลอง: ตั้งค่าถูก = ผ่านหมด, ตั้งค่าผิดทีละแบบ = จับได้ตรงข้อ */

let server
afterEach(async () => server?.close())

const run = async (options) => {
  server = await startServer({ dir: DIST_ROOT, ...options })
  const results = await verifyDeploy(server.url, { allowHttp: true })
  return {
    results,
    ...summarize(results),
    failed: results.filter((r) => r.status === 'ไม่ผ่าน').map((r) => r.name),
  }
}

describe('verify-deploy ใต้ path ย่อย (build จริง /todaytask/)', () => {
  it('เสิร์ฟ dist ที่ /todaytask: ผ่านหมด ไม่มีข้อที่ไม่ผ่าน', async () => {
    server = await startServer({ dir: DIST, mount: '/todaytask' })
    const results = await verifyDeploy(server.url + '/todaytask/', { allowHttp: true })
    const failed = results.filter((r) => r.status === 'ไม่ผ่าน').map((r) => r.name)
    expect(failed).toEqual([])
    expect(summarize(results).pass).toBeGreaterThan(25)
  })

  it('ใส่ URL ไม่มี / ท้าย: ยังตรวจได้เหมือนกัน', async () => {
    server = await startServer({ dir: DIST, mount: '/todaytask' })
    const results = await verifyDeploy(server.url + '/todaytask', { allowHttp: true })
    expect(results.filter((r) => r.status === 'ไม่ผ่าน')).toEqual([])
  })

  it('อัปโหลดผิดที่ (build จริงอยู่ที่ root): จับได้ว่าไฟล์ใน /todaytask/assets ไม่มี', async () => {
    server = await startServer({ dir: DIST })
    const results = await verifyDeploy(server.url + '/todaytask/', { allowHttp: true })
    expect(results.some((r) => r.status === 'ไม่ผ่าน')).toBe(true)
  })
})

describe('verify-deploy', () => {
  it('ตั้งค่าถูกต้อง: ไม่มีข้อที่ไม่ผ่าน', async () => {
    const r = await run({})
    expect(r.failed).toEqual([])
    expect(r.pass).toBeGreaterThan(25)
  })

  it('ไม่มีกฎ rewrite (IIS ไม่มี URL Rewrite): จับได้ว่าลิงก์ลึกเปิดไม่ได้', async () => {
    const r = await run({ spaFallback: false })
    expect(r.failed).toEqual(
      expect.arrayContaining([
        'ลิงก์ลึก /settings เปิดได้',
        'ลิงก์ลึก /parking เปิดได้',
        'ลิงก์ลึก /day/2026-10-05 เปิดได้',
      ]),
    )
    expect(r.failed.some((n) => n.includes('หน้าแรก'))).toBe(false)
  })

  it('sw.js ถูกแคชยาว: จับได้ (สาเหตุที่ผู้ใช้ไม่เห็นเวอร์ชันใหม่)', async () => {
    const r = await run({ swCache: 'public, max-age=31536000' })
    expect(r.failed).toEqual(['sw.js ห้ามแคช (สำคัญที่สุดสำหรับการอัปเดต)'])
  })

  it('manifest ตอบเป็น application/octet-stream: จับได้', async () => {
    const r = await run({ manifestType: 'application/octet-stream' })
    expect(r.failed).toEqual(['manifest ชนิดไฟล์ถูก'])
  })

  it('เสิร์ฟ web.config ออกไปตรงๆ: จับได้', async () => {
    const r = await run({ exposeConfig: true })
    expect(r.failed).toEqual(['web.config ไม่ถูกเสิร์ฟให้คนนอกอ่าน'])
  })

  it('ไม่มี header ความปลอดภัย: เป็นแค่คำเตือน ไม่ทำให้ล้ม', async () => {
    const r = await run({ securityHeaders: false })
    expect(r.failed).toEqual([])
    expect(r.warn).toBeGreaterThanOrEqual(3)
  })

  it('ใช้ http โดยไม่อนุญาต: ไม่ผ่านข้อ HTTPS', async () => {
    server = await startServer({ dir: DIST_ROOT })
    const results = await verifyDeploy(server.url, { allowHttp: false })
    expect(results.find((r) => r.name === 'ใช้ HTTPS').status).toBe('ไม่ผ่าน')
  })

  it('อัปโหลดผิด (เอาทั้งโฟลเดอร์ dist ไปวางข้างใน): หน้าแรกไม่ใช่แอป จับได้', async () => {
    const wrong = mkdtempSync(join(tmpdir(), 'wrong-upload-'))
    cpSync(DIST_ROOT, join(wrong, 'dist'), { recursive: true }) // ควรอัปโหลด "เนื้อหาใน" dist ไม่ใช่ตัวโฟลเดอร์
    const r = await run({ dir: wrong })
    expect(r.failed).toEqual(
      expect.arrayContaining([
        'หน้าแรกตอบ 200',
        'หน้าแรกเป็นแอป (มี #root, lang=th)',
        'manifest.webmanifest ตอบ 200',
      ]),
    )
    expect(r.fail).toBeGreaterThanOrEqual(5)
  })
})
