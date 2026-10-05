/* ส่งไฟล์ให้ผู้ใช้เก็บ
   - iPhone/iPad: ใช้แผงแชร์ (บันทึกลง "ไฟล์" ได้) เพราะ iOS บล็อกการดาวน์โหลดโดยตรงในแอปที่ติดตั้ง
   - อื่นๆ: ดาวน์โหลดตรง
   คืน 'shared' | 'downloaded' | 'cancelled' */

import { detectIOS } from './install.js'

export async function saveTextFile(filename, text, mime = 'application/json') {
  const nav = globalThis.navigator
  const file = new File([text], filename, { type: mime })

  if (detectIOS(nav) && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: filename })
      return 'shared'
    } catch (error) {
      if (error?.name === 'AbortError') return 'cancelled' // ผู้ใช้ปิดแผงแชร์เอง
      // แชร์ไม่สำเร็จด้วยเหตุอื่น -> ลองดาวน์โหลดตรงแทน
    }
  }

  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

/** อ่านไฟล์เป็นข้อความ (มี fallback สำหรับเบราว์เซอร์ที่ไม่มี file.text()) */
export function readFileText(file) {
  if (typeof file.text === 'function') return file.text()
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}
