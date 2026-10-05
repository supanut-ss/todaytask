import { useEffect } from 'react'
import { applyTheme, prefersDarkQuery } from '../lib/theme.js'
import { useSettings } from './useSettings.js'

/** ใช้ธีมตามการตั้งค่า และเมื่อเป็น "อัตโนมัติ" ให้ตามเครื่องทันทีที่ผู้ใช้สลับโหมดมืด/สว่าง */
export function useApplyTheme() {
  const { settings } = useSettings()

  useEffect(() => {
    applyTheme(settings)
    const query = prefersDarkQuery()
    if (settings.theme !== 'auto' || !query?.addEventListener) return
    const onChange = () => applyTheme(settings)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [settings])
}
