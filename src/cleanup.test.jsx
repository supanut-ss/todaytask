// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { today } from './lib/date.js'
import { cleanup, makeTask, mount, savedTasks, seedTasks } from './test-utils.jsx'

const TODAY = today()
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString()

describe('ล้างงานเสร็จเก่าอัตโนมัติ (เฟส 6)', () => {
  beforeEach(() => window.localStorage.clear())
  afterEach(async () => {
    await cleanup()
    vi.restoreAllMocks()
  })

  it('ตอนเปิดแอป: ลบงานที่เสร็จเกิน 30 วัน เก็บงานเสร็จใหม่ๆ และงานที่ยังไม่เสร็จทุกอัน', async () => {
    seedTasks([
      makeTask({ id: 'old_done', status: 'done', doneAt: daysAgo(40), date: '2026-08-01' }),
      makeTask({ id: 'new_done', status: 'done', doneAt: daysAgo(5), date: TODAY }),
      makeTask({ id: 'old_todo', date: '2025-01-01' }),
      makeTask({ id: 'today_todo', date: TODAY }),
    ])
    await mount('/')
    expect(savedTasks().map((t) => t.id)).toEqual(['new_done', 'old_todo', 'today_todo'])
  })

  it('ไม่มีอะไรต้องล้าง -> ไม่เขียน storage ซ้ำ', async () => {
    seedTasks([
      makeTask({ id: 'a', date: TODAY }),
      makeTask({ id: 'b', status: 'done', doneAt: daysAgo(3), date: TODAY }),
    ])
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    await mount('/')
    expect(setItem.mock.calls.filter(([key]) => key === 'tw:v1:tasks')).toHaveLength(0)
  })
})
