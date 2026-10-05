// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { addDays, today } from '../lib/date.js'
import {
  byText,
  cleanup,
  click,
  makeTask,
  mount,
  savedTasks,
  seedTasks,
  taskTitles,
  type,
} from '../test-utils.jsx'

const TODAY = today()
const TOMORROW = addDays(TODAY, 1)
const YESTERDAY = addDays(TODAY, -1)
const t = (title, over = {}) => makeTask({ title, date: TODAY, ...over })
const input = (c) => c.querySelector('form input[type="text"]:not([placeholder^="มีอะไร"])')
const more = (c, title) => c.querySelector(`button[aria-label="ตัวเลือกของ ${title}"]`)
const counter = (c) => c.querySelector('[role="progressbar"]').previousElementSibling.textContent

describe('DayPage (เฟส 2)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('วันที่ยังไม่มีงาน: ชวนเพิ่มงานแรก แล้วเพิ่มต่อเนื่องได้หลายงาน', async () => {
    const c = await mount('/')
    expect(c.textContent).toContain('ยังไม่มีงานของวันนี้')
    expect(counter(c)).toBe('ยังไม่มีงานในวันนี้')

    await click(byText(c, 'เพิ่มงานแรก'))
    await type(input(c), 'เขียนสรุปประชุม')
    await click(byText(c, 'เพิ่มงาน'))
    expect(input(c).value).toBe('') // ช่องล้างและเปิดค้างไว้ พิมพ์งานต่อได้เลย
    await type(input(c), 'โอนค่าเช่าห้อง')
    await click(byText(c, 'เพิ่มงาน'))

    expect(taskTitles(c)).toEqual(['เขียนสรุปประชุม', 'โอนค่าเช่าห้อง'])
    expect(counter(c)).toBe('เสร็จ 0 จาก 2')
    expect(savedTasks().map((x) => [x.title, x.date, x.status])).toEqual([
      ['เขียนสรุปประชุม', TODAY, 'todo'],
      ['โอนค่าเช่าห้อง', TODAY, 'todo'],
    ])
  })

  it('ปุ่มเพิ่มงานปิดอยู่เมื่อไม่ได้พิมพ์ และปิดช่องด้วยปุ่ม "ปิด"', async () => {
    seedTasks([t('มีงานอยู่แล้ว')])
    const c = await mount('/')
    await click(byText(c, 'เพิ่มงานวันนี้'))
    await type(input(c), '   ')
    expect(byText(c, 'เพิ่มงาน').disabled).toBe(true)
    await click(byText(c, 'ปิด'))
    expect(input(c)).toBeNull()
    expect(byText(c, 'เพิ่มงานวันนี้')).toBeTruthy()
  })

  it('ติ๊กเสร็จ: นับถูก งานเสร็จไปอยู่ท้าย และยกเลิกได้', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 })])
    const c = await mount('/')
    await click(c.querySelector('button[aria-label="ติ๊กเสร็จ: ก"]'))
    expect(counter(c)).toBe('เสร็จ 1 จาก 2')
    expect(taskTitles(c)).toEqual(['ข', 'ก'])
    const undo = c.querySelector('button[aria-label="ยกเลิกเสร็จ: ก"]')
    expect(undo.getAttribute('aria-pressed')).toBe('true')
    await click(undo)
    expect(counter(c)).toBe('เสร็จ 0 จาก 2')
    expect(taskTitles(c)).toEqual(['ก', 'ข'])
  })

  it('แก้ชื่องาน', async () => {
    seedTasks([t('ชื่อเดิม')])
    const c = await mount('/')
    await click(more(c, 'ชื่อเดิม'))
    await click(byText(c, 'แก้ไข'))
    const edit = c.querySelector('input[type="text"][maxlength]:not([placeholder])')
    expect(edit.value).toBe('ชื่อเดิม')
    await type(edit, 'ชื่อใหม่')
    await click(c.querySelector('button[aria-label="บันทึกชื่อ"]'))
    expect(taskTitles(c)).toEqual(['ชื่อใหม่'])
    expect(savedTasks()[0].title).toBe('ชื่อใหม่')
  })

  it('จัดลำดับขึ้น/ลง และปุ่มที่ขอบกดไม่ได้', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 }), t('ค', { order: 2 })])
    const c = await mount('/')
    await click(more(c, 'ค'))
    expect(c.querySelector('button[aria-label="เลื่อนลง: ค"]').disabled).toBe(true)
    await click(c.querySelector('button[aria-label="เลื่อนขึ้น: ค"]'))
    expect(taskTitles(c)).toEqual(['ก', 'ค', 'ข'])
    await click(c.querySelector('button[aria-label="เลื่อนขึ้น: ค"]'))
    expect(taskTitles(c)).toEqual(['ค', 'ก', 'ข'])
    expect(c.querySelector('button[aria-label="เลื่อนขึ้น: ค"]').disabled).toBe(true)
  })

  it('ลบงาน แล้วเลิกทำคืนที่เดิม', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 }), t('ค', { order: 2 })])
    const c = await mount('/')
    await click(more(c, 'ข'))
    await click(byText(c, 'ลบ'))
    expect(taskTitles(c)).toEqual(['ก', 'ค'])
    expect(c.textContent).toContain('ลบงานแล้ว')
    await click(byText(c, 'เลิกทำ'))
    expect(taskTitles(c)).toEqual(['ก', 'ข', 'ค'])
  })

  it('ย้ายไปพรุ่งนี้: งานหายจากวันนี้ ไปโผล่ที่แถบวันพรุ่งนี้ และเลิกทำได้', async () => {
    seedTasks([t('ก')])
    const c = await mount('/')
    await click(more(c, 'ก'))
    await click(byText(c, 'ย้ายวัน'))
    await click(byText(c, 'พรุ่งนี้'))

    expect(c.textContent).toContain('ยังไม่มีงานของวันนี้')
    expect(c.textContent).toContain('ย้ายไปพรุ่งนี้แล้ว')
    expect(savedTasks()[0].date).toBe(TOMORROW)
    expect(c.querySelector('nav a[aria-label$="1 งาน"]')).toBeTruthy() // แถบวันบอกว่าพรุ่งนี้มี 1 งาน

    await click(byText(c, 'เลิกทำ'))
    expect(taskTitles(c)).toEqual(['ก'])
    expect(savedTasks()[0].date).toBe(TODAY)
  })

  it('ย้ายด้วยการเลือกวันที่เอง', async () => {
    seedTasks([t('ก')])
    const target = addDays(TODAY, 5)
    const c = await mount('/')
    await click(more(c, 'ก'))
    await click(byText(c, 'ย้ายวัน'))
    await type(c.querySelector('input[type="date"][min]'), target)
    expect(savedTasks()[0].date).toBe(target)
  })

  it('ไม่ยอมย้ายไปวันที่ผ่านมาแล้ว', async () => {
    seedTasks([t('ก')])
    const c = await mount('/')
    await click(more(c, 'ก'))
    await click(byText(c, 'ย้ายวัน'))
    await type(c.querySelector('input[type="date"][min]'), YESTERDAY)
    expect(savedTasks()[0].date).toBe(TODAY)
  })

  it('แถบเลือกวัน: 7 วัน บอกจำนวนงาน กดแล้วเปลี่ยนวัน', async () => {
    seedTasks([t('ก', { date: TOMORROW }), t('ข', { date: TOMORROW, order: 1 }), t('ค')])
    const c = await mount('/')
    const links = c.querySelectorAll('nav[aria-label="เลือกวัน"] a')
    expect(links).toHaveLength(7)
    expect(links[0].getAttribute('aria-current')).toBe('date')
    expect(links[0].getAttribute('aria-label')).toContain('1 งาน')
    expect(links[1].getAttribute('aria-label')).toContain('2 งาน')
    expect(links[2].getAttribute('aria-label')).toContain('ไม่มีงาน')

    await click(links[1])
    expect(window.location.pathname).toBe(`/day/${TOMORROW}`)
    expect(c.querySelector('h1').textContent).toBe('พรุ่งนี้')
    expect(taskTitles(c)).toEqual(['ก', 'ข'])
    expect(byText(c, 'เพิ่มงานให้พรุ่งนี้')).toBeTruthy()
  })

  it('เพิ่มงานให้พรุ่งนี้จากหน้าของพรุ่งนี้', async () => {
    const c = await mount(`/day/${TOMORROW}`)
    await click(byText(c, 'เพิ่มงานแรก'))
    await type(input(c), 'ประชุมทีม')
    await click(byText(c, 'เพิ่มงาน'))
    expect(savedTasks()[0]).toMatchObject({ title: 'ประชุมทีม', date: TOMORROW })
  })

  it('ช่องเลือกวันที่ พาไปวันนั้นได้ และเลือกวันนี้แล้วกลับ "/"', async () => {
    const far = addDays(TODAY, 20)
    const c = await mount('/')
    await type(c.querySelector('input[type="date"]:not([min])'), far)
    expect(window.location.pathname).toBe(`/day/${far}`)
    expect(c.querySelectorAll('nav[aria-label="เลือกวัน"] a')).toHaveLength(7)
    await type(c.querySelector('input[type="date"]:not([min])'), TODAY)
    expect(window.location.pathname).toBe('/')
  })

  it('วันที่ผ่านมาแล้ว: เพิ่มงานใหม่ไม่ได้ แต่จัดการงานเก่าและดึงมาทำวันนี้ได้', async () => {
    seedTasks([t('งานค้าง', { date: YESTERDAY })])
    const c = await mount(`/day/${YESTERDAY}`)
    expect(c.querySelector('h1').textContent).toBe('เมื่อวาน')
    expect(byText(c, 'เพิ่มงานให้เมื่อวาน')).toBeUndefined()
    expect(byText(c, 'เพิ่มงานแรก')).toBeUndefined()

    await click(more(c, 'งานค้าง'))
    await click(byText(c, 'ย้ายวัน'))
    await click(byText(c, 'วันนี้'))
    expect(savedTasks()[0].date).toBe(TODAY)
    expect(c.textContent).toContain('วันนั้นไม่มีงาน')
  })

  it('เปิดแผงตัวเลือกได้ทีละแถว', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 })])
    const c = await mount('/')
    await click(more(c, 'ก'))
    await click(more(c, 'ข'))
    expect(more(c, 'ก').getAttribute('aria-expanded')).toBe('false')
    expect(more(c, 'ข').getAttribute('aria-expanded')).toBe('true')
  })

  it('งานที่เสร็จแล้วไม่มีปุ่มเลื่อนขึ้น/ลง', async () => {
    seedTasks([t('ก', { status: 'done', doneAt: new Date().toISOString() })])
    const c = await mount('/')
    await click(more(c, 'ก'))
    expect(c.querySelector('button[aria-label^="เลื่อนขึ้น"]')).toBeNull()
  })
})

const TWO_DAYS_AGO = addDays(TODAY, -2)
const group = (c) => c.querySelector('section[aria-label="ค้างจากก่อนหน้า"]')
const overdueRows = (c) => [...group(c).querySelectorAll('li')]
const overdueTitles = (c) => overdueRows(c).map((li) => li.querySelector('span').textContent)
const currentCard = (c) => c.querySelector('li[aria-current="true"]')
const inGroup = (c, text) => byText(group(c), text)

describe('งานค้าง (เฟส 3)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('หน้าวันนี้แสดงงานค้างจากวันก่อน เรียงค้างนานสุดก่อน พร้อมจำนวนวันที่ค้าง', async () => {
    seedTasks([
      t('ค้างเมื่อวาน', { date: YESTERDAY }),
      t('ค้างสองวัน', { date: TWO_DAYS_AGO }),
      t('เสร็จแล้วไม่นับ', { date: YESTERDAY, status: 'done', doneAt: new Date().toISOString() }),
      t('ของวันนี้'),
    ])
    const c = await mount('/')
    expect(overdueTitles(c)).toEqual(['ค้างสองวัน', 'ค้างเมื่อวาน'])
    expect(group(c).textContent).toContain('ค้าง 2 วัน')
    expect(group(c).textContent).toContain('ค้าง 1 วัน')
    expect(group(c).querySelector('button[aria-expanded]').textContent).toContain('2')
    expect(counter(c)).toBe('เสร็จ 0 จาก 1') // งานค้างไม่ปนเข้าตัวนับของวันนี้
  })

  it('ไม่มีงานค้าง = ไม่มีกลุ่ม และไม่แสดงในหน้าวันอื่น', async () => {
    seedTasks([t('ก')])
    let c = await mount('/')
    expect(group(c)).toBeNull()
    await cleanup()
    seedTasks([t('ก', { date: YESTERDAY })])
    c = await mount(`/day/${TOMORROW}`)
    expect(group(c)).toBeNull()
    expect(currentCard(c)).toBeNull()
  })

  it('"ทำวันนี้" ดึงงานมาไว้วันนี้ได้ในแตะเดียว และเลิกทำได้', async () => {
    seedTasks([t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    await click(c.querySelector('button[aria-label="ทำวันนี้: ค้าง"]'))
    expect(group(c)).toBeNull()
    expect(savedTasks()[0].date).toBe(TODAY)
    expect(taskTitles(c)).toEqual(['ค้าง'])

    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks()[0].date).toBe(YESTERDAY)
    expect(overdueTitles(c)).toEqual(['ค้าง'])
  })

  it('เสร็จแล้ว: งานออกจากกลุ่ม แต่ยังเป็นของวันเดิม (ทำเสร็จช้า) และเลิกทำได้', async () => {
    seedTasks([t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    await click(c.querySelector('button[aria-label="ตัวเลือกของ ค้าง"]'))
    await click(inGroup(c, 'เสร็จแล้ว'))
    expect(group(c)).toBeNull()
    expect(savedTasks()[0]).toMatchObject({ status: 'done', date: YESTERDAY })
    await click(byText(c, 'เลิกทำ'))
    expect(overdueTitles(c)).toEqual(['ค้าง'])
  })

  it('เลื่อนไปพรุ่งนี้ / เลือกวันเอง และเลิกทำได้', async () => {
    seedTasks([t('ก', { date: YESTERDAY, order: 0 }), t('ข', { date: YESTERDAY, order: 1 })])
    const c = await mount('/')
    await click(c.querySelector('button[aria-label="ตัวเลือกของ ก"]'))
    await click(inGroup(c, 'เลื่อนไป'))
    await click(inGroup(c, 'พรุ่งนี้'))
    expect(savedTasks().find((x) => x.title === 'ก').date).toBe(TOMORROW)
    expect(overdueTitles(c)).toEqual(['ข'])
    await click(byText(c, 'เลิกทำ'))
    expect(savedTasks().find((x) => x.title === 'ก').date).toBe(YESTERDAY)

    const target = addDays(TODAY, 4)
    await click(c.querySelector('button[aria-label="ตัวเลือกของ ข"]'))
    await click(inGroup(c, 'เลื่อนไป'))
    await type(group(c).querySelector('input[type="date"]'), target)
    expect(savedTasks().find((x) => x.title === 'ข').date).toBe(target)
  })

  it('ลบงานค้าง แล้วเลิกทำ', async () => {
    seedTasks([t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    await click(c.querySelector('button[aria-label="ตัวเลือกของ ค้าง"]'))
    await click(inGroup(c, 'ลบ'))
    expect(savedTasks()).toEqual([])
    await click(byText(c, 'เลิกทำ'))
    expect(overdueTitles(c)).toEqual(['ค้าง'])
  })

  it('พับกลุ่มเก็บได้ และกางกลับได้', async () => {
    seedTasks([t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    const header = group(c).querySelector('button[aria-expanded]')
    expect(header.getAttribute('aria-expanded')).toBe('true')
    await click(header)
    expect(header.getAttribute('aria-expanded')).toBe('false')
    expect(overdueRows(c)).toHaveLength(0)
    await click(header)
    expect(overdueRows(c)).toHaveLength(1)
  })
})

describe('ทำอยู่ตอนนี้ (เฟส 3)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('แสดงงานแรกที่ยังไม่เสร็จ และมีป้าย "ทำอยู่" ที่แถวนั้น', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 })])
    const c = await mount('/')
    expect(currentCard(c).textContent).toContain('ก')
    expect(currentCard(c).textContent).not.toContain('ข')
    const badges = [...c.querySelectorAll('li')].filter((li) => li.textContent.includes('ทำอยู่'))
    expect(badges).toHaveLength(1)
    expect(badges[0].textContent).toContain('ก')
  })

  it('กดเสร็จแล้ว: งานถัดไปขึ้นมาแทน ตัวนับเพิ่ม และเลิกทำได้', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 })])
    const c = await mount('/')
    await click(currentCard(c).querySelector('button[aria-label^="เสร็จแล้ว:"]'))
    expect(currentCard(c).textContent).toContain('ข')
    expect(counter(c)).toBe('เสร็จ 1 จาก 2')
    expect(c.textContent).toContain('เสร็จแล้ว: ก')

    await click(byText(c, 'เลิกทำ'))
    expect(currentCard(c).textContent).toContain('ก')
    expect(counter(c)).toBe('เสร็จ 0 จาก 2')
  })

  it('เลือกงานอื่นเป็นงานปัจจุบันได้ และจำไว้แม้เปิดใหม่', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 }), t('ค', { order: 2 })])
    let c = await mount('/')
    await click(more(c, 'ค'))
    await click(c.querySelector('button[aria-label="ทำอันนี้ตอนนี้: ค"]'))
    expect(currentCard(c).textContent).toContain('ค')
    expect(JSON.parse(window.localStorage.getItem('tw:v1:current'))).toMatchObject({ date: TODAY })

    await cleanup()
    c = await mount('/')
    expect(currentCard(c).textContent).toContain('ค')
    // งานที่เป็นปัจจุบันอยู่แล้วไม่มีปุ่มเลือกซ้ำ
    await click(more(c, 'ค'))
    expect(c.querySelector('button[aria-label="ทำอันนี้ตอนนี้: ค"]')).toBeNull()
  })

  it('เสร็จงานที่เลือกไว้ -> กลับไปเริ่มจากงานแรกที่เหลือ', async () => {
    seedTasks([t('ก', { order: 0 }), t('ข', { order: 1 }), t('ค', { order: 2 })])
    const c = await mount('/')
    await click(more(c, 'ข'))
    await click(c.querySelector('button[aria-label="ทำอันนี้ตอนนี้: ข"]'))
    await click(currentCard(c).querySelector('button[aria-label^="เสร็จแล้ว:"]'))
    expect(currentCard(c).textContent).toContain('ก')
  })

  it('ค่าที่เลือกไว้เมื่อวานหมดอายุเอง', async () => {
    const [a, b] = [t('ก', { order: 0 }), t('ข', { order: 1 })]
    seedTasks([a, b])
    window.localStorage.setItem('tw:v1:current', JSON.stringify({ id: b.id, date: YESTERDAY }))
    const c = await mount('/')
    expect(currentCard(c).textContent).toContain('ก')
  })

  it('ทำครบทุกงาน: ขึ้นข้อความยินดี (ไม่มีงานค้าง)', async () => {
    seedTasks([t('ก')])
    const c = await mount('/')
    await click(currentCard(c).querySelector('button[aria-label^="เสร็จแล้ว:"]'))
    const done = c.querySelector('section[aria-label="ทำครบแล้ว"]')
    expect(done.textContent).toContain('ครบทุกงานของวันนี้แล้ว')
    expect(done.textContent).toContain('ไม่มีงานค้างด้วย')
    expect(currentCard(c)).toBeNull()
  })

  it('ทำครบวันนี้แต่ยังมีงานค้าง: บอกจำนวนที่ค้างอยู่', async () => {
    seedTasks([t('วันนี้'), t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    await click(currentCard(c).querySelector('button[aria-label^="เสร็จแล้ว:"]'))
    expect(c.querySelector('section[aria-label="ทำครบแล้ว"]').textContent).toContain(
      'ยังมีงานค้างอีก 1 งาน',
    )
  })

  it('วันนี้ไม่มีงานเลย: ไม่มีการ์ด (ใช้ empty state แทน)', async () => {
    const c = await mount('/')
    expect(currentCard(c)).toBeNull()
    expect(c.querySelector('section[aria-label="ทำครบแล้ว"]')).toBeNull()
    expect(c.textContent).toContain('ยังไม่มีงานของวันนี้')
  })

  it('มีแต่งานค้าง ไม่มีงานของวันนี้: ยังไม่ถือว่า "ครบ"', async () => {
    seedTasks([t('ค้าง', { date: YESTERDAY })])
    const c = await mount('/')
    expect(c.querySelector('section[aria-label="ทำครบแล้ว"]')).toBeNull()
    expect(group(c)).not.toBeNull()
  })
})

describe('ทางเข้าที่พักความคิด', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it('มีลิงก์ที่หน้าแรก บอกจำนวนที่จดไว้ และพาไปหน้าที่พักความคิด', async () => {
    window.localStorage.setItem(
      'tw:v1:parking',
      JSON.stringify([
        { id: 'p_1', text: 'ก', createdAt: new Date().toISOString() },
        { id: 'p_2', text: 'ข', createdAt: new Date().toISOString() },
      ]),
    )
    const c = await mount('/')
    const link = c.querySelector('a[href="/parking"]:not([aria-label])')
    expect(link.textContent).toContain('ที่พักความคิด')
    expect(link.textContent).toContain('2')
    await click(link)
    expect(window.location.pathname).toBe('/parking')
  })
})

describe('ฟีเจอร์ใหม่: สถิติ ฉลอง วางหลายบรรทัด', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  const doneTask = (title, date) =>
    t(title, { date, status: 'done', doneAt: new Date().toISOString() })

  it('แสดงสถิติทำครบติดต่อกัน และจุดเขียวที่แถบวันของวันที่ครบ', async () => {
    seedTasks([
      doneTask('เมื่อวาน', YESTERDAY),
      doneTask('วานซืน', addDays(TODAY, -2)),
      t('วันนี้'),
    ])
    const c = await mount('/')
    expect(c.textContent).toContain('ทำครบติดต่อกัน 2 วัน')
    const links = c.querySelectorAll('nav[aria-label="เลือกวัน"] a')
    expect(links[0].getAttribute('aria-label')).not.toContain('ทำครบแล้ว') // วันนี้ยังไม่ครบ
  })

  it('ไม่มีสถิติเมื่อยังไม่มีวันที่ครบ', async () => {
    seedTasks([t('ก')])
    const c = await mount('/')
    expect(c.textContent).not.toContain('ทำครบติดต่อกัน')
  })

  it('ทำครบวันนี้: การ์ดยินดีบอกสถิติ และแถบวันของวันนี้ขึ้นว่าทำครบแล้ว', async () => {
    seedTasks([doneTask('เมื่อวาน', YESTERDAY), t('ก')])
    const c = await mount('/')
    await click(currentCard(c).querySelector('button[aria-label^="เสร็จแล้ว:"]'))
    const card = c.querySelector('section[aria-label="ทำครบแล้ว"]')
    expect(card.textContent).toContain('ทำครบติดต่อกัน 2 วันแล้ว')
    expect(c.querySelector('nav[aria-label="เลือกวัน"] a').getAttribute('aria-label')).toContain(
      'ทำครบแล้ว',
    )
  })

  it('วางข้อความหลายบรรทัดในช่องเพิ่มงาน: แตกเป็นงานทีละบรรทัด', async () => {
    const c = await mount('/')
    await click(byText(c, 'เพิ่มงานแรก'))
    const text = ['- ซื้อนม', '', '• ส่งเมล', '1. โทรหาพี่'].join('\n')
    const event = new Event('paste', { bubbles: true, cancelable: true })
    event.clipboardData = { getData: () => text }
    await act(async () => input(c).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(true)
    expect(savedTasks().map((x) => x.title)).toEqual(['ซื้อนม', 'ส่งเมล', 'โทรหาพี่'])
  })

  it('วางบรรทัดเดียว: ปล่อยให้วางตามปกติ (ไม่ดักไว้)', async () => {
    const c = await mount('/')
    await click(byText(c, 'เพิ่มงานแรก'))
    const event = new Event('paste', { bubbles: true, cancelable: true })
    event.clipboardData = { getData: () => 'งานเดียว' }
    await act(async () => input(c).dispatchEvent(event))
    expect(event.defaultPrevented).toBe(false)
    expect(savedTasks()).toHaveLength(0)
  })
})

describe('ข้อมูลใน localStorage รูปร่างผิด (เฟส 7)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(cleanup)

  it.each([
    ['งานเป็นสตริง', 'tw:v1:tasks', '"ไม่ใช่ array"'],
    ['งานเป็น object', 'tw:v1:tasks', '{"a":1}'],
    ['งานเป็นตัวเลข', 'tw:v1:tasks', '42'],
    ['งานมีสมาชิก null/ตัวเลข', 'tw:v1:tasks', '[null, 7, "x", {"id":"t"}]'],
    ['โน้ตเป็นสตริง', 'tw:v1:parking', '"ไม่ใช่ array"'],
    ['โน้ตมีสมาชิกเสีย', 'tw:v1:parking', '[null, {"id":"p"}, 3]'],
    ['ui เป็นสตริง', 'tw:v1:ui', '"x"'],
    ['current เป็น array', 'tw:v1:current', '[1,2]'],
    ['settings เป็นตัวเลข', 'tw:v1:settings', '5'],
  ])('%s: ทุกหน้ายังเปิดได้ ไม่ล้ม', async (_name, key, value) => {
    window.localStorage.setItem(key, value)
    for (const [path, heading] of [
      ['/', 'วันนี้'],
      ['/parking', 'ที่พักความคิด'],
      ['/settings', 'ตั้งค่า'],
    ]) {
      const c = await mount(path)
      expect(c.querySelector('h1').textContent, `${path} / ${key}`).toBe(heading)
      await cleanup()
    }
  })

  it('ข้อมูลเสียบางส่วน: รายการดีใช้งานต่อได้ และเพิ่มงานใหม่ได้ (ข้อมูลเสียถูกกรองทิ้งตอนบันทึก)', async () => {
    seedTasks([t('งานดี'), null, 7, { id: 'x' }])
    const c = await mount('/')
    expect(taskTitles(c)).toEqual(['งานดี'])
    await click(byText(c, 'เพิ่มงานวันนี้'))
    await type(c.querySelector('form input[type="text"]:not([placeholder^="มีอะไร"])'), 'งานใหม่')
    await click(byText(c, 'เพิ่มงาน'))
    expect(taskTitles(c)).toEqual(['งานดี', 'งานใหม่'])
    expect(savedTasks().map((x) => x.title)).toEqual(['งานดี', 'งานใหม่'])
  })
})
