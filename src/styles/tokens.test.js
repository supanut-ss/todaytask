import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/* ตรวจคอนทราสต์ (WCAG) ของทุกคู่สีสำคัญ ในทุกชุด ธีม x สีไฮไลต์
   อ่านค่าจริงจาก tokens.css แล้วจำลองการซ้อนทับ (cascade) ของแอตทริบิวต์เหมือนในเบราว์เซอร์ */

const css = readFileSync(resolve(import.meta.dirname, 'tokens.css'), 'utf8').replace(
  /\/\*[\s\S]*?\*\//g,
  '',
)

function blocks() {
  const out = {}
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim().replace(/\s+/g, ' ')
    const vars = {}
    for (const v of m[2].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) vars[v[1]] = v[2].trim()
    out[selector] = vars
  }
  return out
}

function resolveTokens(theme, accent) {
  const b = blocks()
  const layers = [
    b[':root'],
    accent !== 'butter' && b[`:root[data-accent='${accent}']`],
    theme === 'dark' && b[":root[data-theme='dark']"],
    theme === 'dark' &&
      accent !== 'butter' &&
      b[`:root[data-theme='dark'][data-accent='${accent}']`],
  ].filter(Boolean)
  const tokens = Object.assign({}, ...layers)
  // แก้ var(--x) ที่อ้างถึงกันเอง
  for (const [k, v] of Object.entries(tokens)) {
    const ref = /^var\((--[\w-]+)\)$/.exec(v)
    if (ref) tokens[k] = tokens[ref[1]]
  }
  return tokens
}

const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const THEMES = ['light', 'dark']
const ACCENTS = ['butter', 'mint', 'peach']

// [ตัวอักษร/สีหน้า, พื้นหลัง, ขั้นต่ำ, คำอธิบาย]
const PAIRS = [
  ['--ink', '--bg', 4.5, 'ตัวอักษรหลักบนพื้นหน้า'],
  ['--ink', '--card', 4.5, 'ตัวอักษรหลักบนการ์ด'],
  ['--ink', '--blue', 4.5, 'ตัวอักษรบนการ์ดทำอยู่ตอนนี้/วันที่เลือก'],
  ['--ink', '--mint', 4.5, 'ตัวอักษรบนการ์ดทำครบแล้ว'],
  ['--ink', '--peach', 4.5, 'ตัวอักษรบนกลุ่มงานค้าง'],
  ['--ink-soft', '--blue', 4.5, 'ข้อความรองบนพื้นน้ำเงิน'],
  ['--ink-soft', '--mint', 4.5, 'ข้อความรองบนพื้นมิ้นต์'],
  ['--ink-soft', '--peach', 4.5, 'ข้อความรองบนพื้นพีช'],
  ['--muted', '--bg', 4.5, 'ข้อความรองบนพื้นหน้า'],
  ['--muted', '--card', 4.5, 'ข้อความรองบนการ์ด'],
  ['--on-ink', '--ink', 4.5, 'ตัวอักษรบนปุ่มหลัก'],
  ['--done-text', '--card', 4.5, 'ตัวอักษรงานที่เสร็จบนการ์ด'],
  ['--done-text', '--marker', 4.5, 'ตัวอักษรงานที่เสร็จบนไฮไลต์'],
  ['--marker', '--ink', 4.5, 'ปุ่มบน snackbar (สีไฮไลต์บนพื้นหมึก)'],
  ['--input-border', '--card', 3, 'ขอบช่องกรอกเทียบกับการ์ด'],
  ['--input-border', '--bg', 3, 'ขอบช่องกรอกเทียบกับพื้นหน้า'],
  ['--progress', '--bg', 3, 'วงโฟกัสคีย์บอร์ดบนพื้นหน้า'],
  ['--progress', '--card', 3, 'วงโฟกัสคีย์บอร์ดบนการ์ด'],
]

describe('คอนทราสต์ของสี (tokens.css)', () => {
  for (const theme of THEMES) {
    for (const accent of ACCENTS) {
      describe(`${theme} + ${accent}`, () => {
        const t = resolveTokens(theme, accent)
        for (const [fg, bg, min, why] of PAIRS) {
          it(`${why}: ${fg} / ${bg} ≥ ${min}`, () => {
            expect(t[fg], `${fg} ไม่มีค่า`).toMatch(/^#[0-9a-f]{6}$/i)
            expect(t[bg], `${bg} ไม่มีค่า`).toMatch(/^#[0-9a-f]{6}$/i)
            expect(ratio(t[fg], t[bg])).toBeGreaterThanOrEqual(min)
          })
        }
      })
    }
  }

  it('ชุดสีมืดมีครบทุกโทเค็นที่ชุดสว่างมี (ยกเว้นรูปทรง/ระยะที่ใช้ร่วมกัน)', () => {
    const b = blocks()
    const needed = [
      '--bg',
      '--card',
      '--border',
      '--input-border',
      '--ink',
      '--ink-soft',
      '--muted',
      '--on-ink',
      '--blue',
      '--mint',
      '--peach',
      '--progress',
      '--marker',
      '--done-text',
    ]
    for (const name of needed) expect(b[":root[data-theme='dark']"], name).toHaveProperty(name)
  })
})
