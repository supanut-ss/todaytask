import { Check } from 'lucide-react'
import { useSettings } from '../hooks/useSettings.js'
import styles from './ThemeSection.module.css'

const THEME_OPTIONS = [
  ['auto', 'อัตโนมัติ'],
  ['light', 'สว่าง'],
  ['dark', 'มืด'],
]

// สีตัวอย่างบนปุ่ม (ค่าเดียวกับโหมดสว่างใน tokens.css)
const ACCENT_OPTIONS = [
  ['butter', 'เหลือง', '#ffe98a'],
  ['mint', 'เขียว', '#b8f0d0'],
  ['peach', 'ชมพู', '#ffd9e8'],
]

/** ธีม (อัตโนมัติ/สว่าง/มืด) และสีไฮไลต์งานที่เสร็จ — มีผลทันที และจำไว้ในเครื่อง */
export default function ThemeSection() {
  const { settings, update } = useSettings()

  return (
    <section aria-label="หน้าตาของแอป">
      <div className={styles.block}>
        <h2 className={styles.title}>ธีม</h2>
        <div role="group" aria-label="เลือกธีม" className={styles.group}>
          {THEME_OPTIONS.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={styles.option}
              aria-pressed={settings.theme === value}
              onClick={() => update({ theme: value })}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.block}>
        <h2 className={styles.title}>สีไฮไลต์งานที่เสร็จ</h2>
        <div role="group" aria-label="เลือกสีไฮไลต์" className={styles.swatches}>
          {ACCENT_OPTIONS.map(([value, label, color]) => (
            <button
              key={value}
              type="button"
              className={styles.swatch}
              style={{ background: color }}
              aria-label={`สี${label}`}
              aria-pressed={settings.accent === value}
              onClick={() => update({ accent: value })}
            >
              {settings.accent === value && <Check size={20} strokeWidth={3} aria-hidden="true" />}
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
