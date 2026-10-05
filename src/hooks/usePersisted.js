import { useEffect, useState } from 'react'
import { isStoragePersisted } from '../lib/persist.js'

/** true/false = เบราว์เซอร์รับปากเก็บข้อมูลถาวรหรือไม่, null = ยังไม่รู้หรือไม่รองรับ */
export function usePersisted() {
  const [persisted, setPersisted] = useState(null)
  useEffect(() => {
    let alive = true
    isStoragePersisted().then((value) => alive && setPersisted(value))
    return () => {
      alive = false
    }
  }, [])
  return persisted
}
