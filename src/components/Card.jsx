import styles from './Card.module.css'

/** การ์ด  tone: white | blue | mint | peach    flush: ไม่มีระยะขอบใน (ใช้กับลิสต์) */
export default function Card({
  tone = 'white',
  flush = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const classes = [styles.card, styles[tone], flush && styles.flush, className]
    .filter(Boolean)
    .join(' ')
  return (
    <Tag className={classes} {...rest}>
      {children}
    </Tag>
  )
}
