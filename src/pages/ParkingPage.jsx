import { Inbox } from 'lucide-react'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ParkingNote from '../components/ParkingNote.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useParking } from '../hooks/useParking.js'
import { useSnackbar } from '../hooks/useSnackbar.js'
import { useTasks } from '../hooks/useTasks.js'
import { useToday } from '../hooks/useToday.js'
import { relativeLabel } from '../lib/date.js'
import styles from './ParkingPage.module.css'

/** ที่พักความคิด: จดไว้ก่อนตอนมีอะไรแทรก ตอนว่างค่อยมาจัดการ
 *  แต่ละโน้ต: ทำวันนี้ / เลือกวัน (กลายเป็นงานของวันนั้น) / ลบ — ทุกอย่างเลิกทำได้ */
export default function ParkingPage() {
  usePageTitle('ที่พักความคิด')
  const todayISO = useToday()
  const { notes, remove: removeNote, restore: restoreNote } = useParking()
  const { add: addTask, remove: removeTask } = useTasks()
  const { show } = useSnackbar()

  const undoable = (message, onUndo) =>
    show(message, { actionLabel: 'เลิกทำ', onAction: onUndo, duration: 5000 })

  const schedule = (note, date) => {
    const task = addTask(note.text, date)
    if (!task) return
    removeNote(note.id)
    undoable(`เพิ่มเป็นงาน${relativeLabel(date, todayISO)}แล้ว`, () => {
      removeTask(task.id)
      restoreNote(note)
    })
  }

  const discard = (note) => {
    const snapshot = removeNote(note.id)
    if (snapshot) undoable('ลบแล้ว', () => restoreNote(snapshot))
  }

  return (
    <>
      <div>
        <h1>ที่พักความคิด</h1>
        <p className={styles.sub}>สิ่งที่แทรกเข้ามาตอนทำงาน จดไว้ก่อน ตอนว่างค่อยจัดการ</p>
      </div>

      {notes.length === 0 ? (
        <Card>
          <EmptyState
            icon={Inbox}
            title="ยังไม่มีอะไรในที่พักความคิด"
            description="พิมพ์ในช่องด้านล่างเพื่อจดไว้ก่อน แล้วกลับมาทำงานต่อได้เลย"
          />
        </Card>
      ) : (
        <ul className={styles.list}>
          {notes.map((note) => (
            <li key={note.id}>
              <ParkingNote
                note={note}
                todayISO={todayISO}
                onSchedule={schedule}
                onRemove={discard}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
