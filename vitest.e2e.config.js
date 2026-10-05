/* ชุดทดสอบในเบราว์เซอร์จริง (Chromium ผ่าน playwright-core) ทดสอบไฟล์ที่ build แล้วในโฟลเดอร์ dist
   รัน: npm run test:e2e   (ครั้งแรกบนเครื่องคุณ: npx playwright-core install chromium)
   ใช้ Chromium ที่มีอยู่แล้วได้ด้วย CHROMIUM_PATH=/path/to/chrome */
export default {
  test: {
    include: ['e2e/**/*.e2e.js'],
    testTimeout: 60_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
}
