import { useMemo } from 'react'
import { DEFAULT_SETTINGS, sanitizeSettings } from '../lib/theme.js'
import { usePersistentState } from './usePersistentState.js'

/** การตั้งค่า (key: settings) { theme, accent } ค่าที่ผิดรูปแบบถูกแทนด้วยค่าเริ่มต้นเสมอ */
export function useSettings() {
  const [stored, setStored] = usePersistentState('settings', DEFAULT_SETTINGS)
  const settings = useMemo(() => sanitizeSettings(stored), [stored])
  return {
    settings,
    update: (changes) => setStored(sanitizeSettings({ ...settings, ...changes })),
  }
}
