import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { makeManifest } from './pwa-manifest.js'

/** แอปอยู่ใต้ /todaytask/ บนโดเมนหลักเมื่อ build จริง (npm run build)
 *  โหมดอื่น (dev, test, build --mode root) อยู่ที่ root: ใช้ทดสอบ e2e ที่เสิร์ฟ dist-root ที่ / */
export const PRODUCTION_BASE = '/todaytask/'

/** ใส่ <link rel="preload"> ให้ฟอนต์ที่ใช้เหนือรอยพับ ไม่ต้องรอ CSS โหลดเสร็จก่อนค่อยรู้ว่าต้องใช้ฟอนต์
 *  (ลดเวลาแสดงตัวอักษรและลดการขยับของหน้าตอนฟอนต์สลับ) */
function preloadFonts(base) {
  const wanted = [/thai-400-normal/, /thai-600-normal/, /latin-400-normal/, /latin-600-normal/]
  return {
    name: 'preload-fonts',
    transformIndexHtml: {
      order: 'post',
      handler(_html, ctx) {
        if (!ctx.bundle) return
        return Object.keys(ctx.bundle)
          .filter((file) => file.endsWith('.woff2') && wanted.some((re) => re.test(file)))
          .map((file) => ({
            tag: 'link',
            attrs: {
              rel: 'preload',
              as: 'font',
              type: 'font/woff2',
              crossorigin: '',
              href: `${base}${file}`,
            },
            injectTo: 'head',
          }))
      },
    },
  }
}

export default defineConfig(({ mode }) => {
  const base = mode === 'production' ? PRODUCTION_BASE : '/'
  return {
    base,
    plugins: [
      react(),
      preloadFonts(base),
      // ตอนรันเทสต์ไม่ต้องสร้าง service worker (ใช้ตัวแทนใน src/test-stubs แทน)
      mode !== 'test' &&
        VitePWA({
          // prompt = ไม่รีโหลดกลางงาน ให้ผู้ใช้กด "อัปเดต" เอง
          registerType: 'prompt',
          injectRegister: false, // ลงทะเบียนเองผ่าน hook useServiceWorker
          manifest: makeManifest(base),
          workbox: {
            // เก็บไฟล์แอปทั้งหมดไว้ออฟไลน์ (ฟอนต์เอาเฉพาะ woff2 เบราว์เซอร์ที่รองรับ service worker อ่านได้ทุกตัว)
            globPatterns: ['**/*.{js,css,html,ico,png,woff2}'],
            navigateFallback: `${base}index.html`, // /day/2026-10-05 ฯลฯ เปิดออฟไลน์ได้
            cleanupOutdatedCaches: true,
          },
        }),
    ],
    test: {
      alias: {
        'virtual:pwa-register/react': fileURLToPath(
          new URL('./src/test-stubs/pwa-register-react.js', import.meta.url),
        ),
      },
    },
  }
})
