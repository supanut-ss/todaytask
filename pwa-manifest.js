/* ค่า manifest ของ PWA (แยกไฟล์เพื่อให้เทสต์ตรวจได้ว่าไอคอนมีจริงและขนาดตรง)
   ใช้ใน vite.config.js -> vite-plugin-pwa สร้างไฟล์ manifest.webmanifest ให้ตอน build */
export const manifest = {
  id: '/',
  name: 'ทำวันนี้',
  short_name: 'ทำวันนี้',
  description: 'วางแผนรายวัน ทำทีละงาน เคลียร์ให้ครบ',
  lang: 'th',
  dir: 'ltr',
  start_url: '/',
  scope: '/',
  display: 'standalone',
  background_color: '#F8F7FD',
  theme_color: '#F8F7FD',
  categories: ['productivity'],
  icons: [
    { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    {
      src: '/icons/icon-maskable-512.png',
      sizes: '512x512',
      type: 'image/png',
      purpose: 'maskable',
    },
  ],
}
