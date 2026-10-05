import { Share } from 'lucide-react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import { useInstall } from '../hooks/useInstall.js'
import styles from './InstallPrompt.module.css'

/** การ์ดติดตั้งแอปในหน้าตั้งค่า มี 4 สถานะ:
 *  ติดตั้งแล้ว / กดติดตั้งได้ (Android, Chrome, Edge) / iOS (ต้องทำเอง) / เบราว์เซอร์อื่น */
export default function InstallPrompt() {
  const { installed, canPrompt, isIOS, promptInstall } = useInstall()

  return (
    <Card tone="blue" as="section" aria-label="ติดตั้งแอป" className={styles.card}>
      <h2>ติดตั้งแอปลงหน้าจอหลัก</h2>

      {installed ? (
        <p className={styles.text}>ติดตั้งแล้ว เปิดจากไอคอน "ทำวันนี้" บนหน้าจอหลักได้เลย</p>
      ) : (
        <>
          <p className={styles.text}>เปิดเต็มจอ เปิดเร็วขึ้น และใช้ได้ตอนไม่มีเน็ต</p>

          {canPrompt && (
            <Button size="lg" block onClick={promptInstall}>
              ติดตั้งแอป
            </Button>
          )}

          {!canPrompt && isIOS && (
            <>
              <p className={styles.text}>
                <Share size={16} aria-hidden="true" style={{ verticalAlign: '-2px' }} />{' '}
                แตะปุ่มแชร์ใน Safari แล้วเลือก "เพิ่มไปยังหน้าจอโฮม"
              </p>
              <p className={styles.note}>
                <strong>ก่อนติดตั้ง:</strong> บน iPhone/iPad แอปที่ติดตั้งเก็บข้อมูลแยกจาก Safari
                งานที่จดไว้ใน Safari จะไม่ตามไป ควรติดตั้งก่อนเริ่มใช้งานจริง หรือสำรองข้อมูลไว้ก่อน
              </p>
            </>
          )}

          {!canPrompt && !isIOS && (
            <p className={styles.text}>
              ถ้าไม่เห็นปุ่มติดตั้ง ลองเปิดเมนูของเบราว์เซอร์แล้วเลือก "ติดตั้งแอป" หรือ
              "เพิ่มไปยังหน้าจอหลัก"
            </p>
          )}
        </>
      )}
    </Card>
  )
}
