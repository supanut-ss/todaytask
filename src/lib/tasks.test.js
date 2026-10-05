import { describe, expect, it } from 'vitest'
import {
  addTask,
  completionStreak,
  countsByDate,
  isDayComplete,
  moveTask,
  nextOrder,
  overdueTasks,
  pruneTasks,
  pickCurrent,
  removeTask,
  renameTask,
  reorderTask,
  reorderTo,
  restoreTask,
  sortTasks,
  splitLines,
  tasksOnDate,
  toggleTask,
} from './tasks.js'

const D1 = '2026-10-04'
const D2 = '2026-10-05'
const NOW = new Date('2026-10-04T03:00:00.000Z')

function build(...titles) {
  let all = []
  for (const title of titles) all = addTask(all, { title, date: D1, now: NOW }).tasks
  return all
}
const titles = (list) => list.map((t) => t.title)

describe('tasks', () => {
  it('เพิ่มงาน: ตัดช่องว่าง ลำดับต่อท้าย และไม่เพิ่มถ้าชื่อว่าง', () => {
    const { tasks, task } = addTask([], { title: '  เขียนสรุป  ', date: D1, now: NOW })
    expect(task).toMatchObject({
      title: 'เขียนสรุป',
      status: 'todo',
      date: D1,
      order: 0,
      doneAt: null,
    })
    expect(task.id).toMatch(/^t_[0-9a-f]{12}$/)
    expect(addTask(tasks, { title: 'ข้อสอง', date: D1, now: NOW }).task.order).toBe(1)
    expect(addTask(tasks, { title: '   ', date: D1 })).toEqual({ tasks, task: null })
  })

  it('จำกัดความยาวชื่อ 200 ตัวอักษร', () => {
    const { task } = addTask([], { title: 'ก'.repeat(500), date: D1 })
    expect(task.title).toHaveLength(200)
  })

  it('ลำดับของแต่ละวันแยกกัน', () => {
    const all = build('a', 'b')
    expect(nextOrder(all, D1)).toBe(2)
    expect(nextOrder(all, D2)).toBe(0)
  })

  it('ติ๊กเสร็จแล้วงานไปอยู่ท้ายลิสต์ ยกเลิกแล้วกลับที่เดิม', () => {
    const all = build('a', 'b', 'c')
    const [a, b, c] = all
    let next = toggleTask(all, a.id, NOW)
    expect(next.find((t) => t.id === a.id)).toMatchObject({
      status: 'done',
      doneAt: NOW.toISOString(),
    })
    expect(titles(tasksOnDate(next, D1))).toEqual(['b', 'c', 'a'])
    next = toggleTask(next, a.id)
    expect(next.find((t) => t.id === a.id)).toMatchObject({ status: 'todo', doneAt: null })
    expect(titles(tasksOnDate(next, D1))).toEqual(['a', 'b', 'c'])
    expect([b, c].every((t) => all.includes(t))).toBe(true) // ไม่แก้ของเดิม
  })

  it('งานที่เสร็จเรียงตามเวลาที่ติ๊ก', () => {
    let all = build('a', 'b', 'c')
    all = toggleTask(all, all[2].id, new Date('2026-10-04T05:00:00Z'))
    all = toggleTask(all, all[0].id, new Date('2026-10-04T06:00:00Z'))
    expect(titles(sortTasks(all))).toEqual(['b', 'c', 'a'])
  })

  it('นับงานต่อวัน', () => {
    let all = build('a', 'b')
    all = toggleTask(all, all[0].id, NOW)
    all = [...all, addTask([], { title: 'x', date: D2 }).task]
    expect(countsByDate(all, [D1, D2, '2026-10-06'])).toEqual({
      [D1]: { total: 2, done: 1 },
      [D2]: { total: 1, done: 0 },
      '2026-10-06': { total: 0, done: 0 },
    })
  })

  it('แก้ชื่อ: ชื่อว่างไม่เปลี่ยน', () => {
    const all = build('เดิม')
    expect(renameTask(all, all[0].id, ' ใหม่ ')[0].title).toBe('ใหม่')
    expect(renameTask(all, all[0].id, '  ')).toBe(all)
  })

  it('ลบ แล้วเลิกทำได้ (กลับเข้าที่เดิม)', () => {
    const all = build('a', 'b', 'c')
    const removed = all[1]
    const after = removeTask(all, removed.id)
    expect(titles(tasksOnDate(after, D1))).toEqual(['a', 'c'])
    expect(titles(tasksOnDate(restoreTask(after, removed), D1))).toEqual(['a', 'b', 'c'])
  })

  it('ย้ายวัน: ไปต่อท้ายของวันปลายทาง และเลิกทำคืนวันเดิมพร้อมลำดับเดิม', () => {
    let all = build('a', 'b', 'c')
    const original = all[0]
    all = moveTask(all, original.id, D2)
    expect(titles(tasksOnDate(all, D1))).toEqual(['b', 'c'])
    expect(tasksOnDate(all, D2)[0]).toMatchObject({ title: 'a', order: 0 })
    expect(titles(tasksOnDate(restoreTask(all, original), D1))).toEqual(['a', 'b', 'c'])
    expect(moveTask(all, original.id, D2)).toBe(all) // วันเดิม = ไม่ทำอะไร
    expect(moveTask(all, 'ไม่มี', D1)).toBe(all)
  })

  it('จัดลำดับขึ้น/ลง และไม่ข้ามขอบ', () => {
    let all = build('a', 'b', 'c')
    const id = (title) => all.find((t) => t.title === title).id
    all = reorderTask(all, id('c'), -1)
    expect(titles(tasksOnDate(all, D1))).toEqual(['a', 'c', 'b'])
    all = reorderTask(all, id('a'), +1)
    expect(titles(tasksOnDate(all, D1))).toEqual(['c', 'a', 'b'])
    const same = reorderTask(all, id('c'), -1) // อยู่บนสุดแล้ว
    expect(same).toBe(all)
    expect(reorderTask(all, id('b'), +1)).toBe(all) // อยู่ล่างสุดแล้ว
  })

  it('จัดลำดับข้ามงานที่เสร็จแล้ว และงานที่เสร็จจัดลำดับไม่ได้', () => {
    let all = build('a', 'b', 'c')
    all = toggleTask(all, all[1].id, NOW) // b เสร็จ
    const idOf = (title) => all.find((t) => t.title === title).id
    expect(reorderTask(all, idOf('b'), -1)).toBe(all)
    all = reorderTask(all, idOf('c'), -1) // ขึ้นข้ามไปหา a (b เสร็จแล้วไม่นับ)
    expect(titles(tasksOnDate(all, D1))).toEqual(['c', 'a', 'b'])
  })

  it('ฟังก์ชันไม่แก้รายการเดิม', () => {
    const all = Object.freeze(build('a', 'b').map((t) => Object.freeze({ ...t })))
    expect(() => {
      toggleTask(all, all[0].id)
      moveTask(all, all[0].id, D2)
      reorderTask(all, all[1].id, -1)
      renameTask(all, all[0].id, 'x')
      removeTask(all, all[0].id)
    }).not.toThrow()
  })

  describe('งานค้าง', () => {
    const TODAY = '2026-10-04'
    const mk = (title, date, extra = {}) => ({
      ...addTask([], { title, date, now: NOW }).task,
      ...extra,
    })

    it('นับเฉพาะงานที่ยังไม่เสร็จและวันก่อนวันนี้ เรียงค้างนานสุดก่อน', () => {
      const all = [
        mk('ใหม่กว่า', '2026-10-03'),
        mk('เก่าสุด', '2026-10-01', { order: 1 }),
        mk('เก่าสุดอีกอัน', '2026-10-01', { order: 0 }),
        mk('เสร็จแล้ว', '2026-10-02', { status: 'done', doneAt: NOW.toISOString() }),
        mk('ของวันนี้', TODAY),
        mk('ของพรุ่งนี้', '2026-10-05'),
      ]
      expect(titles(overdueTasks(all, TODAY))).toEqual(['เก่าสุดอีกอัน', 'เก่าสุด', 'ใหม่กว่า'])
      expect(overdueTasks([], TODAY)).toEqual([])
    })
  })

  describe('ทำอยู่ตอนนี้', () => {
    const TODAY = '2026-10-04'
    const all = () => {
      let list = []
      for (const title of ['ก', 'ข', 'ค'])
        list = addTask(list, { title, date: TODAY, now: NOW }).tasks
      return list
    }

    it('ไม่ได้เลือก: ใช้งานแรกที่ยังไม่เสร็จ', () => {
      expect(pickCurrent(all(), TODAY).title).toBe('ก')
      expect(pickCurrent([], TODAY)).toBeNull()
    })

    it('ใช้งานที่เลือกไว้ ถ้ายังใช้ได้', () => {
      const list = all()
      const pick = { id: list[1].id, date: TODAY }
      expect(pickCurrent(list, TODAY, pick).title).toBe('ข')
    })

    it('งานที่เลือกเสร็จแล้ว/ถูกลบ/เป็นของวันอื่น -> กลับไปใช้งานแรก', () => {
      const list = all()
      const done = toggleTask(list, list[1].id, NOW)
      expect(pickCurrent(done, TODAY, { id: list[1].id, date: TODAY }).title).toBe('ก')
      expect(pickCurrent(list, TODAY, { id: 'ไม่มี', date: TODAY }).title).toBe('ก')
      expect(pickCurrent(list, TODAY, { id: list[1].id, date: '2026-10-03' }).title).toBe('ก') // เลือกไว้เมื่อวาน
    })

    it('กดเสร็จงานปัจจุบัน -> งานถัดไปขึ้นมา และเมื่อหมดแล้วเป็น null', () => {
      let list = all()
      list = toggleTask(list, pickCurrent(list, TODAY).id, NOW)
      expect(pickCurrent(list, TODAY).title).toBe('ข')
      list = toggleTask(list, pickCurrent(list, TODAY).id, NOW)
      list = toggleTask(list, pickCurrent(list, TODAY).id, NOW)
      expect(pickCurrent(list, TODAY)).toBeNull()
    })
  })

  describe('ล้างงานที่เสร็จนานแล้ว', () => {
    const NOW2 = new Date('2026-10-04T00:00:00.000Z')
    const DAY = 86_400_000
    const at = (daysAgo) => new Date(NOW2.getTime() - daysAgo * DAY).toISOString()
    const mk = (title, over = {}) => ({
      ...addTask([], { title, date: '2026-09-01', now: NOW }).task,
      ...over,
    })

    it('ลบเฉพาะงานที่เสร็จนานเกิน 30 วัน', () => {
      const all = [
        mk('เสร็จ 31 วันก่อน', { status: 'done', doneAt: at(31) }),
        mk('เสร็จ 29 วันก่อน', { status: 'done', doneAt: at(29) }),
        mk('เสร็จวันนี้', { status: 'done', doneAt: at(0) }),
      ]
      expect(titles(pruneTasks(all, NOW2))).toEqual(['เสร็จ 29 วันก่อน', 'เสร็จวันนี้'])
    })

    it('งานที่ยังไม่เสร็จไม่ถูกแตะ แม้เก่ามาก', () => {
      const all = [mk('ค้างมานาน', { date: '2020-01-01' })]
      expect(pruneTasks(all, NOW2)).toBe(all)
    })

    it('ไม่มีอะไรต้องล้าง -> คืนรายการเดิมตัวเดิม (ไม่ต้องเขียนซ้ำ)', () => {
      const all = [mk('ใหม่', { status: 'done', doneAt: at(1) })]
      expect(pruneTasks(all, NOW2)).toBe(all)
      expect(pruneTasks([], NOW2)).toEqual([])
    })

    it('งานที่เสร็จแต่ไม่มีเวลาเสร็จ/เวลาเสีย -> เก็บไว้ ไม่เดาเอง', () => {
      const all = [
        mk('ไม่มีเวลา', { status: 'done', doneAt: null }),
        mk('เวลาเสีย', { status: 'done', doneAt: 'x' }),
      ]
      expect(pruneTasks(all, NOW2)).toBe(all)
    })

    it('ตัวเลือกจำนวนวัน', () => {
      const all = [mk('ก', { status: 'done', doneAt: at(10) })]
      expect(pruneTasks(all, NOW2, 7)).toEqual([])
      expect(pruneTasks(all, NOW2, 30)).toBe(all)
    })
  })
})

describe('ลากจัดลำดับ (reorderTo)', () => {
  it('ย้ายไปตำแหน่งที่ต้องการ และเลขลำดับต่อเนื่อง', () => {
    const all = build('ก', 'ข', 'ค', 'ง')
    const id = all.find((x) => x.title === 'ง').id
    expect(titles(tasksOnDate(reorderTo(all, id, 1), D1))).toEqual(['ก', 'ง', 'ข', 'ค'])
    const first = all.find((x) => x.title === 'ก').id
    expect(titles(tasksOnDate(reorderTo(all, first, 99), D1))).toEqual(['ข', 'ค', 'ง', 'ก'])
  })

  it('ตำแหน่งเดิม/งานที่เสร็จแล้ว/ไม่มีงานนั้น: ไม่เปลี่ยน', () => {
    const all = build('ก', 'ข')
    expect(reorderTo(all, all[0].id, 0)).toBe(all)
    expect(reorderTo(all, 'ไม่มี', 0)).toBe(all)
    const done = toggleTask(all, all[0].id, NOW)
    expect(reorderTo(done, all[0].id, 1)).toBe(done)
  })
})

describe('สถิติทำครบติดต่อกัน', () => {
  const T = '2026-10-10'
  const day = (date, ...states) =>
    states.map((status, i) => ({
      id: `${date}-${i}`,
      title: `งาน${i}`,
      status,
      date,
      order: i,
      createdAt: `${date}T01:00:00.000Z`,
      doneAt: status === 'done' ? `${date}T05:00:00.000Z` : null,
    }))

  it('วันครบ = มีงานและเสร็จทุกงาน', () => {
    const all = [...day('2026-10-09', 'done', 'done'), ...day('2026-10-08', 'done', 'todo')]
    expect(isDayComplete(all, '2026-10-09')).toBe(true)
    expect(isDayComplete(all, '2026-10-08')).toBe(false)
    expect(isDayComplete(all, '2026-10-07')).toBe(false) // ไม่มีงานเลย
  })

  it('นับย้อนจากวันนี้ที่ครบ', () => {
    const all = [...day(T, 'done'), ...day('2026-10-09', 'done'), ...day('2026-10-08', 'done')]
    expect(completionStreak(all, T)).toBe(3)
  })

  it('วันนี้ยังไม่ครบ: นับจากเมื่อวาน ไม่ทำให้สถิติขาด', () => {
    const all = [
      ...day(T, 'done', 'todo'),
      ...day('2026-10-09', 'done'),
      ...day('2026-10-08', 'done'),
    ]
    expect(completionStreak(all, T)).toBe(2)
  })

  it('วันที่ขาด (ไม่ครบ/ไม่มีงาน) ตัดสถิติ', () => {
    const all = [
      ...day(T, 'done'),
      ...day('2026-10-09', 'done', 'todo'),
      ...day('2026-10-08', 'done'),
    ]
    expect(completionStreak(all, T)).toBe(1)
    expect(completionStreak([], T)).toBe(0)
  })
})

describe('แยกข้อความหลายบรรทัด (splitLines)', () => {
  it('ตัดสัญลักษณ์นำหน้าและบรรทัดว่าง', () => {
    const text = ['- ซื้อนม', '', '• ส่งเมล', '1. โทรหาพี่', '2) จ่ายบิล', '  งานธรรมดา  '].join(
      '\n',
    )
    expect(splitLines(text)).toEqual(['ซื้อนม', 'ส่งเมล', 'โทรหาพี่', 'จ่ายบิล', 'งานธรรมดา'])
  })

  it('บรรทัดเดียว/ว่าง/เกินจำนวนสูงสุด', () => {
    expect(splitLines('งานเดียว')).toEqual(['งานเดียว'])
    expect(splitLines(' \n ')).toEqual([])
    expect(splitLines(null)).toEqual([])
    const many = Array.from({ length: 80 }, (_, i) => `ข${i}`).join('\n')
    expect(splitLines(many)).toHaveLength(50)
  })
})
