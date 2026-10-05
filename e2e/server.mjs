/* เซิร์ฟเวอร์ static เล็กๆ สำหรับทดสอบไฟล์ที่ build แล้ว (dist) ให้ตอบเหมือนที่ web.config บน IIS ตั้งไว้:
   - ทุกเส้นทางที่ไม่ใช่ไฟล์ -> index.html (SPA fallback)
   - sw.js / index.html / manifest.webmanifest ห้ามแคช, ไฟล์ใน assets/ แคชยาว
   - .webmanifest ตอบเป็น application/manifest+json
   เปลี่ยนโฟลเดอร์ที่เสิร์ฟระหว่างทางได้ (setDir) เพื่อจำลองการ deploy เวอร์ชันใหม่ */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join, normalize, resolve, sep } from 'node:path'

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
  '.config': 'application/xml',
}
const NO_CACHE = new Set(['/sw.js', '/index.html', '/manifest.webmanifest'])

/* options (ใช้จำลองการตั้งค่าที่ผิด เพื่อทดสอบสคริปต์ตรวจหลัง deploy):
   headers        header เพิ่มเติมทุกคำตอบ (เช่น Content-Security-Policy)
   spaFallback    false = ไม่มีกฎ rewrite (ลิงก์ลึกจะ 404 เหมือน IIS ที่ไม่มี URL Rewrite)
   swCache        ค่า Cache-Control ของ sw.js (ค่าเริ่มต้น no-cache)
   manifestType   Content-Type ของ manifest
   exposeConfig   true = เสิร์ฟ web.config ออกไปตรงๆ (IIS จริงบล็อกไว้)
   securityHeaders false = ไม่ใส่ header ความปลอดภัยพื้นฐาน
   mount          เสิร์ฟแอปใต้ path ย่อย เช่น '/todaytask' (นอก path นี้ 404, /todaytask ไม่มี / ท้าย -> redirect เหมือน IIS) */
export async function startServer({
  dir,
  port = 0,
  headers: extraHeaders = {},
  spaFallback = true,
  swCache = 'no-cache, no-store, must-revalidate',
  manifestType = 'application/manifest+json',
  exposeConfig = false,
  securityHeaders = true,
  mount = '',
}) {
  let root = resolve(dir)
  const log = []

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, 'http://localhost')
    let path = decodeURIComponent(url.pathname)
    log.push(path)
    if (mount) {
      if (path === mount) {
        res.writeHead(301, { Location: mount + '/' }).end()
        return
      }
      if (!path.startsWith(mount + '/')) {
        res.writeHead(404).end('not found')
        return
      }
      path = path.slice(mount.length)
    }

    if (path === '/web.config' && !exposeConfig) {
      res.writeHead(404).end('not found') // IIS ไม่เสิร์ฟ web.config ให้ใคร
      return
    }

    let file = normalize(join(root, path))
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403).end('forbidden')
      return
    }

    let info = await stat(file).catch(() => null)
    if (info?.isDirectory()) {
      file = join(file, 'index.html')
      info = await stat(file).catch(() => null)
    }
    let served = path
    if (!info) {
      // ไฟล์ที่มีนามสกุลแต่ไม่มีอยู่จริง = 404 (ไม่ตอบ HTML ปนไปให้ JS/CSS)
      if (extname(path) || !spaFallback) {
        res.writeHead(404).end('not found')
        return
      }
      file = join(root, 'index.html')
      served = '/index.html'
    }

    const body = await readFile(file).catch(() => null)
    if (!body) {
      res.writeHead(404).end('not found') // ไม่มีแม้แต่ index.html
      return
    }
    const headers = { 'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream' }
    if (served === '/manifest.webmanifest') headers['Content-Type'] = manifestType
    headers['Cache-Control'] =
      served === '/sw.js'
        ? swCache
        : NO_CACHE.has(served) || served === '/'
          ? 'no-cache, no-store, must-revalidate'
          : path.startsWith('/assets/')
            ? 'public, max-age=31536000, immutable'
            : 'public, max-age=3600'
    if (securityHeaders) {
      headers['X-Content-Type-Options'] = 'nosniff'
      headers['X-Frame-Options'] = 'DENY'
      headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
    }
    res.writeHead(200, { ...headers, ...extraHeaders }).end(body)
  })

  await new Promise((r) => server.listen(port, '127.0.0.1', r))
  const address = server.address()
  return {
    url: `http://127.0.0.1:${address.port}`,
    setDir: (next) => {
      root = resolve(next)
    },
    requests: log,
    close: () => new Promise((r) => server.close(r)),
  }
}

// รันตรงๆ: node e2e/server.mjs [dist] [port]
if (import.meta.url === `file://${process.argv[1]}`) {
  const { url } = await startServer({
    dir: process.argv[2] ?? 'dist',
    port: Number(process.argv[3] ?? 4173),
  })
  console.log(`เสิร์ฟ ${process.argv[2] ?? 'dist'} ที่ ${url}`)
}
