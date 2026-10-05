import { Check } from 'lucide-react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import styles from './CurrentTaskCard.module.css'

/** การ์ดบนสุดของหน้าวันนี้
 *  - มีงานที่ต้องทำ: โชว์งาน "ทำอยู่ตอนนี้" ตัวใหญ่ + ปุ่มเสร็จแล้ว
 *  - ทำครบแล้ว (allDone): ข้อความยินดีสั้นๆ บอกด้วยว่ายังมีงานค้างไหม */
export default function CurrentTaskCard({ task, allDone = false, overdueCount = 0, onFinish }) {
  if (task) {
    return (
      <Card tone="blue" as="section" aria-label="ทำอยู่ตอนนี้" className={styles.card}>
        <p className={styles.label}>ทำอยู่ตอนนี้</p>
        <p className={styles.title}>{task.title}</p>
        <Button size="lg" icon={Check} block onClick={() => onFinish(task)}>
          เสร็จแล้ว
        </Button>
      </Card>
    )
  }

  if (allDone) {
    return (
      <Card tone="mint" as="section" aria-label="ทำครบแล้ว" className={styles.card}>
        <p className={styles.doneTitle}>ครบทุกงานของวันนี้แล้ว</p>
        <p className={styles.doneText}>
          {overdueCount > 0
            ? `ยังมีงานค้างอีก ${overdueCount} งาน จะดึงมาทำวันนี้ต่อหรือเลื่อนไปก็ได้`
            : 'ไม่มีงานค้างด้วย พักได้เลย หรือเพิ่มงานต่อก็ได้'}
        </p>
      </Card>
    )
  }

  return null
}
