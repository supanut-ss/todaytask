import { useEffect } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ArrowLeft, SlidersHorizontal } from 'lucide-react'
import logoMark from '../assets/logo-mark.png'
import { useApplyTheme } from '../hooks/useApplyTheme.js'
import { useTasks } from '../hooks/useTasks.js'
import { useToday } from '../hooks/useToday.js'
import PwaBanners from './PwaBanners.jsx'
import QuickCapture from './QuickCapture.jsx'
import StorageNotice from './StorageNotice.jsx'
import styles from './AppShell.module.css'

/** โครงทุกหน้า: หัว (โลโก้ + ตั้งค่า) / เนื้อหาเลื่อนได้ / ช่องจดเร็วติดล่าง */
export default function AppShell() {
  useApplyTheme()

  // ล้างงานที่เสร็จเกิน 30 วัน: ตอนเปิดแอป และทุกครั้งที่ขึ้นวันใหม่
  const { prune } = useTasks()
  const todayISO = useToday()
  // หน้าอื่นนอกจากหน้าวันมีปุ่มกลับหน้าหลัก
  const { pathname } = useLocation()
  const isDayPage = pathname === '/' || pathname.startsWith('/day/')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(prune, [todayISO])

  return (
    <div className={styles.shell}>
      <header className={`${styles.column} ${styles.header}`}>
        <div className={styles.headerRow}>
          <div className={styles.left}>
            {!isDayPage && (
              <Link to="/" className={styles.back} aria-label="กลับหน้าหลัก" title="กลับหน้าหลัก">
                <ArrowLeft size={22} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
            <Link to="/" className={styles.brand} aria-label="ทำวันนี้ กลับหน้าแรก">
              <img src={logoMark} alt="" width={30} height={31} />
              ทำวันนี้
            </Link>
          </div>
          <Link to="/settings" className={styles.settings} aria-label="ตั้งค่า">
            <SlidersHorizontal size={20} strokeWidth={2} aria-hidden="true" />
          </Link>
        </div>
      </header>

      <div className={styles.scroll}>
        <main className={`${styles.column} ${styles.content}`}>
          <PwaBanners />
          <StorageNotice />
          <Outlet />
        </main>
      </div>

      <QuickCapture />
    </div>
  )
}
