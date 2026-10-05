import { useStoragePersistent } from '../hooks/usePersistentState.js'
import Card from './Card.jsx'

/** แจ้งเมื่อบันทึกข้อมูลลงเครื่องไม่ได้ (โหมด Private / ถูกปิด / พื้นที่เต็ม) */
export default function StorageNotice() {
  const persistent = useStoragePersistent()
  if (persistent) return null
  return (
    <Card tone="peach" role="alert">
      <p style={{ fontWeight: 600 }}>บันทึกข้อมูลลงเครื่องนี้ไม่ได้</p>
      <p style={{ fontSize: 'var(--text-small)' }}>
        ข้อมูลที่จดไว้จะหายเมื่อปิดหน้านี้ ลองปิดโหมดส่วนตัว (Private)
        หรือเปิดสิทธิ์เก็บข้อมูลของเว็บไซต์ในเบราว์เซอร์
      </p>
    </Card>
  )
}
