import { useSyncExternalStore } from 'react'
import { detectIOS, getInstallSnapshot, promptInstall, subscribeInstall } from '../lib/install.js'

/** สถานะติดตั้งแอป: { canPrompt, installed, isIOS, promptInstall }
 *  canPrompt = มีปุ่มติดตั้งของเบราว์เซอร์ให้กด (Android/Chrome/Edge) */
export function useInstall() {
  const state = useSyncExternalStore(subscribeInstall, getInstallSnapshot, getInstallSnapshot)
  return { ...state, isIOS: detectIOS(), promptInstall }
}
