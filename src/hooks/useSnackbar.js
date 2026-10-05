import { useContext } from 'react'
import { SnackbarContext } from '../lib/snackbarContext.js'

/** แสดงข้อความสั้นๆ ที่ล่างจอ
 *  show('จดไว้แล้ว')
 *  show('ลบแล้ว', { actionLabel: 'เลิกทำ', onAction: undo, duration: 5000 }) */
export function useSnackbar() {
  const ctx = useContext(SnackbarContext)
  if (!ctx) throw new Error('useSnackbar ต้องอยู่ใน <SnackbarProvider>')
  return ctx
}
