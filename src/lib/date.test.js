import { describe, expect, it } from 'vitest'
import {
  addDays,
  daysBetween,
  daysFrom,
  formatNoteTime,
  formatThai,
  formatTime,
  isValidISODate,
  msUntilNextMidnight,
  overdueLabel,
  parseISODate,
  relativeLabel,
  stripStart,
  toISODate,
  weekdayShort,
} from './date.js'

describe('date', () => {
  it('แปลง Date <-> ข้อความ YYYY-MM-DD ด้วยเวลาท้องถิ่น', () => {
    expect(toISODate(new Date(2026, 9, 4, 23, 59))).toBe('2026-10-04')
    expect(toISODate(parseISODate('2026-10-04'))).toBe('2026-10-04')
  })

  it('ปฏิเสธวันที่ที่ไม่มีจริง', () => {
    expect(isValidISODate('2026-02-30')).toBe(false)
    expect(isValidISODate('2026-13-01')).toBe(false)
    expect(isValidISODate('2026-1-5')).toBe(false)
    expect(isValidISODate('abc')).toBe(false)
    expect(isValidISODate('2028-02-29')).toBe(true) // ปีอธิกสุรทิน
  })

  it('บวกลบวันข้ามเดือนและข้ามปี', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2026-10-04', 0)).toBe('2026-10-04')
  })

  it('นับจำนวนวันระหว่างสองวัน', () => {
    expect(daysBetween('2026-10-02', '2026-10-04')).toBe(2)
    expect(daysBetween('2026-10-04', '2026-10-02')).toBe(-2)
    expect(daysBetween('2026-12-31', '2027-01-01')).toBe(1)
  })

  it('วันในสัปดาห์และการจัดรูปแบบภาษาไทย', () => {
    // 4 ต.ค. 2026 เป็นวันอาทิตย์
    expect(weekdayShort('2026-10-04')).toBe('อา')
    expect(formatThai('2026-10-04')).toBe('อาทิตย์ 4 ตุลาคม')
    expect(formatThai('2026-10-04', { withYear: true })).toBe('อาทิตย์ 4 ตุลาคม 2569')
  })

  it('สร้างรายการ 7 วันต่อเนื่อง', () => {
    expect(daysFrom('2026-10-04', 7)).toEqual([
      '2026-10-04',
      '2026-10-05',
      '2026-10-06',
      '2026-10-07',
      '2026-10-08',
      '2026-10-09',
      '2026-10-10',
    ])
  })

  it('ป้ายวันสัมพัทธ์และป้ายงานค้าง', () => {
    expect(relativeLabel('2026-10-04', '2026-10-04')).toBe('วันนี้')
    expect(relativeLabel('2026-10-05', '2026-10-04')).toBe('พรุ่งนี้')
    expect(relativeLabel('2026-10-03', '2026-10-04')).toBe('เมื่อวาน')
    expect(relativeLabel('2026-10-09', '2026-10-04')).toBe('ศุกร์ 9 ตุลาคม')
    expect(overdueLabel('2026-10-02', '2026-10-04')).toBe('ค้าง 2 วัน')
    expect(overdueLabel('2026-10-04', '2026-10-04')).toBe('')
  })

  it('คำนวณเวลาถึงเที่ยงคืน', () => {
    expect(msUntilNextMidnight(new Date(2026, 9, 4, 23, 59, 0))).toBe(60_000)
    expect(msUntilNextMidnight(new Date(2026, 9, 4, 0, 0, 0))).toBe(86_400_000)
  })

  it('จัดรูปแบบเวลา', () => {
    const d = new Date(2026, 9, 4, 9, 5)
    expect(formatTime(d.toISOString())).toBe('09:05')
    expect(formatTime('ไม่ใช่วันที่')).toBe('')
  })

  it('วันแรกของแถบเลือกวัน', () => {
    expect(stripStart('2026-10-04', '2026-10-04')).toBe('2026-10-04') // วันนี้
    expect(stripStart('2026-10-10', '2026-10-04')).toBe('2026-10-04') // วันที่ 7 ของแถบ
    expect(stripStart('2026-10-11', '2026-10-04')).toBe('2026-10-08') // เลยแถบ -> เลือกอยู่กลาง
    expect(stripStart('2026-10-03', '2026-10-04')).toBe('2026-09-30') // ย้อนหลัง -> เลือกอยู่กลาง
  })

  it('ป้ายเวลาที่จดโน้ต', () => {
    const at = (y, m, d, h, min) => new Date(y, m - 1, d, h, min).toISOString()
    expect(formatNoteTime(at(2026, 10, 4, 10, 42), '2026-10-04')).toBe('วันนี้ 10:42')
    expect(formatNoteTime(at(2026, 10, 3, 9, 5), '2026-10-04')).toBe('เมื่อวาน 09:05')
    expect(formatNoteTime(at(2026, 9, 28, 18, 0), '2026-10-04')).toBe('28 ก.ย. 18:00')
    expect(formatNoteTime('ไม่ใช่วันที่')).toBe('')
  })

  it('นับวันถูกต้องข้ามวันเปลี่ยนเวลาออมแสง (DST) ของหลายประเทศ ไม่ว่าเครื่องจะอยู่เขตเวลาไหน', () => {
    // สหรัฐฯ เริ่ม DST 8 มี.ค. และสิ้นสุด 1 พ.ย. / นิวซีแลนด์เริ่ม 27 ก.ย. / ยุโรปสิ้นสุด 25 ต.ค. (2026)
    for (const [from, to, days] of [
      ['2026-03-07', '2026-03-09', 2],
      ['2026-10-31', '2026-11-02', 2],
      ['2026-09-26', '2026-09-28', 2],
      ['2026-10-24', '2026-10-26', 2],
    ]) {
      expect(daysBetween(from, to)).toBe(days)
      expect(addDays(from, days)).toBe(to)
      expect(addDays(to, -days)).toBe(from)
      expect(daysFrom(from, 3)).toEqual([from, addDays(from, 1), to])
    }
  })
})
