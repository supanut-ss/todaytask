import DataSection from '../components/DataSection.jsx'
import InstallPrompt from '../components/InstallPrompt.jsx'
import ThemeSection from '../components/ThemeSection.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'
import styles from './SettingsPage.module.css'

/** ตั้งค่า: ติดตั้งแอป / ธีมและสีไฮไลต์ / ข้อมูล (สำรอง กู้คืน ล้าง) */
export default function SettingsPage() {
  usePageTitle('ตั้งค่า')

  return (
    <div className={styles.layout}>
      <div className={styles.intro}>
        <h1>ตั้งค่า</h1>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-small)' }}>
          ข้อมูลทั้งหมดอยู่ในเครื่องนี้เท่านั้น
        </p>
      </div>

      <div className={styles.col}>
        <InstallPrompt />
        <ThemeSection />
      </div>
      <div className={styles.col}>
        <DataSection />
      </div>
    </div>
  )
}
