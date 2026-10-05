import { useState } from 'react'
import { CalendarDays, ListPlus, Trash2 } from 'lucide-react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import TextInput from './TextInput.jsx'
import { addDays, formatNoteTime, isValidISODate } from '../lib/date.js'
import styles from './ParkingNote.module.css'

/** โน้ตหนึ่งใบในที่พักความคิด: ทำวันนี้ (กดเดียว) / เลือกวัน / ลบ
 *  compact: แถวบางๆ ใช้ในหน้าแรก (ไม่แย่งความสำคัญจากรายการงานหลัก)
 *  ปุ่มทั้งหมดอยู่บรรทัดเดียวกับข้อความ เป็นไอคอน (มี aria-label และ title) */
export default function ParkingNote({ note, todayISO, onSchedule, onRemove, compact = false }) {
  const [picking, setPicking] = useState(false)
  const Wrapper = compact ? 'div' : Card

  const pickDate = (event) => {
    const value = event.target.value
    if (isValidISODate(value) && value >= todayISO) onSchedule(note, value)
  }

  return (
    <Wrapper className={compact ? styles.compact : styles.note}>
      <div>
        <p className={styles.text}>{note.text}</p>
        <p className={styles.time}>จดเมื่อ {formatNoteTime(note.createdAt, todayISO)}</p>
      </div>

      <div className={styles.actions}>
        <Button
          variant={compact ? 'text' : 'primary'}
          aria-label={`ทำวันนี้: ${note.text}`}
          icon={compact ? ListPlus : undefined}
          iconOnly={compact}
          onClick={() => onSchedule(note, todayISO)}
        >
          {compact ? null : 'ทำวันนี้'}
        </Button>
        <Button
          variant={compact ? 'text' : 'secondary'}
          aria-label={`เลือกวัน: ${note.text}`}
          aria-expanded={picking}
          icon={compact ? CalendarDays : undefined}
          iconOnly={compact}
          onClick={() => setPicking((v) => !v)}
        >
          {compact ? null : 'เลือกวัน'}
        </Button>
        <Button
          variant={compact ? 'text' : 'soft'}
          aria-label={`ลบ: ${note.text}`}
          icon={compact ? Trash2 : undefined}
          iconOnly={compact}
          onClick={() => onRemove(note)}
        >
          {compact ? null : 'ลบ'}
        </Button>
      </div>

      {picking && (
        <div className={styles.pick} role="group" aria-label="เลือกวันที่จะทำ">
          <Button variant="soft" onClick={() => onSchedule(note, addDays(todayISO, 1))}>
            พรุ่งนี้
          </Button>
          <TextInput
            type="date"
            label="เลือกวันที่"
            hideLabel
            min={todayISO}
            value=""
            onChange={pickDate}
          />
        </div>
      )}
    </Wrapper>
  )
}
