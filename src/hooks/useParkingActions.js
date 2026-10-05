import { useParking } from './useParking.js'
import { useSnackbar } from './useSnackbar.js'
import { useTasks } from './useTasks.js'
import { relativeLabel } from '../lib/date.js'

/** การกระทำกับโน้ตในที่พักความคิด ใช้ร่วมกันระหว่างหน้าแรกและหน้าที่พักความคิด
 *  schedule: แปลงโน้ตเป็นงานของวันนั้น / discard: ลบ — ทั้งคู่เลิกทำได้ */
export function useParkingActions(todayISO) {
  const { notes, remove: removeNote, restore: restoreNote } = useParking()
  const { add: addTask, remove: removeTask } = useTasks()
  const { show } = useSnackbar()

  const undoable = (message, onUndo) =>
    show(message, { actionLabel: 'เลิกทำ', onAction: onUndo, duration: 5000 })

  const schedule = (note, date) => {
    const task = addTask(note.text, date)
    if (!task) return
    removeNote(note.id)
    undoable(`เพิ่มเป็นงาน${relativeLabel(date, todayISO)}แล้ว`, () => {
      removeTask(task.id)
      restoreNote(note)
    })
  }

  const discard = (note) => {
    const snapshot = removeNote(note.id)
    if (snapshot) undoable('ลบแล้ว', () => restoreNote(snapshot))
  }

  return { notes, schedule, discard }
}
