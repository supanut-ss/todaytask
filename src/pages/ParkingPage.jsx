import { Inbox } from 'lucide-react'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import ParkingNote from '../components/ParkingNote.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import { useParkingActions } from '../hooks/useParkingActions.js'
import { useToday } from '../hooks/useToday.js'
import styles from './ParkingPage.module.css'

/** ที่พักความคิด: จดไว้ก่อนตอนมีอะไรแทรก ตอนว่างค่อยมาจัดการ
 *  แต่ละโน้ต: ทำวันนี้ / เลือกวัน (กลายเป็นงานของวันนั้น) / ลบ — ทุกอย่างเลิกทำได้ */
export default function ParkingPage() {
  usePageTitle('ที่พักความคิด')
  const todayISO = useToday()
  const { notes, schedule, discard } = useParkingActions(todayISO)

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
