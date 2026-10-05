import { useEffect } from 'react'

const APP = 'ทำวันนี้'

/** ตั้งชื่อแท็บ เช่น "ที่พักความคิด | ทำวันนี้" */
export function usePageTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | ${APP}` : `${APP} | วางแผนรายวัน ทำทีละงาน`
  }, [title])
}
