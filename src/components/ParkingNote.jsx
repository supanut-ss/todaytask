import { useState } from 'react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import TextInput from './TextInput.jsx'
import { addDays, formatNoteTime, isValidISODate } from '../lib/date.js'
import styles from './ParkingNote.module.css'

/** โน้ตหนึ่งใบในที่พักความคิด: ทำวันนี้ (กดเดียว) / เลือกวัน / ลบ */
export default function ParkingNote({ note, todayISO, onSchedule, onRemove }) {
  const [picking, setPicking] = useState(false)

  const pickDate = (event) => {
    const value = event.target.value
    if (isValidISODate(value) && value >= todayISO) onSchedule(note, value)
  }

  return (
    <Card className={styles.note}>
      <div>
        <p className={styles.text}>{note.text}</p>
        <p className={styles.time}>จดเมื่อ {formatNoteTime(note.createdAt, todayISO)}</p>
      </div>

      <div className={styles.actions}>
        <Button aria-label={`ทำวันนี้: ${note.text}`} onClick={() => onSchedule(note, todayISO)}>
          ทำวันนี้
        </Button>
        <Button
          variant="secondary"
          aria-label={`เลือกวัน: ${note.text}`}
          aria-expanded={picking}
          onClick={() => setPicking((v) => !v)}
        >
          เลือกวัน
        </Button>
        <Button variant="soft" aria-label={`ลบ: ${note.text}`} onClick={() => onRemove(note)}>
          ลบ
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
    </Card>
  )
}
