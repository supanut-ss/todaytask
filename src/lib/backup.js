/* สำรอง / กู้คืน / ล้างข้อมูล
   ไฟล์สำรองเป็น JSON: { app: 'todaytask', format: 1, exportedAt, data: { tasks, parking, settings, current } }
   - ข้อมูลในไฟล์ถือว่าไม่น่าเชื่อถือ: ตรวจและกรองทุกรายการก่อนใช้ (รายการเสียถูกข้าม ไม่ทำให้ทั้งไฟล์พัง)
   - กู้คืนได้ 2 แบบ: "รวม" (เพิ่มเฉพาะรายการที่ยังไม่มี ข้อมูลเดิมไม่หาย) และ "แทนที่" */

import { toISODate } from './date.js'
import { sanitizeCurrent, sanitizeList, sanitizeNote, sanitizeTask } from './sanitize.js'
import * as storage from './storage.js'
import { sanitizeSettings } from './theme.js'

export const BACKUP_APP = 'todaytask'
export const BACKUP_FORMAT = 1
export const BACKUP_KEYS = ['tasks', 'parking', 'settings', 'current']
export const MAX_BACKUP_CHARS = 10_000_000

// เดิมอยู่ที่นี่ ย้ายไป sanitize.js (ใช้ร่วมกับตอนอ่านข้อมูลจาก localStorage) ยังส่งออกต่อให้โค้ดเดิมใช้ได้
export { sanitizeCurrent, sanitizeNote, sanitizeTask }

const isTimestamp = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))

/** สร้างไฟล์สำรองจากข้อมูลปัจจุบัน */
export function buildBackup(data, now = new Date()) {
  return {
    app: BACKUP_APP,
    format: BACKUP_FORMAT,
    exportedAt: now.toISOString(),
    data: {
      tasks: data.tasks ?? [],
      parking: data.parking ?? [],
      settings: data.settings ?? null,
      current: data.current ?? null,
    },
  }
}

export const backupFileName = (now = new Date()) => `todaytask-backup-${toISODate(now)}.json`

/** อ่านไฟล์สำรอง คืน { ok: true, exportedAt, data, counts, skipped } หรือ { ok: false, error } */
export function parseBackup(text) {
  if (typeof text !== 'string' || text.length === 0) return { ok: false, error: 'ไฟล์ว่างเปล่า' }
  if (text.length > MAX_BACKUP_CHARS)
    return { ok: false, error: 'ไฟล์ใหญ่เกินไป ไม่น่าใช่ไฟล์สำรองของแอปนี้' }

  let obj
  try {
    obj = JSON.parse(text)
  } catch {
    return { ok: false, error: 'อ่านไฟล์ไม่ได้ ไฟล์นี้ไม่ใช่ไฟล์สำรอง (JSON)' }
  }
  if (!obj || typeof obj !== 'object' || obj.app !== BACKUP_APP) {
    return { ok: false, error: 'ไฟล์นี้ไม่ใช่ไฟล์สำรองของ "ทำวันนี้"' }
  }
  if (!Number.isInteger(obj.format) || obj.format < 1) {
    return { ok: false, error: 'ไฟล์สำรองไม่ถูกต้อง (ไม่พบเวอร์ชันของไฟล์)' }
  }
  if (obj.format > BACKUP_FORMAT) {
    return {
      ok: false,
      error: 'ไฟล์นี้มาจากแอปเวอร์ชันที่ใหม่กว่า ให้อัปเดตแอปก่อนแล้วลองอีกครั้ง',
    }
  }
  if (!obj.data || typeof obj.data !== 'object') {
    return { ok: false, error: 'ไฟล์สำรองไม่มีข้อมูล' }
  }

  const tasks = sanitizeList(obj.data.tasks, sanitizeTask)
  const notes = sanitizeList(obj.data.parking, sanitizeNote)
  return {
    ok: true,
    exportedAt: isTimestamp(obj.exportedAt) ? obj.exportedAt : null,
    data: {
      tasks: tasks.items,
      parking: notes.items,
      settings: obj.data.settings == null ? null : sanitizeSettings(obj.data.settings),
      current: sanitizeCurrent(obj.data.current),
    },
    counts: { tasks: tasks.items.length, parking: notes.items.length },
    skipped: tasks.skipped + notes.skipped,
  }
}

const addMissing = (current, incoming) => {
  const have = new Set(current.map((x) => x.id))
  return [...current, ...incoming.filter((x) => !have.has(x.id))]
}

/** รวม: ข้อมูลเดิมอยู่ครบ เพิ่มเฉพาะรายการที่ id ยังไม่มี (การตั้งค่าและงานปัจจุบันคงเดิม) */
export function mergeData(current, incoming) {
  return {
    tasks: addMissing(current.tasks, incoming.tasks),
    parking: addMissing(current.parking, incoming.parking),
    settings: current.settings,
    current: current.current,
  }
}

/** แทนที่: ใช้ตามไฟล์ (ถ้าไฟล์ไม่มีการตั้งค่า ให้คงค่าเดิมไว้) */
export function replaceData(current, incoming) {
  return {
    tasks: incoming.tasks,
    parking: incoming.parking,
    settings: incoming.settings ?? current.settings,
    current: incoming.current,
  }
}

/** อ่านข้อมูลทั้งหมดของแอปจาก storage */
export function readAll() {
  return {
    tasks: storage.read('tasks', []),
    parking: storage.read('parking', []),
    settings: storage.read('settings', null),
    current: storage.read('current', null),
  }
}

/** เขียนข้อมูลทั้งชุดแบบตรงตัว (null = ลบ key นั้นทิ้ง) ใช้ทั้งตอนกู้คืนและตอน "เลิกทำ" */
export function writeAll(data) {
  storage.write('tasks', data.tasks ?? [])
  storage.write('parking', data.parking ?? [])
  for (const key of ['settings', 'current']) {
    if (data[key] == null) storage.remove(key)
    else storage.write(key, data[key])
  }
}

/** ล้างข้อมูลของผู้ใช้ทั้งหมด (ไม่แตะค่าชั่วคราวของหน้าจอ เช่น ปิดแบนเนอร์ติดตั้ง) */
export function clearAll() {
  for (const key of BACKUP_KEYS) storage.remove(key)
}

export const isEmptyData = (data) => data.tasks.length === 0 && data.parking.length === 0
