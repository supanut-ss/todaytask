import { useId } from 'react'
import styles from './TextInput.module.css'

/** ช่องกรอกข้อความ มี label เสมอ  hideLabel: ซ่อน label จากสายตา (ยังอ่านออกเสียงได้) */
export default function TextInput({
  label,
  hideLabel = false,
  className = '',
  type = 'text',
  ref,
  ...rest
}) {
  const id = useId()
  return (
    <div className={`${styles.field} ${className}`}>
      <label htmlFor={id} className={hideLabel ? styles.hidden : styles.label}>
        {label}
      </label>
      <input id={id} ref={ref} type={type} className={styles.input} {...rest} />
    </div>
  )
}
