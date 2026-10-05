import { useMemo, useState } from 'react'
import { CalendarDays, ChevronRight } from 'lucide-react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import AddTask from '../components/AddTask.jsx'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import CurrentTaskCard from '../components/CurrentTaskCard.jsx'
import DayStrip from '../components/DayStrip.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ParkingNote from '../components/ParkingNote.jsx'
import OverdueGroup from '../components/OverdueGroup.jsx'
import TaskList from '../components/TaskList.jsx'
import TextInput from '../components/TextInput.jsx'
import { useCurrentTask } from '../hooks/useCurrentTask.js'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useParkingActions } from '../hooks/useParkingActions.js'
import { useSnackbar } from '../hooks/useSnackbar.js'
import { useTasks } from '../hooks/useTasks.js'
import { useToday } from '../hooks/useToday.js'
import { daysFrom, formatThai, isValidISODate, relativeLabel, stripStart } from '../lib/date.js'
import { countsByDate, overdueTasks, pickCurrent, tasksOnDate } from '../lib/tasks.js'
import styles from './DayPage.module.css'

/** หน้า Main: แผนของวันที่เลือก (ค่าเริ่มต้น = วันนี้)
 *  เฟส 2: แถบเลือกวัน + เพิ่ม/ติ๊ก/แก้/ลบ/จัดลำดับ/ย้ายวัน
 *  เฟส 3: (เฉพาะหน้าวันนี้) กลุ่มงานค้าง + การ์ด "ทำอยู่ตอนนี้" */
/** จำนวนโน้ตที่แสดงในหน้าแรก (เกินนี้ไปดูทั้งหมดที่หน้าที่พักความคิด) */
const PARKING_PREVIEW = 3

export default function DayPage() {
  const { date } = useParams()
  const navigate = useNavigate()
  const todayISO = useToday()
  const iso = date ?? todayISO
  const valid = isValidISODate(iso)

  const { tasks, add, toggle, rename, remove, move, reorder, restore } = useTasks()
  const { show } = useSnackbar()
  const { notes, schedule: scheduleNote, discard: discardNote } = useParkingActions(todayISO)
  const { preferred, choose } = useCurrentTask()
  const [addingFor, setAddingFor] = useState(null) // วันที่ที่กำลังเปิดช่องเพิ่มงาน

  const dayTasks = useMemo(() => (valid ? tasksOnDate(tasks, iso) : []), [tasks, iso, valid])
  const counts = useMemo(
    () => (valid ? countsByDate(tasks, daysFrom(stripStart(iso, todayISO), 7)) : {}),
    [tasks, iso, todayISO, valid],
  )

  const isToday = valid && iso === todayISO
  const overdue = useMemo(
    () => (isToday ? overdueTasks(tasks, todayISO) : []),
    [tasks, todayISO, isToday],
  )
  const current = useMemo(
    () => (isToday ? pickCurrent(tasks, todayISO, preferred) : null),
    [tasks, todayISO, preferred, isToday],
  )

  const label = valid ? relativeLabel(iso, todayISO) : ''
  usePageTitle(label)

  if (!valid) return <Navigate to="/404" replace />
  // /day/<วันนี้> ใช้ URL หลัก "/" แทน จะได้มีที่อยู่เดียว
  if (date === todayISO) return <Navigate to="/" replace />

  const pathFor = (target) => (target === todayISO ? '/' : `/day/${target}`)
  const total = dayTasks.length
  const done = dayTasks.filter((t) => t.status === 'done').length
  const canAdd = iso >= todayISO // วางแผนของวันที่ผ่านไปแล้วไม่ได้ แต่ติ๊ก/ย้าย/ลบงานเก่าได้
  const adding = addingFor === iso

  const withUndo = (message, snapshot) =>
    show(message, { actionLabel: 'เลิกทำ', onAction: () => restore(snapshot), duration: 5000 })

  const actions = {
    toggle: (task) => toggle(task.id),
    // เสร็จแล้ว (จากการ์ดหรือกลุ่มงานค้าง): มีเลิกทำ กันกดพลาดจากปุ่มใหญ่
    finish: (task) => {
      toggle(task.id)
      withUndo(`เสร็จแล้ว: ${task.title}`, task)
    },
    setCurrent: isToday ? (task) => choose(task) : undefined,
    rename: (task, title) => rename(task.id, title),
    reorder: (task, direction) => reorder(task.id, direction),
    remove: (task) => {
      const snapshot = remove(task.id)
      if (snapshot) withUndo('ลบงานแล้ว', snapshot)
    },
    move: (task, target) => {
      const snapshot = move(task.id, target)
      if (snapshot) withUndo(`ย้ายไป${relativeLabel(target, todayISO)}แล้ว`, snapshot)
    },
  }

  const jump = (event) => {
    const value = event.target.value
    if (isValidISODate(value)) navigate(pathFor(value))
  }

  return (
    <>
      <div className={styles.layout}>
        <div className={styles.side}>
          <div className={styles.head}>
            <div>
              <h1>{label}</h1>
              <p className={styles.sub}>{formatThai(iso, { withYear: true })}</p>
            </div>
            <TextInput
              className={styles.jump}
              type="date"
              label="ไปที่วันที่"
              hideLabel
              value={iso}
              onChange={jump}
            />
          </div>

          <div className={styles.progress}>
            <p className={styles.counter}>
              {total > 0 ? `เสร็จ ${done} จาก ${total}` : 'ยังไม่มีงานในวันนี้'}
            </p>
            <div
              className={styles.bar}
              role="progressbar"
              aria-label="ความคืบหน้าของวัน"
              aria-valuemin={0}
              aria-valuemax={total}
              aria-valuenow={done}
            >
              <div
                className={styles.fill}
                style={{ width: total ? `${(done / total) * 100}%` : 0 }}
              />
            </div>
          </div>

          <DayStrip selected={iso} today={todayISO} counts={counts} pathFor={pathFor} />

          {isToday && (
            <CurrentTaskCard
              task={current}
              allDone={total > 0 && done === total}
              overdueCount={overdue.length}
              onFinish={actions.finish}
            />
          )}
        </div>
        <div className={styles.primary}>
          {isToday && <OverdueGroup tasks={overdue} todayISO={todayISO} actions={actions} />}

          <section className={styles.section} aria-label={`งานของ${label}`}>
            <h2>งานของ{label}</h2>
            <Card flush>
              {total > 0 ? (
                <TaskList
                  tasks={dayTasks}
                  todayISO={todayISO}
                  currentId={current?.id ?? null}
                  actions={actions}
                />
              ) : (
                <EmptyState
                  icon={CalendarDays}
                  title={canAdd ? `ยังไม่มีงานของ${label}` : 'วันนั้นไม่มีงาน'}
                  description={canAdd ? 'เริ่มวางแผนด้วยการเพิ่มงานแรก' : undefined}
                  action={
                    canAdd && !adding ? (
                      <Button onClick={() => setAddingFor(iso)}>เพิ่มงานแรก</Button>
                    ) : undefined
                  }
                />
              )}
              {canAdd && (total > 0 || adding) && (
                <div className={`${styles.addRow} ${total > 0 ? styles.addRowBorder : ''}`}>
                  <AddTask
                    label={iso === todayISO ? 'เพิ่มงานวันนี้' : `เพิ่มงานให้${label}`}
                    placeholder="จะทำอะไร?"
                    open={adding}
                    onOpenChange={(open) => setAddingFor(open ? iso : null)}
                    onAdd={(title) => add(title, iso)}
                  />
                </div>
              )}
            </Card>
          </section>
          <section className={styles.parkingSection} aria-label="ที่พักความคิด">
            <Link to="/parking" className={styles.parking}>
              <span className={styles.parkingLabel}>
                ที่พักความคิด
                {notes.length > 0 && <span className={styles.parkingCount}>{notes.length}</span>}
              </span>
              <span className={styles.parkingAll}>
                {notes.length > PARKING_PREVIEW ? 'ดูทั้งหมด' : null}
                <ChevronRight size={20} aria-hidden="true" />
              </span>
            </Link>
            {notes.length > 0 && (
              <ul className={styles.parkingList}>
                {notes.slice(0, PARKING_PREVIEW).map((note) => (
                  <li key={note.id}>
                    <ParkingNote
                      note={note}
                      todayISO={todayISO}
                      onSchedule={scheduleNote}
                      onRemove={discardNote}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>
    </>
  )
}
