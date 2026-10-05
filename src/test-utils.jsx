import { act } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'

/* ตัวช่วยเทสต์แบบ end-to-end ใน jsdom (ไม่ต้องใช้เบราว์เซอร์จริง) */

globalThis.IS_REACT_ACT_ENVIRONMENT = true

let mounted = []

export async function mount(path = '/') {
  window.history.pushState({}, '', path)
  const container = document.createElement('div')
  document.body.appendChild(container)
  const root = createRoot(container)
  await act(async () => root.render(<App />))
  mounted.push({ root, container })
  return container
}

export async function cleanup() {
  for (const { root, container } of mounted) {
    await act(async () => root.unmount())
    container.remove()
  }
  mounted = []
}

export function typeInto(input, value) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
  setter.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

export const click = (el) => act(async () => el.click())
export const type = (el, value) => act(async () => typeInto(el, value))

/** ปุ่ม/ลิงก์ที่ข้อความตรงเป๊ะ (ไม่สนช่องว่างหัวท้าย) */
export const byText = (container, text) =>
  [...container.querySelectorAll('a,button')].find((el) => el.textContent.trim() === text)

/** ข้อความชื่องานทุกแถบตามลำดับที่แสดง */
export const taskTitles = (container) =>
  [...container.querySelectorAll('ul li > div > div > p')].map((p) => p.textContent)

/** ใส่งานลง storage ก่อนเปิดหน้า */
export function seedTasks(tasks) {
  window.localStorage.setItem('tw:v1:tasks', JSON.stringify(tasks))
}

export const makeTask = (over) => ({
  id: `t_${Math.random().toString(16).slice(2, 14)}`,
  title: 'งาน',
  status: 'todo',
  date: '2026-01-01',
  order: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  doneAt: null,
  ...over,
})

export const savedTasks = () => JSON.parse(window.localStorage.getItem('tw:v1:tasks') ?? '[]')
