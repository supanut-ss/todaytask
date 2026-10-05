import { PartyPopper } from 'lucide-react'
import Card from './Card.jsx'
import styles from './CurrentTaskCard.module.css'

/** ข้อความยินดีเมื่อทำครบทุกงานของวันนี้ บอกด้วยว่ายังมีงานค้างไหม และทำครบติดต่อกันกี่วัน
 *  (งานที่ "ทำอยู่ตอนนี้" ไม่ใช่การ์ดแล้ว: เป็นแถวในรายการงาน มีปุ่มเสร็จแล้วในบรรทัดเดียวกัน) */
export default function CurrentTaskCard({ overdueCount = 0, streak = 0 }) {
  return (
    <Card tone="mint" as="section" aria-label="ทำครบแล้ว" className={styles.card}>
      <span className={styles.badge} aria-hidden="true">
        <PartyPopper size={24} strokeWidth={2} />
      </span>
      <div className={styles.text}>
        <p className={styles.doneTitle}>ครบทุกงานของวันนี้แล้ว</p>
        {streak >= 2 && <p className={styles.streak}>ทำครบติดต่อกัน {streak} วันแล้ว</p>}
        <p className={styles.doneText}>
          {overdueCount > 0
            ? `ยังมีงานค้างอีก ${overdueCount} งาน จะดึงมาทำวันนี้ต่อหรือเลื่อนไปก็ได้`
            : 'ไม่มีงานค้างด้วย พักได้เลย หรือเพิ่มงานต่อก็ได้'}
        </p>
      </div>
    </Card>
  )
}
