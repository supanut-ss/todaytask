import Card from './Card.jsx'
import styles from './CurrentTaskCard.module.css'

/** ข้อความยินดีเมื่อทำครบทุกงานของวันนี้ บอกด้วยว่ายังมีงานค้างไหม
 *  (งานที่ "ทำอยู่ตอนนี้" ไม่ใช่การ์ดแล้ว: เป็นแถวในรายการงาน มีปุ่มเสร็จแล้วในบรรทัดเดียวกัน) */
export default function CurrentTaskCard({ overdueCount = 0 }) {
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
