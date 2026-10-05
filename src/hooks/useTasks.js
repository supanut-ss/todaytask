import { useMemo } from 'react'
import {
  addTask,
  moveTask,
  pruneTasks,
  removeTask,
  renameTask,
  reorderTask,
  reorderTo,
  restoreTask,
  toggleTask,
} from '../lib/tasks.js'
import { normalizeTasks } from '../lib/sanitize.js'
import { usePersistentState } from './usePersistentState.js'

const EMPTY = []

/** งานทั้งหมด (key: tasks) พร้อมการกระทำต่างๆ
 *  remove / move คืนสำเนาเดิมของงาน เพื่อให้ผู้เรียกทำ "เลิกทำ" ด้วย restore(สำเนา) ได้ */
export function useTasks() {
  const [stored, setStored] = usePersistentState('tasks', EMPTY)
  // ข้อมูลใน localStorage อาจถูกแก้/เสียจนรูปร่างผิด: กรองก่อนใช้ รายการเสียถูกข้าม ไม่ทำให้แอปล้ม
  const tasks = useMemo(() => normalizeTasks(stored), [stored])
  const setTasks = (next) =>
    setStored((raw) => {
      const clean = normalizeTasks(raw)
      return typeof next === 'function' ? next(clean) : next
    })

  return {
    tasks,
    add: (title, date) => {
      let created = null
      setTasks((all) => {
        const result = addTask(all, { title, date })
        created = result.task
        return result.tasks
      })
      return created
    },
    toggle: (id) => setTasks((all) => toggleTask(all, id)),
    rename: (id, title) => setTasks((all) => renameTask(all, id, title)),
    remove: (id) => {
      const snapshot = tasks.find((t) => t.id === id) ?? null
      setTasks((all) => removeTask(all, id))
      return snapshot
    },
    move: (id, date) => {
      const snapshot = tasks.find((t) => t.id === id) ?? null
      setTasks((all) => moveTask(all, id, date))
      return snapshot
    },
    reorder: (id, direction) => setTasks((all) => reorderTask(all, id, direction)),
    reorderTo: (id, index) => setTasks((all) => reorderTo(all, id, index)),
    restore: (snapshot) => setTasks((all) => restoreTask(all, snapshot)),
    prune: () => {
      const next = pruneTasks(tasks)
      if (next !== tasks) setTasks(next)
    },
  }
}
