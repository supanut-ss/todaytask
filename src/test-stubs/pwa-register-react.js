/* ตัวแทน virtual:pwa-register/react ใช้เฉพาะตอนรันเทสต์
   เทสต์ตั้งค่าเริ่มต้นได้ผ่าน globalThis.__pwa = { needRefresh, offlineReady }
   และดูจำนวนครั้งที่กด "อัปเดต" ได้จาก globalThis.__pwaUpdates */
import { useState } from 'react'

export function useRegisterSW() {
  const initial = globalThis.__pwa ?? {}
  const needRefresh = useState(Boolean(initial.needRefresh))
  const offlineReady = useState(Boolean(initial.offlineReady))
  const updateServiceWorker = async () => {
    globalThis.__pwaUpdates = (globalThis.__pwaUpdates ?? 0) + 1
  }
  return { needRefresh, offlineReady, updateServiceWorker }
}
