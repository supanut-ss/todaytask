/* สถานะการติดตั้งแอป (PWA)
   - Android/Chrome/Edge: เบราว์เซอร์ส่งอีเวนต์ beforeinstallprompt มา เราเก็บไว้แล้วให้ผู้ใช้กดปุ่มเอง
   - iOS: ไม่มีอีเวนต์นี้ ต้องแนะนำให้ผู้ใช้เพิ่มไปหน้าจอโฮมเองจากปุ่มแชร์ของ Safari
   อีเวนต์อาจมาก่อน React เริ่มทำงาน จึงต้องเรียก initInstall() ตั้งแต่ main.jsx */

const listeners = new Set()
let deferred = null
let initialized = false

/** เปิดอยู่ในโหมดแอปที่ติดตั้งแล้วหรือไม่ */
export function isStandalone(win = globalThis.window) {
  if (!win) return false
  return Boolean(
    win.matchMedia?.('(display-mode: standalone)')?.matches || win.navigator?.standalone === true,
  )
}

/** iPhone / iPad (รวม iPadOS ที่แกล้งบอกว่าเป็น Mac) */
export function detectIOS(nav = globalThis.navigator) {
  if (!nav) return false
  if (/iPhone|iPad|iPod/.test(nav.userAgent ?? '')) return true
  return nav.platform === 'MacIntel' && (nav.maxTouchPoints ?? 0) > 1
}

let snapshot = { canPrompt: false, installed: isStandalone() }

function refresh() {
  snapshot = { canPrompt: deferred !== null, installed: snapshot.installed || isStandalone() }
  listeners.forEach((cb) => cb())
}

/** เรียกครั้งเดียวตอนเริ่มแอป */
export function initInstall(win = globalThis.window) {
  if (!win || initialized) return
  initialized = true
  win.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault() // ไม่ให้เบราว์เซอร์โชว์แถบของมันเอง เราจะโชว์ปุ่มของเราแทน
    deferred = event
    refresh()
  })
  win.addEventListener('appinstalled', () => {
    deferred = null
    snapshot = { canPrompt: false, installed: true }
    refresh()
  })
}

export const subscribeInstall = (callback) => {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/** snapshot คงที่จนกว่าสถานะจะเปลี่ยน (จำเป็นต่อ useSyncExternalStore) */
export const getInstallSnapshot = () => snapshot

/** แสดงกล่องติดตั้งของเบราว์เซอร์ คืน 'accepted' | 'dismissed' | 'unavailable' */
export async function promptInstall() {
  if (!deferred) return 'unavailable'
  const event = deferred
  deferred = null // อีเวนต์ใช้ได้ครั้งเดียว
  refresh()
  await event.prompt()
  const choice = await event.userChoice
  return choice?.outcome ?? 'dismissed'
}

/** ใช้ในเทสต์เท่านั้น: ล้างสถานะกลับเป็นเริ่มต้น */
export function resetInstallForTests() {
  deferred = null
  snapshot = { canPrompt: false, installed: isStandalone() }
  listeners.forEach((cb) => cb())
}
