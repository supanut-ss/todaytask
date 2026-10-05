import { useRef, useState } from 'react'
import { Download, Trash2, Upload } from 'lucide-react'
import Button from './Button.jsx'
import Card from './Card.jsx'
import { usePersisted } from '../hooks/usePersisted.js'
import { useStoragePersistent } from '../hooks/usePersistentState.js'
import { useSnackbar } from '../hooks/useSnackbar.js'
import { useToday } from '../hooks/useToday.js'
import { useUiState } from '../hooks/useUiState.js'
import {
  backupFileName,
  buildBackup,
  clearAll,
  isEmptyData,
  mergeData,
  parseBackup,
  readAll,
  replaceData,
  writeAll,
} from '../lib/backup.js'
import { formatNoteTime } from '../lib/date.js'
import { readFileText, saveTextFile } from '../lib/download.js'
import styles from './DataSection.module.css'

/** ข้อมูลของผู้ใช้: สถานะการเก็บ, สำรอง, กู้คืน (รวม/แทนที่), ล้างทั้งหมด
 *  ทุกการเปลี่ยนแปลงข้อมูลมีปุ่ม "เลิกทำ" 8 วินาที โดยเก็บสำเนาก่อนเปลี่ยนไว้ในหน่วยความจำ */
export default function DataSection() {
  const todayISO = useToday()
  const persistent = useStoragePersistent()
  const persisted = usePersisted()
  const { ui, patch } = useUiState()
  const { show } = useSnackbar()
  const fileInput = useRef(null)
  // หนึ่งแผงเปิดได้ครั้งละอัน: null | { type: 'clear' } | { type: 'error', message } | { type: 'preview', parsed }
  const [panel, setPanel] = useState(null)

  const undoable = (message, before) =>
    show(message, { actionLabel: 'เลิกทำ', onAction: () => writeAll(before), duration: 8000 })

  const backup = async () => {
    const data = readAll()
    if (isEmptyData(data)) {
      show('ยังไม่มีข้อมูลให้สำรอง')
      return false
    }
    const text = JSON.stringify(buildBackup(data), null, 2)
    const result = await saveTextFile(backupFileName(), text)
    if (result === 'cancelled') return false
    patch({ lastBackupAt: new Date().toISOString() })
    show(result === 'shared' ? 'ส่งไฟล์สำรองแล้ว' : 'สำรองข้อมูลแล้ว')
    return true
  }

  const chooseFile = async (event) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file) return
    try {
      const result = parseBackup(await readFileText(file))
      setPanel(
        result.ok ? { type: 'preview', parsed: result } : { type: 'error', message: result.error },
      )
    } catch {
      setPanel({ type: 'error', message: 'อ่านไฟล์ไม่ได้ ลองเลือกไฟล์ใหม่' })
    }
    input.value = '' // เลือกไฟล์เดิมซ้ำได้อีก
  }

  const restore = (mode) => {
    const before = readAll()
    const { parsed } = panel
    const next =
      mode === 'merge' ? mergeData(before, parsed.data) : replaceData(before, parsed.data)
    writeAll(next)
    setPanel(null)
    if (mode === 'merge') {
      const addedTasks = next.tasks.length - before.tasks.length
      const addedNotes = next.parking.length - before.parking.length
      undoable(
        addedTasks + addedNotes === 0
          ? 'ไม่มีรายการใหม่ในไฟล์ (มีอยู่แล้วทั้งหมด)'
          : `รวมข้อมูลแล้ว: เพิ่มงาน ${addedTasks} รายการ ที่พักความคิด ${addedNotes} รายการ`,
        before,
      )
    } else {
      undoable('กู้คืนข้อมูลแล้ว (แทนที่ของเดิม)', before)
    }
  }

  const wipe = () => {
    const before = readAll()
    clearAll()
    setPanel(null)
    undoable('ล้างข้อมูลแล้ว', before)
  }

  return (
    <section aria-label="ข้อมูลของคุณ">
      <Card flush className={styles.stack}>
        <div className={styles.status}>
          <p>
            สถานะ: {persistent ? 'บันทึกลงเครื่องได้ปกติ' : 'บันทึกลงเครื่องไม่ได้ (เก็บชั่วคราว)'}
          </p>
          {persisted !== null && (
            <p className={styles.info}>
              {persisted
                ? 'เบราว์เซอร์รับปากเก็บข้อมูลไว้ถาวรแล้ว'
                : 'เบราว์เซอร์ยังไม่รับปากเก็บถาวร ข้อมูลอาจถูกล้างเมื่อพื้นที่เครื่องเหลือน้อย'}
            </p>
          )}
          <p>
            สำรองล่าสุด:{' '}
            {ui.lastBackupAt ? formatNoteTime(ui.lastBackupAt, todayISO) : 'ยังไม่เคยสำรองข้อมูล'}
          </p>
        </div>

        <div className={styles.actions}>
          <Button variant="text" icon={Download} className={styles.action} onClick={backup}>
            สำรองข้อมูล
          </Button>
          <Button
            variant="text"
            icon={Upload}
            className={styles.action}
            onClick={() => fileInput.current?.click()}
          >
            กู้คืนข้อมูล
          </Button>
          <Button
            variant="text"
            icon={Trash2}
            className={styles.action}
            onClick={() => setPanel({ type: 'clear' })}
          >
            ล้างข้อมูลทั้งหมด
          </Button>
        </div>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="เลือกไฟล์สำรอง"
          className={styles.hiddenFile}
          tabIndex={-1}
          onChange={chooseFile}
        />
      </Card>

      {panel?.type === 'error' && (
        <Card
          tone="peach"
          role="alert"
          className={styles.panel}
          style={{ marginTop: 'var(--space-3)' }}
        >
          <p className={styles.panelTitle}>กู้คืนไม่ได้</p>
          <p className={styles.panelText}>{panel.message}</p>
          <Button variant="secondary" onClick={() => setPanel(null)}>
            ปิด
          </Button>
        </Card>
      )}

      {panel?.type === 'preview' && (
        <Card tone="blue" className={styles.panel} style={{ marginTop: 'var(--space-3)' }}>
          <p className={styles.panelTitle}>พบข้อมูลในไฟล์สำรอง</p>
          <p className={styles.panelText}>
            งาน {panel.parsed.counts.tasks} รายการ · ที่พักความคิด {panel.parsed.counts.parking}{' '}
            รายการ
            {panel.parsed.exportedAt &&
              ` · สำรองเมื่อ ${formatNoteTime(panel.parsed.exportedAt, todayISO)}`}
          </p>
          {panel.parsed.skipped > 0 && (
            <p className={styles.panelText}>
              ข้าม {panel.parsed.skipped} รายการที่ข้อมูลไม่สมบูรณ์
            </p>
          )}
          <ul className={styles.list}>
            <li>
              <strong>รวม</strong> เพิ่มเฉพาะรายการที่ยังไม่มีในเครื่องนี้ ข้อมูลเดิมไม่หาย
            </li>
            <li>
              <strong>แทนที่</strong> ลบข้อมูลเดิมแล้วใช้ตามไฟล์ (เลิกทำได้ภายใน 8 วินาที)
            </li>
          </ul>
          <Button onClick={() => restore('merge')}>รวมกับข้อมูลเดิม</Button>
          <Button variant="secondary" onClick={() => restore('replace')}>
            แทนที่ข้อมูลเดิม
          </Button>
          <Button variant="text" onClick={() => setPanel(null)}>
            ยกเลิก
          </Button>
        </Card>
      )}

      {panel?.type === 'clear' && (
        <Card
          tone="peach"
          role="alertdialog"
          aria-label="ยืนยันล้างข้อมูล"
          className={styles.panel}
          style={{ marginTop: 'var(--space-3)' }}
        >
          <p className={styles.panelTitle}>ล้างข้อมูลทั้งหมดในเครื่องนี้?</p>
          <p className={styles.panelText}>
            งาน ที่พักความคิด และการตั้งค่าจะถูกลบ เลิกทำได้ภายใน 8 วินาที
            แต่ถ้าปิดหน้านี้ไปจะกู้คืนไม่ได้ ถ้าไม่แน่ใจ สำรองข้อมูลไว้ก่อน
          </p>
          <Button variant="secondary" icon={Download} onClick={backup}>
            สำรองก่อน
          </Button>
          <Button onClick={wipe}>ลบทั้งหมด</Button>
          <Button variant="text" onClick={() => setPanel(null)}>
            ยกเลิก
          </Button>
        </Card>
      )}
    </section>
  )
}
