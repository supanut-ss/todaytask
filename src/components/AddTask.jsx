import { useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import Button from './Button.jsx'
import TextInput from './TextInput.jsx'
import { MAX_TITLE, splitLines } from '../lib/tasks.js'
import styles from './AddTask.module.css'

/** แถว "+ เพิ่มงาน" กดแล้วเป็นช่องพิมพ์ กด Enter เพิ่มได้ต่อเนื่องหลายงาน
 *  open/onOpenChange ให้หน้าควบคุมได้ (เช่น ปุ่ม "เพิ่มงานแรก" ใน empty state) */
export default function AddTask({ label, placeholder, open, onOpenChange, onAdd }) {
  const [title, setTitle] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  const submit = (event) => {
    event.preventDefault()
    if (!title.trim()) return
    onAdd(title)
    setTitle('')
    inputRef.current?.focus() // พิมพ์งานต่อไปได้เลย
  }

  // วางข้อความหลายบรรทัด (เช่นลิสต์จากโน้ต) -> แตกเป็นงานทีละบรรทัด
  const paste = (event) => {
    const lines = splitLines(event.clipboardData?.getData('text'))
    if (lines.length < 2) return
    event.preventDefault()
    lines.forEach((line) => onAdd(line))
    setTitle('')
  }

  const close = () => {
    setTitle('')
    onOpenChange(false)
  }

  if (!open) {
    return (
      <button type="button" className={styles.open} onClick={() => onOpenChange(true)}>
        <Plus size={20} strokeWidth={2.2} aria-hidden="true" />
        {label}
      </button>
    )
  }

  return (
    <form className={styles.form} onSubmit={submit}>
      <TextInput
        ref={inputRef}
        label={label}
        hideLabel
        placeholder={placeholder}
        value={title}
        maxLength={MAX_TITLE}
        autoComplete="off"
        enterKeyHint="done"
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Escape' && close()}
        onPaste={paste}
      />
      <div className={styles.buttons}>
        <Button type="submit" disabled={!title.trim()}>
          เพิ่มงาน
        </Button>
        <Button variant="text" onClick={close}>
          ปิด
        </Button>
      </div>
    </form>
  )
}
