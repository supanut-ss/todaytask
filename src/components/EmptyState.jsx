import styles from './EmptyState.module.css'

/** สถานะว่าง: บอกว่าเกิดอะไร และชวนทำขั้นต่อไป (action = ปุ่ม/ลิงก์)
 *  headingLevel: ใช้ 1 เมื่อเป็นหัวเรื่องหลักของหน้า (เช่น หน้าไม่พบ) */
export default function EmptyState({ icon: Icon, title, description, action, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`
  return (
    <div className={styles.empty}>
      {Icon && (
        <div className={styles.icon}>
          <Icon size={26} strokeWidth={2} aria-hidden="true" />
        </div>
      )}
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {action}
    </div>
  )
}
