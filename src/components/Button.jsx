import { Link } from 'react-router-dom'
import styles from './Button.module.css'

/** ปุ่มมาตรฐานของแอป (สูงอย่างน้อย 44px)
 *  variant: primary | secondary | soft | text     size: md | lg
 *  ใส่ to="/path" เพื่อให้เป็นลิงก์ที่หน้าตาเป็นปุ่ม
 *  ปุ่มที่มีแต่ไอคอนต้องใส่ aria-label เสมอ */
export default function Button({
  variant = 'primary',
  size = 'md',
  icon: Icon,
  iconOnly = false,
  block = false,
  to,
  type = 'button',
  className = '',
  children,
  ...rest
}) {
  // ปุ่มไอคอนล้วน: ใส่ title เท่ากับ aria-label ให้เห็นคำอธิบายเมื่อชี้เมาส์
  if (iconOnly && rest['aria-label'] && rest.title === undefined)
    rest = { ...rest, title: rest['aria-label'] }

  const classes = [
    styles.button,
    styles[variant],
    size === 'lg' && styles.lg,
    iconOnly && styles.iconOnly,
    block && styles.block,
    className,
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {Icon && <Icon size={size === 'lg' ? 20 : 18} strokeWidth={2.2} aria-hidden="true" />}
      {children}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    )
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  )
}
