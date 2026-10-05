/* ตรรกะของงาน (ฟังก์ชันล้วน ไม่แตะ storage/React) เพื่อทดสอบง่าย
   งาน = { id, title, status: 'todo' | 'done', date: 'YYYY-MM-DD', order, createdAt, doneAt }
   ทุกฟังก์ชันรับรายการงานทั้งหมด แล้วคืนรายการใหม่ (ไม่แก้ของเดิม) */

import { newId } from './id.js'

export const MAX_TITLE = 200

const isDone = (t) => t.status === 'done'

/** เรียงสำหรับแสดงผล: งานที่ยังไม่เสร็จตามลำดับ order ก่อน แล้วตามด้วยงานที่เสร็จตามเวลาที่ติ๊ก */
export function sortTasks(list) {
  const todo = list
    .filter((t) => !isDone(t))
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt))
  const done = list
    .filter(isDone)
    .sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? '') || a.order - b.order)
  return [...todo, ...done]
}

/** งานของวันหนึ่ง เรียงพร้อมแสดงผล */
export const tasksOnDate = (all, date) => sortTasks(all.filter((t) => t.date === date))

/** ลำดับถัดไปของวันนั้น (ต่อท้ายสุด) */
export function nextOrder(all, date) {
  const orders = all.filter((t) => t.date === date).map((t) => t.order)
  return orders.length ? Math.max(...orders) + 1 : 0
}

/** นับงานของแต่ละวัน -> { '2026-10-04': { total, done } } (ใช้บนแถบเลือกวัน) */
export function countsByDate(all, dates) {
  const counts = Object.fromEntries(dates.map((d) => [d, { total: 0, done: 0 }]))
  for (const t of all) {
    const c = counts[t.date]
    if (!c) continue
    c.total += 1
    if (isDone(t)) c.done += 1
  }
  return counts
}

const cleanTitle = (title) =>
  String(title ?? '')
    .trim()
    .slice(0, MAX_TITLE)

/** เพิ่มงาน คืน { tasks, task } (task = null ถ้าชื่อว่าง) */
export function addTask(all, { title, date, now = new Date() }) {
  const clean = cleanTitle(title)
  if (!clean) return { tasks: all, task: null }
  const task = {
    id: newId('t'),
    title: clean,
    status: 'todo',
    date,
    order: nextOrder(all, date),
    createdAt: now.toISOString(),
    doneAt: null,
  }
  return { tasks: [...all, task], task }
}

/** ติ๊กเสร็จ / ยกเลิกเสร็จ (กลับเข้าที่เดิมตาม order เดิม) */
export function toggleTask(all, id, now = new Date()) {
  return all.map((t) => {
    if (t.id !== id) return t
    return isDone(t)
      ? { ...t, status: 'todo', doneAt: null }
      : { ...t, status: 'done', doneAt: now.toISOString() }
  })
}

/** แก้ชื่อ (ชื่อว่างจะไม่เปลี่ยน) */
export function renameTask(all, id, title) {
  const clean = cleanTitle(title)
  if (!clean) return all
  return all.map((t) => (t.id === id ? { ...t, title: clean } : t))
}

export const removeTask = (all, id) => all.filter((t) => t.id !== id)

/** ใส่งานกลับ (ใช้ตอน "เลิกทำ"): ถ้ายังอยู่ให้แทนที่ด้วยสำเนาเดิม ถ้าถูกลบไปแล้วให้เพิ่มกลับ */
export function restoreTask(all, snapshot) {
  return all.some((t) => t.id === snapshot.id)
    ? all.map((t) => (t.id === snapshot.id ? snapshot : t))
    : [...all, snapshot]
}

/** ย้ายงานไปอีกวัน (ไปต่อท้ายลิสต์ของวันนั้น) */
export function moveTask(all, id, date) {
  const task = all.find((t) => t.id === id)
  if (!task || task.date === date) return all
  const order = nextOrder(all, date)
  return all.map((t) => (t.id === id ? { ...t, date, order } : t))
}

/** สลับลำดับกับงานข้างเคียงที่ยังไม่เสร็จของวันเดียวกัน (direction: -1 ขึ้น, +1 ลง) */
export function reorderTask(all, id, direction) {
  const task = all.find((t) => t.id === id)
  if (!task || isDone(task)) return all
  const todo = sortTasks(all.filter((t) => t.date === task.date && !isDone(t)))
  const from = todo.findIndex((t) => t.id === id)
  const to = from + direction
  if (to < 0 || to >= todo.length) return all
  const next = [...todo]
  ;[next[from], next[to]] = [next[to], next[from]]
  const order = new Map(next.map((t, i) => [t.id, i])) // เลขใหม่ 0..n-1 กันลำดับซ้ำ
  return all.map((t) => (order.has(t.id) ? { ...t, order: order.get(t.id) } : t))
}

/** งานที่ยังไม่เสร็จของวันนั้น (ใช้ตัดสินว่าปุ่มขึ้น/ลงกดได้ไหม) */
export const todoOnDate = (all, date) => tasksOnDate(all, date).filter((t) => !isDone(t))

/** งานค้าง: ยังไม่เสร็จและวันที่ก่อนวันนี้ เรียงจากค้างนานสุดก่อน */
export function overdueTasks(all, todayISO) {
  return all
    .filter((t) => !isDone(t) && t.date < todayISO)
    .sort((a, b) => a.date.localeCompare(b.date) || a.order - b.order)
}

/** งาน "ทำอยู่ตอนนี้" ของวันนี้
 *  ใช้งานที่ผู้ใช้เลือกไว้ (preferred = { id, date }) ถ้ายังใช้ได้ (ยังไม่เสร็จ ยังเป็นของวันนี้)
 *  ไม่งั้นใช้งานแรกที่ยังไม่เสร็จตามลำดับ -> พอกดเสร็จ งานถัดไปจึงขึ้นมาเอง */
export function pickCurrent(all, todayISO, preferred = null) {
  const todo = todoOnDate(all, todayISO)
  const chosen =
    preferred && preferred.date === todayISO ? todo.find((t) => t.id === preferred.id) : null
  return chosen ?? todo[0] ?? null
}

export const KEEP_DONE_DAYS = 30

/** ล้างงานที่เสร็จนานเกิน 30 วัน กันข้อมูลบวม (งานที่ยังไม่เสร็จไม่ถูกแตะเลย)
 *  ถ้าไม่มีอะไรต้องล้าง คืนรายการเดิมตัวเดิม (ผู้เรียกจะได้ไม่ต้องเขียนซ้ำ) */
export function pruneTasks(all, now = new Date(), keepDays = KEEP_DONE_DAYS) {
  const cutoff = now.getTime() - keepDays * 86_400_000
  const keep = all.filter((t) => {
    if (!isDone(t) || !t.doneAt) return true
    const doneAt = Date.parse(t.doneAt)
    return Number.isNaN(doneAt) || doneAt >= cutoff
  })
  return keep.length === all.length ? all : keep
}
