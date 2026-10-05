import { useState } from 'react'
import TaskRow from './TaskRow.jsx'
import styles from './TaskList.module.css'

/** รายการงานของวันหนึ่ง (tasks เรียงพร้อมแสดงผลแล้ว) เปิดแผงตัวเลือกได้ทีละแถว */
export default function TaskList({ tasks, todayISO, currentId = null, actions }) {
  const [openId, setOpenId] = useState(null)
  const todo = tasks.filter((t) => t.status !== 'done')

  return (
    <ul className={styles.list}>
      {tasks.map((task) => {
        const index = todo.findIndex((t) => t.id === task.id)
        return (
          <TaskRow
            key={task.id}
            task={task}
            todayISO={todayISO}
            expanded={openId === task.id}
            onExpandedChange={(open) => setOpenId(open ? task.id : null)}
            canMoveUp={index > 0}
            canMoveDown={index >= 0 && index < todo.length - 1}
            isCurrent={task.id === currentId}
            onSetCurrent={actions.setCurrent ? () => actions.setCurrent(task) : undefined}
            onFinish={() => actions.finish(task)}
            onDropAt={actions.reorderTo ? (index) => actions.reorderTo(task, index) : undefined}
            onToggle={() => actions.toggle(task)}
            onRename={(title) => actions.rename(task, title)}
            onReorder={(direction) => actions.reorder(task, direction)}
            onMove={(date) => {
              setOpenId(null)
              actions.move(task, date)
            }}
            onRemove={() => {
              setOpenId(null)
              actions.remove(task)
            }}
          />
        )
      })}
    </ul>
  )
}
