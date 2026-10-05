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
      <h1 className={styles.intro}>ตั้งค่า</h1>

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
