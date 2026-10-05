import { usePersistentState } from './usePersistentState.js'

const DEFAULT = { installDismissed: false, lastBackupAt: null }

/** สถานะหน้าจอเล็กๆ ที่ควรจำไว้ เช่น ผู้ใช้ปิดแบนเนอร์ชวนติดตั้งแล้ว และเวลาที่สำรองข้อมูลล่าสุด (key: ui ไม่รวมในไฟล์สำรอง) */
export function useUiState() {
  const [stored, setUi] = usePersistentState('ui', DEFAULT)
  const ui =
    stored && typeof stored === 'object' && !Array.isArray(stored)
      ? { ...DEFAULT, ...stored }
      : DEFAULT
  const plain = (v) => (v && typeof v === 'object' && !Array.isArray(v) ? v : {})
  return { ui, patch: (changes) => setUi((prev) => ({ ...DEFAULT, ...plain(prev), ...changes })) }
}
