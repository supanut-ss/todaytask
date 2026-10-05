import { Link } from 'react-router-dom'
import { dayOfMonth, daysFrom, formatThai, stripStart, weekdayShort } from '../lib/date.js'
import styles from './DayStrip.module.css'

/** แถบเลือกวัน 7 วัน แต่ละวันบอกจำนวนงาน (counts: { 'YYYY-MM-DD': { total } }) */
export default function DayStrip({ selected, today, counts, pathFor }) {
  const days = daysFrom(stripStart(selected, today), 7)

  return (
    <nav aria-label="เลือกวัน" className={styles.strip}>
      {days.map((iso) => {
        const total = counts[iso]?.total ?? 0
        const complete = total > 0 && counts[iso].done === total
        const classes = [
          styles.day,
          iso === selected && styles.selected,
          iso === today && styles.today,
        ]
          .filter(Boolean)
          .join(' ')
        return (
          <Link
            key={iso}
            to={pathFor(iso)}
            className={classes}
            aria-current={iso === selected ? 'date' : undefined}
            aria-label={`${formatThai(iso)} ${total ? `${total} งาน` : 'ไม่มีงาน'}${complete ? ' ทำครบแล้ว' : ''}`}
          >
            <span className={styles.weekday}>{weekdayShort(iso)}</span>
            <span className={styles.date}>{dayOfMonth(iso)}</span>
            <span className={styles.count} aria-hidden="true">
              {total > 0 && <span className={`${styles.dot} ${complete ? styles.dotDone : ''}`} />}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
