import { usePersistentState } from './usePersistentState.js'

/** งานที่ผู้ใช้เลือกว่า "ทำอยู่ตอนนี้" เก็บเป็น { id, date } (key: current)
 *  เก็บวันที่คู่ไปด้วย เพื่อให้ค่าที่เลือกไว้เมื่อวานหมดอายุเองเมื่อขึ้นวันใหม่ */
export function useCurrentTask() {
  const [preferred, setPreferred] = usePersistentState('current', null)
  const choose = (task) => setPreferred({ id: task.id, date: task.date })
  return { preferred, choose }
}
