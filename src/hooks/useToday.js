import { useEffect, useState } from 'react'
import { msUntilNextMidnight, today } from '../lib/date.js'

/** "วันนี้" ที่อัปเดตตัวเองเมื่อข้ามเที่ยงคืน หรือเมื่อกลับมาเปิดแอปหลังพักไว้ */
export function useToday() {
  const [value, setValue] = useState(() => today())

  useEffect(() => {
    let timer
    const refresh = () => {
      setValue(today())
      clearTimeout(timer)
      timer = setTimeout(refresh, msUntilNextMidnight() + 500)
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') refresh()
    }
    timer = setTimeout(refresh, msUntilNextMidnight() + 500)
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', refresh)
    }
  }, [])

  return value
}
