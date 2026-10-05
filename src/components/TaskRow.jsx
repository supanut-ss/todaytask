import { useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  CalendarDays,
  Check,
  Ellipsis,
  Pencil,
  Play,
  Trash2,
  X,
} from 'lucide-react'
import Button from './Button.jsx'
import TextInput from './TextInput.jsx'
import { addDays, isValidISODate } from '../lib/date.js'
import { MAX_TITLE } from '../lib/tasks.js'
import styles from './TaskRow.module.css'

/** หนึ่งแถวงาน: ติ๊กเสร็จ / ชื่อ (แก้ไขได้) / ปุ่ม ⋯ เปิดแผงตัวเลือก (ลำดับ, ย้ายวัน, ลบ) */
export default function TaskRow({
  task,
  todayISO,
  expanded,
  onExpandedChange,
  canMoveUp,
  canMoveDown,
  isCurrent = false,
  onSetCurrent,
  onFinish,
  onToggle,
  onRename,
  onReorder,
  onMove,
  onRemove,
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(task.title)
  const [picking, setPicking] = useState(false)
  const done = task.status === 'done'
  const tomorrow = addDays(todayISO, 1)

  const startEdit = () => {
    setDraft(task.title)
    setEditing(true)
  }
  const saveEdit = (event) => {
    event.preventDefault()
    if (draft.trim()) onRename(draft)
    setEditing(false)
  }
  const pickDate = (event) => {
    const value = event.target.value
    if (isValidISODate(value) && value >= todayISO) onMove(value)
  }

  return (
    <li
      className={`${styles.item} ${isCurrent && !done ? styles.current : ''}`}
      aria-current={isCurrent && !done ? 'true' : undefined}
    >
      <div className={styles.row}>
        <button
          type="button"
          className={styles.check}
          aria-pressed={done}
          aria-label={done ? `ยกเลิกเสร็จ: ${task.title}` : `ติ๊กเสร็จ: ${task.title}`}
          onClick={onToggle}
        >
          <span className={`${styles.box} ${done ? styles.boxDone : ''}`}>
            {done && <Check size={14} strokeWidth={3.5} aria-hidden="true" />}
          </span>
        </button>

        {editing ? (
          <form className={styles.edit} onSubmit={saveEdit}>
            <TextInput
              label="แก้ไขชื่องาน"
              hideLabel
              value={draft}
              maxLength={MAX_TITLE}
              autoFocus
              autoComplete="off"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && setEditing(false)}
            />
            <Button type="submit" variant="text" icon={Check} iconOnly aria-label="บันทึกชื่อ" />
            <Button
              variant="text"
              icon={X}
              iconOnly
              aria-label="ยกเลิกการแก้ไข"
              onClick={() => setEditing(false)}
            />
          </form>
        ) : (
          <div className={styles.main}>
            {isCurrent && !done && <span className={styles.badge}>ทำอยู่ตอนนี้</span>}
            <p className={`${styles.title} ${done ? styles.titleDone : ''}`}>
              <span>{task.title}</span>
            </p>
          </div>
        )}

        {isCurrent && !done && !editing && onFinish && (
          <Button
            className={styles.finish}
            icon={Check}
            iconOnly
            aria-label={`เสร็จแล้ว: ${task.title}`}
            onClick={onFinish}
          />
        )}

        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          aria-label={`ตัวเลือกของ ${task.title}`}
          onClick={() => {
            setPicking(false)
            onExpandedChange(!expanded)
          }}
        >
          <Ellipsis size={22} aria-hidden="true" />
        </button>
      </div>

      {expanded && (
        <div className={styles.panel}>
          <div className={styles.actions}>
            <Button variant="secondary" icon={Pencil} onClick={startEdit}>
              แก้ไข
            </Button>
            {!done && onSetCurrent && !isCurrent && (
              <Button
                variant="secondary"
                icon={Play}
                aria-label={`ทำอันนี้ตอนนี้: ${task.title}`}
                onClick={() => {
                  onSetCurrent()
                  onExpandedChange(false)
                }}
              >
                ทำอันนี้ตอนนี้
              </Button>
            )}
            {!done && (
              <>
                <Button
                  variant="secondary"
                  icon={ArrowUp}
                  disabled={!canMoveUp}
                  aria-label={`เลื่อนขึ้น: ${task.title}`}
                  onClick={() => onReorder(-1)}
                >
                  ขึ้น
                </Button>
                <Button
                  variant="secondary"
                  icon={ArrowDown}
                  disabled={!canMoveDown}
                  aria-label={`เลื่อนลง: ${task.title}`}
                  onClick={() => onReorder(1)}
                >
                  ลง
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              icon={CalendarDays}
              aria-expanded={picking}
              onClick={() => setPicking((v) => !v)}
            >
              ย้ายวัน
            </Button>
            <Button variant="soft" icon={Trash2} onClick={onRemove}>
              ลบ
            </Button>
          </div>

          {picking && (
            <div className={styles.actions} role="group" aria-label="ย้ายไปวันอื่น">
              {task.date !== todayISO && (
                <Button variant="soft" onClick={() => onMove(todayISO)}>
                  วันนี้
                </Button>
              )}
              {task.date !== tomorrow && (
                <Button variant="soft" onClick={() => onMove(tomorrow)}>
                  พรุ่งนี้
                </Button>
              )}
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
        </div>
      )}
    </li>
  )
}
