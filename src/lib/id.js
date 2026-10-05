/** สร้างรหัสสั้นๆ ไม่ซ้ำ เช่น "t_3f9c1a2b" (prefix บอกชนิด: t = task, p = parking) */
export function newId(prefix) {
  const bytes = new Uint8Array(6)
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256)
  }
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}_${hex}`
}
