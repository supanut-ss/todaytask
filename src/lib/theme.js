/* ธีมและสีไฮไลต์: ตั้งเป็นแอตทริบิวต์บน <html> ให้ tokens.css ทำงานต่อ
   ผู้ใช้เลือก theme = auto | light | dark   "auto" แปลงเป็น light/dark ตามเครื่องที่นี่ (JS)
   เพื่อให้ CSS มีชุดสีมืดชุดเดียว ไม่ต้องเขียนซ้ำใน media query */

export const THEMES = ['auto', 'light', 'dark']
export const ACCENTS = ['butter', 'mint', 'peach']
export const DEFAULT_SETTINGS = Object.freeze({ theme: 'auto', accent: 'butter' })

/** ตรวจค่าที่อ่านจาก storage/ไฟล์สำรอง: ค่าที่ไม่รู้จักกลับเป็นค่าเริ่มต้น */
export function sanitizeSettings(raw) {
  const r = raw && typeof raw === 'object' ? raw : {}
  return {
    theme: THEMES.includes(r.theme) ? r.theme : DEFAULT_SETTINGS.theme,
    accent: ACCENTS.includes(r.accent) ? r.accent : DEFAULT_SETTINGS.accent,
  }
}

/** auto -> light/dark ตามเครื่อง */
export const resolveTheme = (theme, prefersDark) =>
  theme === 'dark' || (theme === 'auto' && prefersDark) ? 'dark' : 'light'

export const prefersDarkQuery = (win = globalThis.window) =>
  win?.matchMedia?.('(prefers-color-scheme: dark)') ?? null

/** ใส่ธีมลงบน <html> และปรับสีแถบสถานะของเบราว์เซอร์ให้ตรงกับพื้นหลังใหม่ */
export function applyTheme(settings, win = globalThis.window) {
  if (!win) return
  const { theme, accent } = sanitizeSettings(settings)
  const root = win.document.documentElement
  const dark = resolveTheme(theme, prefersDarkQuery(win)?.matches ?? false) === 'dark'

  if (dark) root.dataset.theme = 'dark'
  else delete root.dataset.theme

  if (accent === 'butter') delete root.dataset.accent
  else root.dataset.accent = accent

  const bg = win.getComputedStyle(root).getPropertyValue('--bg').trim()
  const meta = win.document.querySelector('meta[name="theme-color"]')
  if (meta && bg) meta.setAttribute('content', bg)
}
