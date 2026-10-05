import { useState } from 'react'
import { CalendarDays, Check, ChevronDown, ChevronUp, Ellipsis, Trash2 } from 'lucide-react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import TextInput from './TextInput.jsx'
import { addDays, isValidISODate, overdueLabel } from '../lib/date.js'
import styles from './OverdueGroup.module.css'

function OverdueItem({ task, todayISO, actions }) {
  const [open, setOpen] = useState(false)
  const [picking, setPicking] = useState(false)
  const tomorrow = addDays(todayISO, 1)

  const pickDate = (event) => {
    const value = event.target.value
    if (isValidISODate(value) && value >= todayISO) actions.move(task, value)
  }

  return (
    <li className={styles.item}>
      <div className={styles.row}>
        <div className={styles.text}>
          <span className={styles.title}>{task.title}</span>
          <span className={styles.meta}>{overdueLabel(task.date, todayISO)}</span>
        </div>
        <Button aria-label={`ทำวันนี้: ${task.title}`} onClick={() => actions.move(task, todayISO)}>
          ทำวันนี้
        </Button>
        <button
          type="button"
          className={styles.more}
          aria-expanded={open}
          aria-label={`ตัวเลือกของ ${task.title}`}
          onClick={() => {
            setPicking(false)
            setOpen((v) => !v)
          }}
        >
          <Ellipsis size={20} aria-hidden="true" />
        </button>
      </div>

      {open && (
        <div className={styles.panel}>
          <div className={styles.actions}>
            <Button variant="secondary" icon={Check} onClick={() => actions.finish(task)}>
              เสร็จแล้ว
            </Button>
            <Button
              variant="secondary"
              icon={CalendarDays}
              aria-expanded={picking}
              onClick={() => setPicking((v) => !v)}
            >
              เลื่อนไป
            </Button>
            <Button variant="soft" icon={Trash2} onClick={() => actions.remove(task)}>
              ลบ
            </Button>
          </div>
          {picking && (
            <div className={styles.actions} role="group" aria-label="เลื่อนไปวันอื่น">
              <Button variant="soft" onClick={() => actions.move(task, tomorrow)}>
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
        </div>
      )}
    </li>
  )
}

/** กลุ่ม "ค้างจากก่อนหน้า" บนหน้าวันนี้ (สีพีชอ่อน ไม่ใช้แดง จะได้ไม่รู้สึกกดดัน)
 *  แต่ละงาน: ทำวันนี้ (กดเดียว) / เสร็จแล้ว / เลื่อนไป / ลบ — พับกลุ่มเก็บได้ */
export default function OverdueGroup({ tasks, todayISO, actions }) {
  const [collapsed, setCollapsed] = useState(false)
  if (tasks.length === 0) return null

  return (
    <Card tone="peach" flush as="section" aria-label="ค้างจากก่อนหน้า" className={styles.group}>
      <button
        type="button"
        className={styles.header}
        aria-expanded={!collapsed}
        onClick={() => setCollapsed((v) => !v)}
      >
        <span>ค้างจากก่อนหน้า</span>
        <span className={styles.headerEnd}>
          <span className={styles.count}>{tasks.length}</span>
          {collapsed ? (
            <ChevronDown size={20} aria-hidden="true" />
          ) : (
            <ChevronUp size={20} aria-hidden="true" />
          )}
        </span>
      </button>

      {!collapsed && (
        <ul className={styles.list}>
          {tasks.map((task) => (
            <OverdueItem key={task.id} task={task} todayISO={todayISO} actions={actions} />
          ))}
        </ul>
      )}
    </Card>
  )
}
