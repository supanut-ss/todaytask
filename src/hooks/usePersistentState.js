import { useCallback, useSyncExternalStore } from 'react'
import * as storage from '../lib/storage.js'

/** state ที่ผูกกับ storage: อ่าน/เขียนผ่าน storage.js และซิงค์ข้ามแท็บให้อัตโนมัติ
 *  สำคัญ: fallback ต้องเป็นค่าคงที่ (ประกาศนอกคอมโพเนนต์) ไม่ใช่ [] ที่สร้างใหม่ทุกครั้ง */
export function usePersistentState(name, fallback) {
  const value = useSyncExternalStore(
    (callback) => storage.subscribe(name, callback),
    () => storage.read(name, fallback),
    () => fallback,
  )

  const setValue = useCallback(
    (next) => {
      const current = storage.read(name, fallback)
      return storage.write(name, typeof next === 'function' ? next(current) : next)
    },
    [name, fallback],
  )

  return [value, setValue]
}

/** true = บันทึกลงเครื่องได้ปกติ */
export function useStoragePersistent() {
  return useSyncExternalStore(storage.subscribeStatus, storage.isPersistent, () => true)
}
