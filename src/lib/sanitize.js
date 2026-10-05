/* ตรวจและซ่อมข้อมูลที่อ่านมาจากที่ไม่น่าเชื่อถือ (localStorage ที่ถูกแก้/เสีย, ไฟล์สำรอง)
   หลักการ: รายการที่ใช้ไม่ได้ถูกข้าม ไม่ให้ทำให้ทั้งแอปพัง */

import { isValidISODate } from './date.js'
import { MAX_TITLE } from './tasks.js'

const isTimestamp = (v) => typeof v === 'string' && !Number.isNaN(Date.parse(v))
const cleanText = (v) => (typeof v === 'string' ? v.trim().slice(0, MAX_TITLE) : '')
const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 64

/** คืนงานที่ถูกต้อง หรือ null ถ้าใช้ไม่ได้ */
export function sanitizeTask(raw) {
  if (!raw || typeof raw !== 'object' || !isId(raw.id)) return null
  const title = cleanText(raw.title)
  if (!title || !isValidISODate(raw.date)) return null
  const done = raw.status === 'done'
  return {
    id: raw.id,
    title,
    status: done ? 'done' : 'todo',
    date: raw.date,
    order: Number.isFinite(raw.order) ? raw.order : 0,
    createdAt: isTimestamp(raw.createdAt) ? raw.createdAt : new Date(0).toISOString(),
    doneAt: done && isTimestamp(raw.doneAt) ? raw.doneAt : null,
  }
}

export function sanitizeNote(raw) {
  if (!raw || typeof raw !== 'object' || !isId(raw.id)) return null
  const text = cleanText(raw.text)
  if (!text) return null
  return {
    id: raw.id,
    text,
    createdAt: isTimestamp(raw.createdAt) ? raw.createdAt : new Date(0).toISOString(),
  }
}

export function sanitizeCurrent(raw) {
  return raw && typeof raw === 'object' && isId(raw.id) && isValidISODate(raw.date)
    ? { id: raw.id, date: raw.date }
    : null
}

/** กรองรายการ: คืน { items, skipped } (ตัดรายการเสียและ id ซ้ำ; ไม่ใช่ array = ว่าง) */
export function sanitizeList(raw, sanitizeOne) {
  const list = Array.isArray(raw) ? raw : []
  const seen = new Set()
  const items = []
  for (const entry of list) {
    const item = sanitizeOne(entry)
    if (!item || seen.has(item.id)) continue
    seen.add(item.id)
    items.push(item)
  }
  return { items, skipped: list.length - items.length }
}

export const normalizeTasks = (raw) => sanitizeList(raw, sanitizeTask).items
export const normalizeNotes = (raw) => sanitizeList(raw, sanitizeNote).items
