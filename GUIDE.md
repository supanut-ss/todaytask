# TodayTask (ทำวันนี้) — Overview & User Guide / รายละเอียดและคู่มือการใช้งาน

**English** · [ภาษาไทย](#ภาษาไทย)

---

## English

### What is it?

TodayTask is a daily planner that helps you focus on **one task at a time**. It is a Progressive Web App (PWA): open it in a browser, or install it to your home screen, and it keeps working offline.

- No account, no server database. Everything is stored **on your device** (browser `localStorage`).
- Thai-first interface, light/dark themes, mobile-friendly.
- Live at: `https://drivetodev.online/todaytask/`

### Main features

| Feature | What it does |
| --- | --- |
| Day planner | Pick any day from the week strip and manage its tasks. |
| Tasks | Add, edit, tick done, delete, reorder, and move a task to another day. |
| Current task | Mark one task as "doing now"; it appears as a card at the top. A message shows when everything is done. |
| Overdue group | Unfinished tasks from earlier days are grouped together. Do them today, mark done, reschedule, or delete. The group can be collapsed. |
| Parking lot | Quick capture for ideas that interrupt you. Schedule them later (today or another day) or delete them. |
| Undo | Most destructive actions show a snackbar with an undo button. |
| Themes | Auto / light / dark, plus a highlight colour for finished tasks (yellow, mint, peach). |
| Backup & restore | Export your data to a JSON file and import it back (merge or replace). |
| PWA | Installable, works offline, shows a banner when a new version is available. |

### How to use

**1. Plan your day**
1. Open the app. Today is selected in the week strip at the top; tap another day to plan it. The date picker lets you jump to any date.
2. Tap **Add task**, type a title and save.
3. Tap the circle on the left of a task to mark it done (tap again to undo).
4. Tap the `…` button on a task to open its options: edit, do this now, move up/down, move to another day, delete.

**2. Focus on one task**
- Choose "do this now" on a task. It becomes the **current task** card. Finish it, then pick the next one.

**3. Handle overdue tasks**
- Tasks left from previous days appear in a peach "overdue" group. For each one you can do it today, mark it done, push it to another day, or delete it.

**4. Capture interruptions (parking lot)**
- Type into the box at the bottom of the screen ("something came up? note it first") and press the arrow. Your focus stays on the current task.
- Open **Parking lot** later to schedule each note for today or another day, or delete it.

**5. Settings**
- Open the sliders icon at the top right.
  - **Theme:** auto, light or dark.
  - **Highlight colour** for completed tasks.
  - **Your data:** download a backup file, restore from a file (merge with existing data or replace it), or erase everything on this device.

**6. Install the app**
- **Android / desktop Chrome:** use the install prompt shown in the app (or the browser's *Install* option).
- **iPhone / iPad (Safari):** tap *Share* → *Add to Home Screen*.
- After the first load the app works offline. When a new version is released, a banner appears; tap it to update.

### Good to know

- Data lives only in this browser on this device. Clearing site data, using a private window or switching devices means a different (empty) list — **make a backup regularly**.
- Completed tasks older than 30 days are cleaned up automatically.
- The app asks the browser for persistent storage so your data is less likely to be evicted.
- Backup file format: `{ app: "todaytask", format: 1, exportedAt, data: { tasks, parking, settings, current } }`.

### For developers

```bash
npm install        # install dependencies
npm run dev        # dev server at http://localhost:5173 (no service worker)
npm run build      # production build into dist/
npm run preview    # serve the production build
npm run check      # lint + unit tests + build
npm run test:e2e   # real-browser tests (needs Chromium; set CHROMIUM_PATH to use installed Chrome)
npm run verify -- <URL>   # post-deploy checks
```

Stack: React 19, Vite, React Router, vite-plugin-pwa, Vitest, Playwright. Hosting: Plesk on Windows (IIS) — see `DEPLOY.md`; testing notes — see `TESTING.md`; design decisions — see `todaytask-plan.md`.

---

## ภาษาไทย

### แอปนี้คืออะไร

ทำวันนี้ คือแอปวางแผนงานรายวันที่ช่วยให้คุณโฟกัส **ทีละงาน** เป็น Progressive Web App (PWA) เปิดในเบราว์เซอร์ หรือติดตั้งลงหน้าจอหลักได้ และใช้งานออฟไลน์ได้

- ไม่ต้องสมัครสมาชิก ไม่มีฐานข้อมูลบนเซิร์ฟเวอร์ ข้อมูลทั้งหมดเก็บ **ในเครื่องของคุณ** (`localStorage` ของเบราว์เซอร์)
- หน้าจอภาษาไทย มีโหมดสว่าง/มืด ใช้สะดวกบนมือถือ
- เปิดใช้ที่: `https://drivetodev.online/todaytask/`

### ฟีเจอร์หลัก

| ฟีเจอร์ | ใช้ทำอะไร |
| --- | --- |
| วางแผนรายวัน | เลือกวันจากแถบวันของสัปดาห์ แล้วจัดการงานของวันนั้น |
| งาน | เพิ่ม แก้ไข ติ๊กเสร็จ ลบ จัดลำดับ และย้ายไปวันอื่น |
| งานที่ทำอยู่ตอนนี้ | เลือกงานเดียวเป็น "ทำอยู่ตอนนี้" แสดงเป็นการ์ดด้านบน เมื่อทำครบจะมีข้อความแจ้ง |
| งานค้าง | งานที่ยังไม่เสร็จจากวันก่อนจะรวมเป็นกลุ่ม ทำวันนี้ ติ๊กเสร็จ เลื่อนวัน หรือลบได้ พับกลุ่มได้ |
| ที่พักความคิด | จดเรื่องที่แทรกเข้ามาไว้ก่อน แล้วค่อยเลือกวันทำหรือลบ |
| เลิกทำ | การกระทำส่วนใหญ่ที่ลบ/เปลี่ยนข้อมูลจะมีแถบแจ้งพร้อมปุ่มเลิกทำ |
| ธีม | อัตโนมัติ / สว่าง / มืด และสีไฮไลต์งานที่เสร็จ (เหลือง มิ้นต์ พีช) |
| สำรอง/กู้คืนข้อมูล | ดาวน์โหลดข้อมูลเป็นไฟล์ JSON และนำกลับเข้ามาได้ (รวมกับของเดิม หรือแทนที่) |
| PWA | ติดตั้งได้ ใช้ออฟไลน์ได้ และมีแบนเนอร์แจ้งเมื่อมีเวอร์ชันใหม่ |

### วิธีใช้งาน

**1. วางแผนวันนี้**
1. เปิดแอป วันนี้จะถูกเลือกในแถบวันด้านบน แตะวันอื่นเพื่อวางแผนล่วงหน้า หรือใช้ช่องเลือกวันที่เพื่อไปวันใดก็ได้
2. กด **เพิ่มงาน** พิมพ์ชื่องานแล้วบันทึก
3. แตะวงกลมหน้างานเพื่อติ๊กว่าเสร็จ (แตะอีกครั้งเพื่อยกเลิก)
4. กดปุ่ม `…` ที่งานเพื่อดูตัวเลือก: แก้ไข ทำอันนี้ตอนนี้ เลื่อนขึ้น/ลง ย้ายไปวันอื่น ลบ

**2. โฟกัสทีละงาน**
- เลือก "ทำอันนี้ตอนนี้" ที่งานที่ต้องการ งานนั้นจะขึ้นเป็นการ์ด **ทำอยู่ตอนนี้** ทำให้เสร็จแล้วค่อยเลือกงานถัดไป

**2.1 จัดการงานค้าง**
- งานที่ค้างจากวันก่อนจะอยู่ในกลุ่มสีพีช "ค้างจากก่อนหน้า" แต่ละงานเลือกได้ว่าจะทำวันนี้ ติ๊กเสร็จ เลื่อนไปวันอื่น หรือลบ

**3. จดเรื่องที่แทรกเข้ามา (ที่พักความคิด)**
- พิมพ์ในช่องล่างจอ ("มีอะไรแทรกเข้ามา? จดไว้ก่อน") แล้วกดปุ่มลูกศร คุณจะยังโฟกัสกับงานปัจจุบันได้
- ไปที่หน้า **ที่พักความคิด** ภายหลัง เพื่อเลือกทำวันนี้ เลือกวันอื่น หรือลบโน้ต

**4. ตั้งค่า**
- กดไอคอนปรับแต่งมุมขวาบน
  - **ธีม:** อัตโนมัติ สว่าง หรือมืด
  - **สีไฮไลต์** ของงานที่เสร็จแล้ว
  - **ข้อมูลของคุณ:** ดาวน์โหลดไฟล์สำรอง กู้คืนจากไฟล์ (รวมกับข้อมูลเดิม หรือแทนที่) หรือล้างข้อมูลทั้งหมดในเครื่องนี้

**5. ติดตั้งแอป**
- **Android / Chrome บนคอมพิวเตอร์:** กดปุ่มติดตั้งที่แอปแสดง (หรือเมนู *ติดตั้ง* ของเบราว์เซอร์)
- **iPhone / iPad (Safari):** กด *แชร์* → *เพิ่มไปยังหน้าจอโฮม*
- หลังเปิดครั้งแรก แอปใช้ออฟไลน์ได้ เมื่อมีเวอร์ชันใหม่จะมีแบนเนอร์ขึ้น กดเพื่ออัปเดต

### ควรรู้

- ข้อมูลอยู่ในเบราว์เซอร์ของเครื่องนี้เท่านั้น ถ้าล้างข้อมูลเว็บไซต์ ใช้หน้าต่างส่วนตัว หรือเปลี่ยนเครื่อง จะเห็นรายการว่างเปล่า — **ควรสำรองข้อมูลเป็นประจำ**
- งานที่เสร็จแล้วเกิน 30 วันจะถูกล้างอัตโนมัติ
- แอปขอให้เบราว์เซอร์เก็บข้อมูลแบบถาวร เพื่อลดโอกาสที่ข้อมูลถูกลบเอง
- รูปแบบไฟล์สำรอง: `{ app: "todaytask", format: 1, exportedAt, data: { tasks, parking, settings, current } }`

### สำหรับนักพัฒนา

```bash
npm install        # ติดตั้งแพ็กเกจ
npm run dev        # รันตอนพัฒนาที่ http://localhost:5173 (ไม่มี service worker)
npm run build      # build ไปที่ dist/
npm run preview    # ลองเปิดไฟล์ที่ build แล้ว
npm run check      # lint + เทสต์ + build
npm run test:e2e   # เทสต์ในเบราว์เซอร์จริง (ต้องมี Chromium หรือกำหนด CHROMIUM_PATH เป็น Chrome ที่ติดตั้งไว้)
npm run verify -- <URL>   # ตรวจเซิร์ฟเวอร์หลัง deploy
```

เทคโนโลยี: React 19, Vite, React Router, vite-plugin-pwa, Vitest, Playwright โฮสต์: Plesk บน Windows (IIS) — ดู `DEPLOY.md` วิธีทดสอบดู `TESTING.md` การตัดสินใจออกแบบดู `todaytask-plan.md`
