# ทำวันนี้ (todaytask)

เว็บแอปวางแผนงานรายวัน (PWA) — React + Vite, JavaScript, ไม่มีฐานข้อมูล (เก็บข้อมูลใน localStorage)
Subdomain: `todaytask.drivetodev.online` · Hosting: Plesk บน Windows (IIS)

แผนงานเต็มดูที่ `todaytask-plan.md`

## คำสั่ง

```bash
npm install        # ติดตั้งแพ็กเกจ (ครั้งแรก)
npm run dev        # รันตอนพัฒนา เปิด http://localhost:5173
npm run build      # สร้างไฟล์สำหรับเปิดใช้งานในโฟลเดอร์ dist/
npm run preview    # ลองเปิดไฟล์ที่ build แล้ว
npm run lint       # ตรวจโค้ด
npm test           # รันเทสต์หน่วย/หน้าจอ (jsdom)
npm run test:tz    # เทสต์ซ้ำใน 8 เขตเวลา
npm run test:e2e   # เทสต์ในเบราว์เซอร์จริง (Chromium) รวมออฟไลน์/อัปเดต/axe/CSP
npm run verify -- <URL>   # ตรวจเซิร์ฟเวอร์หลัง deploy
npm run check      # lint + test + build
npm run format     # จัดรูปแบบโค้ด
```

## ธีมและสี

- ธีม (อัตโนมัติ/สว่าง/มืด) และสีไฮไลต์ ตั้งเป็นแอตทริบิวต์บน `<html>`: `data-theme="dark"`, `data-accent="mint|peach"`
- สคริปต์เล็กใน `index.html` ใส่ธีมก่อนวาดหน้าจอ กันภาพกะพริบ (ตรรกะเดียวกับ `src/lib/theme.js`)
- ถ้าแก้สีใน `src/styles/tokens.css` ให้รัน `npm test` ด้วย: มีเทสต์ตรวจคอนทราสต์ (WCAG AA) ของทุกคู่สีในทุกชุดธีม x สีไฮไลต์

## สำรองข้อมูล

ไฟล์สำรองเป็น JSON: `{ app: "todaytask", format: 1, exportedAt, data: { tasks, parking, settings, current } }`
ถ้าเปลี่ยนโครงข้อมูลในอนาคต ให้เพิ่มเลข `format` และเขียนตัวแปลงใน `lib/backup.js` ไฟล์เก่าจะยังกู้คืนได้

## PWA

- ตั้งค่าใน `vite.config.js` + `pwa-manifest.js` (สร้าง `manifest.webmanifest` และ `sw.js` ตอน `npm run build`)
- ตอน `npm run dev` ยังไม่มี service worker (ตั้งใจ) ต้องลอง PWA จากไฟล์ที่ build: `npm run build && npm run preview`
- ทดสอบ: DevTools > Application > Manifest / Service Workers แล้วติ๊ก Offline ดูว่าเปิดทุกหน้าได้
- อัปเดตเวอร์ชัน: build ใหม่แล้วอัปโหลดทับ ผู้ใช้เห็นแบนเนอร์ "มีเวอร์ชันใหม่" กดแล้วอัปเดต

## เอกสารอื่น

- `DEPLOY.md` ขั้นตอน deploy บน Plesk (IIS) ปัญหาที่เจอบ่อย อัปเดตเวอร์ชัน และย้อนกลับ
- `TESTING.md` วิธีทดสอบทั้งหมด ผล Lighthouse และรายการทดสอบบนมือถือจริง
- `todaytask-plan.md` แผนงานและการตัดสินใจออกแบบ

## นำขึ้น Plesk (สรุปสั้น ดูรายละเอียดที่ DEPLOY.md)

1. `npm run build`
2. อัปโหลด **เนื้อหาใน `dist/`** (ไม่ใช่ตัวโฟลเดอร์ `dist`) ไปที่ document root ของ subdomain
3. ตรวจว่ามี `web.config` อยู่ด้วย (คัดลอกมาจาก `public/web.config` อัตโนมัติ)

## โครงสร้าง

```
e2e/           เทสต์ในเบราว์เซอร์จริง + เซิร์ฟเวอร์จำลอง IIS
scripts/       verify-deploy (ตรวจหลัง deploy), test-tz (ทดสอบหลายเขตเวลา)
public/        ไฟล์ที่คัดลอกไปตรง ๆ: web.config, ไอคอน, favicon
src/
  pages/       หน้า: DayPage (Main), ParkingPage, SettingsPage, NotFoundPage
  components/  AppShell, PwaBanners, InstallPrompt, ThemeSection, DataSection, QuickCapture, DayStrip, OverdueGroup, CurrentTaskCard, TaskList, TaskRow, AddTask, ParkingNote, Button, Card, TextInput, EmptyState, Snackbar
  hooks/       usePersistentState, useSettings, useApplyTheme, useServiceWorker, useInstall, useTasks, useCurrentTask, useParking, useToday, useSnackbar, usePageTitle
  lib/         storage (ชั้นกลางเก็บข้อมูล), sanitize (กรองข้อมูลที่รูปร่างผิด), backup (สำรอง/กู้คืน), theme, download, install (สถานะติดตั้ง PWA), persist, tasks (ตรรกะงาน), parking (ตรรกะโน้ต), date (วันที่ไทย), id
  styles/      tokens.css (สี/ระยะ/ฟอนต์), global.css
  assets/      รูปที่ import ในโค้ด
```

## สถานะ

- [x] เฟส 0: เตรียมโปรเจกต์ (Vite + React, ESLint/Prettier, tokens, ฟอนต์ไทยโฮสต์เอง, ไอคอน, web.config)
- [x] เฟส 1: โครงหลัก (AppShell, Router 4 เส้นทาง + 404, storage, date, คอมโพเนนต์กลาง, ช่องจดเร็วใช้งานได้จริง)
- [x] เฟส 2: วางแผนรายวัน (แถบเลือกวัน, เพิ่ม/แก้/ติ๊ก/ลบ/จัดลำดับ/ย้ายวัน, เลิกทำ)
- [x] เฟส 3: งานค้าง (ทำวันนี้/เสร็จแล้ว/เลื่อนไป/ลบ/พับกลุ่ม) และการ์ด "ทำอยู่ตอนนี้" + ข้อความเมื่อทำครบ
- [x] เฟส 4: ที่พักความคิด (ทำวันนี้ / เลือกวัน / ลบ, เลิกทำทุกอย่าง)
- [x] เฟส 5: PWA (manifest, service worker, ติดตั้ง Android + คำแนะนำ iOS, ออฟไลน์, แจ้งอัปเดต, ขอที่เก็บข้อมูลถาวร)
- [x] เฟส 6: ใช้งานจริงทุกวัน (สำรอง/กู้คืน[รวม|แทนที่]/ล้างข้อมูล, โหมดมืด + สีไฮไลต์, ล้างงานเสร็จเก่าเกิน 30 วัน)
- [x] เฟส 7: ทดสอบและเตรียมเปิดใช้ (เบราว์เซอร์จริง, Lighthouse, หลายเขตเวลา, สคริปต์ตรวจหลัง deploy, คู่มือ deploy)
- [ ] **ที่เหลือ (ต้องทำเอง):** ทดสอบบนมือถือจริงตาม `TESTING.md` และ deploy ตาม `DEPLOY.md`
