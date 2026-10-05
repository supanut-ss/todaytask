/* ชั้นกลางสำหรับเก็บข้อมูล (storage adapter)
   - ทุกส่วนของแอปเรียกผ่านที่นี่ ห้ามเรียก localStorage ตรงๆ
     วันหน้าจะเปลี่ยนที่เก็บ (เช่น ซิงค์ข้ามเครื่อง) แก้ที่ไฟล์นี้ที่เดียว
   - key รูปแบบ  tw:v1:<ชื่อ>   (v1 = เวอร์ชันโครงข้อมูล ใช้ทำ migration ภายหลัง)
   - ถ้า localStorage ใช้ไม่ได้ (โหมด Private/ถูกปิด/เต็ม) จะเก็บในหน่วยความจำชั่วคราว
     เพื่อให้แอปยังใช้งานได้ แล้วแจ้งผู้ใช้ผ่าน isPersistent() */

export const STORAGE_VERSION = 1
export const PREFIX = `tw:v${STORAGE_VERSION}:`

const listeners = new Map() // ชื่อ -> Set ของ callback
const statusListeners = new Set()
const memory = new Map() // ชื่อ -> raw (ใช้เมื่อเขียนลง localStorage ไม่ได้)
const cache = new Map() // ชื่อ -> { raw, value } ให้ read() คืนค่าเดิมเมื่อข้อมูลไม่เปลี่ยน

let persistent = null // null = ยังไม่ตรวจ

function probe() {
  try {
    const k = `${PREFIX}__probe`
    window.localStorage.setItem(k, '1')
    window.localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

/** บันทึกลงเครื่องได้จริงหรือไม่ (false = ข้อมูลจะหายเมื่อปิดหน้า) */
export function isPersistent() {
  if (persistent === null) persistent = typeof window !== 'undefined' && probe()
  return persistent
}

export function subscribeStatus(callback) {
  statusListeners.add(callback)
  return () => statusListeners.delete(callback)
}

function markNotPersistent() {
  if (persistent === false) return
  persistent = false
  statusListeners.forEach((cb) => cb())
}

function readRaw(name) {
  if (memory.has(name)) return memory.get(name)
  if (!isPersistent()) return null
  try {
    return window.localStorage.getItem(PREFIX + name)
  } catch {
    return null
  }
}

/** อ่านค่า (คืน fallback ถ้ายังไม่มี) ส่ง fallback เป็นค่าคงที่เดียวกันทุกครั้ง */
export function read(name, fallback = null) {
  const raw = readRaw(name)
  if (raw === null) return fallback
  const hit = cache.get(name)
  if (hit && hit.raw === raw) return hit.value
  let value
  try {
    value = JSON.parse(raw)
  } catch {
    value = fallback
  }
  cache.set(name, { raw, value })
  return value
}

function emit(name) {
  listeners.get(name)?.forEach((cb) => cb())
}

/** เขียนค่า คืน true ถ้าบันทึกลงเครื่องสำเร็จ */
export function write(name, value) {
  const raw = JSON.stringify(value)
  let saved = false
  if (isPersistent()) {
    try {
      window.localStorage.setItem(PREFIX + name, raw)
      memory.delete(name)
      saved = true
    } catch {
      markNotPersistent() // เต็มหรือถูกปิดระหว่างใช้งาน
    }
  }
  if (!saved) memory.set(name, raw)
  emit(name)
  return saved
}

export function remove(name) {
  memory.delete(name)
  cache.delete(name)
  try {
    if (isPersistent()) window.localStorage.removeItem(PREFIX + name)
  } catch {
    /* ไม่มีอะไรต้องทำ */
  }
  emit(name)
}

/** รายชื่อข้อมูลทั้งหมดที่แอปเก็บไว้ (ใช้ตอนสำรองข้อมูล) */
export function keys() {
  const names = new Set(memory.keys())
  try {
    if (isPersistent()) {
      for (let i = 0; i < window.localStorage.length; i++) {
        const k = window.localStorage.key(i)
        if (k && k.startsWith(PREFIX) && !k.endsWith('__probe')) names.add(k.slice(PREFIX.length))
      }
    }
  } catch {
    /* ข้าม */
  }
  return [...names]
}

/** ติดตามการเปลี่ยนแปลงของข้อมูลชื่อหนึ่ง คืนฟังก์ชันยกเลิก */
export function subscribe(name, callback) {
  if (!listeners.has(name)) listeners.set(name, new Set())
  listeners.get(name).add(callback)
  return () => listeners.get(name)?.delete(callback)
}

/* แท็บอื่นแก้ข้อมูล -> แจ้งให้หน้านี้อัปเดตตาม */
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (event) => {
    if (event.key === null) {
      listeners.forEach((_, name) => emit(name)) // ล้างข้อมูลทั้งหมด
    } else if (event.key.startsWith(PREFIX)) {
      emit(event.key.slice(PREFIX.length))
    }
  })
}
