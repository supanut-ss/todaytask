import { useRef, useState } from 'react'
import { ArrowUp } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Button from './Button.jsx'
import TextInput from './TextInput.jsx'
import { useParking } from '../hooks/useParking.js'
import { useSnackbar } from '../hooks/useSnackbar.js'
import { MAX_TITLE } from '../lib/tasks.js'
import styles from './QuickCapture.module.css'

/** ช่องจดสิ่งที่แทรกเข้ามา ติดล่างจอทุกหน้า
 *  พิมพ์แล้วกด Enter หรือปุ่มลูกศร -> เก็บเข้าที่พักความคิดทันที โดยไม่ต้องเปลี่ยนหน้า */
export default function QuickCapture() {
  const [text, setText] = useState('')
  const inputRef = useRef(null)
  const { add } = useParking()
  const { show } = useSnackbar()
  const navigate = useNavigate()

  const submit = (event) => {
    event.preventDefault()
    if (!add(text)) return
    setText('')
    inputRef.current?.focus() // จดต่อได้เลย ไม่ต้องแตะช่องซ้ำ
    show('จดไว้แล้ว', { actionLabel: 'ดู', onAction: () => navigate('/parking') })
  }

  return (
    <div className={styles.bar}>
      <form className={styles.form} onSubmit={submit} aria-label="จดสิ่งที่แทรกเข้ามา">
        <TextInput
          ref={inputRef}
          className={styles.input}
          label="จดสิ่งที่แทรกเข้ามา"
          hideLabel
          placeholder="มีอะไรแทรกเข้ามา? จดไว้ก่อน"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={MAX_TITLE}
          enterKeyHint="send"
          autoComplete="off"
        />
        <Button
          type="submit"
          icon={ArrowUp}
          iconOnly
          aria-label="จดไว้"
          disabled={!text.trim()}
          className={styles.send}
        />
      </form>
    </div>
  )
}
