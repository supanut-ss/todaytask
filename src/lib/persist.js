/* ขอให้เบราว์เซอร์เก็บข้อมูลของแอปแบบถาวร (ไม่ลบเองเมื่อพื้นที่เครื่องเหลือน้อย)
   คืน true = ได้รับแล้ว, false = ยังไม่ได้รับ, null = เบราว์เซอร์นี้ไม่รองรับ */

export async function requestPersistentStorage() {
  try {
    const storage = globalThis.navigator?.storage
    if (!storage?.persist) return null
    if (await storage.persisted()) return true
    return await storage.persist()
  } catch {
    return null
  }
}

export async function isStoragePersisted() {
  try {
    const storage = globalThis.navigator?.storage
    if (!storage?.persisted) return null
    return await storage.persisted()
  } catch {
    return null
  }
}
