import { useRegisterSW } from 'virtual:pwa-register/react'

const HOUR = 60 * 60 * 1000

/** ลงทะเบียน service worker และบอกสถานะ
 *  - needRefresh: มีเวอร์ชันใหม่รออยู่ -> ให้ผู้ใช้กด update() เอง (ไม่รีโหลดกลางงาน)
 *  - offlineReady: เก็บไฟล์แอปครบแล้ว ใช้ตอนไม่มีเน็ตได้
 *  แอปที่ติดตั้งแล้วมักเปิดค้างไว้นาน จึงเช็กเวอร์ชันใหม่ทุกชั่วโมงและตอนกลับมาเปิดหน้า */
export function useServiceWorker() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      const check = () => {
        if (navigator.onLine) registration.update().catch(() => {})
      }
      setInterval(check, HOUR)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })

  return {
    needRefresh,
    offlineReady,
    update: () => updateServiceWorker(true), // true = รีโหลดหน้าหลังเปลี่ยนเป็นเวอร์ชันใหม่
    dismissUpdate: () => setNeedRefresh(false),
    dismissOfflineReady: () => setOfflineReady(false),
  }
}
