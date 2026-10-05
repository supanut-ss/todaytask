import { useRef, useState } from 'react'

const SWIPE_START = 12 // px ที่ขยับก่อนนับว่าเป็นการปัดแนวนอน
const SWIPE_DELETE = 90 // ปัดซ้ายเกินนี้แล้วปล่อย = ลบ
const SWIPE_MAX = 140
const DRAG_START = 6 // px ที่ขยับก่อนนับว่าเป็นการลาก (เมาส์)

const INTERACTIVE = 'button, input, textarea, select, a, form'

/** ท่าทางบนแถวงาน
 *  - นิ้ว/ปากกา: ปัดซ้ายเพื่อลบ (onSwipeDelete) แนวตั้งยังเลื่อนหน้าได้ตามปกติ
 *  - เมาส์: ลากแถวขึ้น/ลงเพื่อจัดลำดับ (onDropAt รับตำแหน่งใหม่ในกลุ่มแถวที่ data-todo="true")
 *  ทุกท่ามีทางเลือกที่เป็นปุ่มอยู่แล้ว (ปุ่ม ⋯ > ลบ / เลื่อนขึ้น / เลื่อนลง)
 *  คืน { bind, mode, offset }: bind กระจายลงบนแถว, mode = idle | swipe | drag, offset = { x, y } ที่ต้องเลื่อน */
export function useRowGestures({ enabled = true, onSwipeDelete, onDropAt }) {
  const [mode, setMode] = useState('idle')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const start = useRef(null)
  const suppressClick = useRef(false)

  const reset = () => {
    start.current = null
    setMode('idle')
    setOffset({ x: 0, y: 0 })
  }

  // ตำแหน่งใหม่ของแถวที่ลาก = จำนวนแถวอื่นที่อยู่เหนือกึ่งกลางของมันตอนนี้
  const dropIndex = (dy) => {
    const { item, rects, index } = start.current
    const own = rects[index]
    const centre = own.top + own.height / 2 + dy
    let target = 0
    rects.forEach((r, i) => {
      if (i !== index && r.top + r.height / 2 < centre) target += 1
    })
    return item ? target : index
  }

  const onPointerDown = (event) => {
    if (!enabled || event.button !== 0 || event.target.closest(INTERACTIVE)) return
    const item = event.currentTarget.closest('li')
    const siblings = item ? [...item.parentElement.querySelectorAll('li[data-todo="true"]')] : []
    start.current = {
      x: event.clientX,
      y: event.clientY,
      type: event.pointerType,
      item,
      rects: siblings.map((li) => li.getBoundingClientRect()),
      index: siblings.indexOf(item),
      mode: 'idle',
    }
  }

  const onPointerMove = (event) => {
    const s = start.current
    if (!s) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y

    if (s.mode === 'idle') {
      if (s.type === 'mouse') {
        if (onDropAt && s.index >= 0 && Math.abs(dy) > DRAG_START && Math.abs(dy) > Math.abs(dx)) {
          s.mode = 'drag'
        }
      } else if (Math.abs(dx) > SWIPE_START && Math.abs(dx) > Math.abs(dy)) {
        s.mode = dx < 0 && onSwipeDelete ? 'swipe' : 'none'
      } else if (Math.abs(dy) > SWIPE_START) {
        s.mode = 'none' // กำลังเลื่อนหน้า ปล่อยให้เบราว์เซอร์จัดการ
      }
      if (s.mode === 'swipe' || s.mode === 'drag') {
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setMode(s.mode)
      }
    }

    if (s.mode === 'swipe') setOffset({ x: Math.max(-SWIPE_MAX, Math.min(0, dx)), y: 0 })
    if (s.mode === 'drag') setOffset({ x: 0, y: dy })
  }

  const onPointerUp = (event) => {
    const s = start.current
    if (!s) return
    const dx = event.clientX - s.x
    const dy = event.clientY - s.y
    if (s.mode === 'swipe' || s.mode === 'drag') suppressClick.current = true
    if (s.mode === 'swipe' && dx <= -SWIPE_DELETE) {
      onSwipeDelete?.()
    } else if (s.mode === 'drag') {
      const target = dropIndex(dy)
      if (target !== s.index) onDropAt?.(target)
    }
    reset()
  }

  // หลังลาก/ปัด เบราว์เซอร์ยิง click ตามมา ต้องกลืนทิ้ง ไม่งั้นไปกดปุ่มใต้เมาส์โดยไม่ตั้งใจ
  const onClickCapture = (event) => {
    if (!suppressClick.current) return
    suppressClick.current = false
    event.preventDefault()
    event.stopPropagation()
  }

  return {
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: reset, onClickCapture },
    mode,
    offset,
    swipeProgress: Math.min(1, Math.abs(offset.x) / SWIPE_DELETE),
  }
}
