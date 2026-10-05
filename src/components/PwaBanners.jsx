import { useEffect } from 'react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import { useInstall } from '../hooks/useInstall.js'
import { useServiceWorker } from '../hooks/useServiceWorker.js'
import { useSnackbar } from '../hooks/useSnackbar.js'
import { useUiState } from '../hooks/useUiState.js'
import styles from './PwaBanners.module.css'

/** แบนเนอร์ใต้หัวแอป (แสดงทีละอัน เรียงตามความสำคัญ):
 *  1) มีเวอร์ชันใหม่ -> อัปเดต / ไว้ก่อน
 *  2) ติดตั้งแอปได้ (และยังไม่เคยกดปิด) -> ติดตั้ง / ไม่ใช่ตอนนี้
 *  พร้อมแจ้งครั้งเดียวเมื่อเก็บไฟล์ครบแล้วว่าใช้ตอนไม่มีเน็ตได้ */
export default function PwaBanners() {
  const { needRefresh, offlineReady, update, dismissUpdate, dismissOfflineReady } =
    useServiceWorker()
  const { canPrompt, installed, promptInstall } = useInstall()
  const { ui, patch } = useUiState()
  const { show } = useSnackbar()

  useEffect(() => {
    if (!offlineReady) return
    show('ใช้ตอนไม่มีเน็ตได้แล้ว')
    dismissOfflineReady()
  }, [offlineReady, show, dismissOfflineReady])

  if (needRefresh) {
    return (
      <Card tone="blue" role="status" className={styles.banner}>
        <p className={styles.text}>มีเวอร์ชันใหม่ แตะเพื่ออัปเดต</p>
        <div className={styles.buttons}>
          <Button onClick={update}>อัปเดต</Button>
          <Button variant="text" onClick={dismissUpdate}>
            ไว้ก่อน
          </Button>
        </div>
      </Card>
    )
  }

  if (canPrompt && !installed && !ui.installDismissed) {
    return (
      <Card tone="blue" className={styles.banner}>
        <p className={styles.text}>ติดตั้งแอปไว้ที่หน้าจอหลัก เปิดเร็วและใช้ตอนไม่มีเน็ตได้</p>
        <div className={styles.buttons}>
          <Button onClick={promptInstall}>ติดตั้ง</Button>
          <Button variant="text" onClick={() => patch({ installDismissed: true })}>
            ไม่ใช่ตอนนี้
          </Button>
        </div>
      </Card>
    )
  }

  return null
}
