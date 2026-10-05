/* ฟังก์ชันวันที่ทั้งหมดของแอปอยู่ที่นี่ที่เดียว
   - ใช้เวลาท้องถิ่นของเครื่อง (ผู้ใช้ไทย = Asia/Bangkok)
   - วันที่เก็บเป็นข้อความ "YYYY-MM-DD" เสมอ เพื่อเปรียบเทียบ/เรียงลำดับด้วยข้อความได้ */

const DAY_FULL = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
const DAY_SHORT = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']
const MONTH_FULL = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const MONTH_SHORT = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
]

const pad = (n) => String(n).padStart(2, '0')

/** Date -> "YYYY-MM-DD" (เวลาท้องถิ่น) */
export function toISODate(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** "YYYY-MM-DD" -> Date (เที่ยงคืนท้องถิ่น) หรือ null ถ้าไม่ใช่วันที่ที่มีจริง */
export function parseISODate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso))
  if (!m) return null
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  const date = new Date(y, mo - 1, d)
  const valid = date.getFullYear() === y && date.getMonth() === mo - 1 && date.getDate() === d
  return valid ? date : null
}

export const isValidISODate = (iso) => parseISODate(iso) !== null

/** วันนี้เป็นข้อความ "YYYY-MM-DD" */
export const today = (now = new Date()) => toISODate(now)

/** บวก/ลบวัน (n เป็นลบได้) */
export function addDays(iso, n) {
  const date = parseISODate(iso)
  if (!date) throw new RangeError(`วันที่ไม่ถูกต้อง: ${iso}`)
  date.setDate(date.getDate() + n)
  return toISODate(date)
}

/** จำนวนวันจาก fromISO ไป toISO (toISO หลัง fromISO = บวก) */
export function daysBetween(fromISO, toISO) {
  const a = parseISODate(fromISO)
  const b = parseISODate(toISO)
  if (!a || !b) throw new RangeError('วันที่ไม่ถูกต้อง')
  // ใช้ UTC กันปัญหาเปลี่ยนเวลาเมื่อบวกวัน
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round((ub - ua) / 86400000)
}

/** วันในสัปดาห์ 0 = อาทิตย์ */
export const weekdayIndex = (iso) => parseISODate(iso).getDay()
export const weekdayShort = (iso) => DAY_SHORT[weekdayIndex(iso)]
export const weekdayFull = (iso) => DAY_FULL[weekdayIndex(iso)]
export const dayOfMonth = (iso) => parseISODate(iso).getDate()

/** "อาทิตย์ 4 ตุลาคม" (withYear: เติมปี พ.ศ. ต่อท้าย) */
export function formatThai(iso, { withYear = false } = {}) {
  const date = parseISODate(iso)
  if (!date) return ''
  const base = `${DAY_FULL[date.getDay()]} ${date.getDate()} ${MONTH_FULL[date.getMonth()]}`
  return withYear ? `${base} ${date.getFullYear() + 543}` : base
}

/** รายการวันต่อเนื่อง count วัน เริ่มที่ startISO (ใช้กับแถบเลือกวัน) */
export function daysFrom(startISO, count = 7) {
  return Array.from({ length: count }, (_, i) => addDays(startISO, i))
}

/** ป้ายสั้นเทียบกับวันนี้: วันนี้ / พรุ่งนี้ / เมื่อวาน / ไม่งั้นเป็นวันที่ */
export function relativeLabel(iso, todayISO = today()) {
  const diff = daysBetween(todayISO, iso)
  if (diff === 0) return 'วันนี้'
  if (diff === 1) return 'พรุ่งนี้'
  if (diff === -1) return 'เมื่อวาน'
  return formatThai(iso)
}

/** "ค้าง 2 วัน" สำหรับงานที่ค้างมาจากวันก่อน */
export function overdueLabel(dateISO, todayISO = today()) {
  const days = daysBetween(dateISO, todayISO)
  return days > 0 ? `ค้าง ${days} วัน` : ''
}

/** มิลลิวินาทีถึงเที่ยงคืนถัดไป (ใช้ตั้งเวลาให้ "วันนี้" เปลี่ยนเอง) */
export function msUntilNextMidnight(now = new Date()) {
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
  return next.getTime() - now.getTime()
}

/** เวลาแบบ "10:42" จาก ISO timestamp (เวลาท้องถิ่น) */
export function formatTime(isoTimestamp) {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return ''
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** วันแรกของแถบเลือกวัน (count วัน): ถ้าวันที่เลือกอยู่ในช่วงนับจากวันนี้ ใช้วันนี้เป็นจุดเริ่ม
 *  ไม่งั้น (ไกลไปข้างหน้า/ย้อนหลัง) ให้วันที่เลือกอยู่ตรงกลางแถบ */
export function stripStart(selectedISO, todayISO, count = 7) {
  const inDefaultRange = selectedISO >= todayISO && selectedISO <= addDays(todayISO, count - 1)
  return inDefaultRange ? todayISO : addDays(selectedISO, -Math.floor(count / 2))
}

/** ป้ายเวลาที่จดโน้ต: "วันนี้ 10:42" / "เมื่อวาน 10:42" / "3 ต.ค. 10:42" */
export function formatNoteTime(isoTimestamp, todayISO = today()) {
  const d = new Date(isoTimestamp)
  if (Number.isNaN(d.getTime())) return ''
  const day = toISODate(d)
  const time = formatTime(isoTimestamp)
  if (day === todayISO) return `วันนี้ ${time}`
  if (day === addDays(todayISO, -1)) return `เมื่อวาน ${time}`
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${time}`
}
