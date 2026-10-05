import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { SnackbarContext } from '../lib/snackbarContext.js'
import styles from './Snackbar.module.css'

/** ครอบแอปไว้ แล้วเรียกใช้ผ่าน useSnackbar() — แสดงทีละข้อความ ข้อความใหม่ทับข้อความเก่า */
export default function SnackbarProvider({ children }) {
  const [item, setItem] = useState(null)
  const timer = useRef(null)

  const dismiss = useCallback(() => {
    clearTimeout(timer.current)
    setItem(null)
  }, [])

  const show = useCallback((message, { actionLabel, onAction, duration = 3000 } = {}) => {
    clearTimeout(timer.current)
    setItem({ message, actionLabel, onAction, key: Date.now() })
    timer.current = setTimeout(() => setItem(null), duration)
  }, [])

  useEffect(() => () => clearTimeout(timer.current), [])

  const api = useMemo(() => ({ show, dismiss }), [show, dismiss])

  return (
    <SnackbarContext.Provider value={api}>
      {children}
      <div className={styles.region} role="status" aria-live="polite">
        {item && (
          <div className={styles.bar} key={item.key}>
            <span className={styles.message}>{item.message}</span>
            {item.actionLabel && (
              <button
                type="button"
                className={styles.action}
                onClick={() => {
                  item.onAction?.()
                  dismiss()
                }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        )}
      </div>
    </SnackbarContext.Provider>
  )
}
