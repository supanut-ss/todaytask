#!/usr/bin/env node
/* รันชุดทดสอบหน่วยทั้งหมดซ้ำในหลายเขตเวลา (วันที่/เที่ยงคืน/DST เป็นจุดที่พังง่ายที่สุดของแอปแบบนี้)
   ใช้:  npm run test:tz       (ทำงานได้ทั้ง Windows/Mac/Linux เพราะตั้งตัวแปร TZ ผ่านโค้ด ไม่ใช่คำสั่ง shell) */
import { spawnSync } from 'node:child_process'

const ZONES = [
  'Asia/Bangkok', // ผู้ใช้หลัก (UTC+7 ไม่มี DST)
  'America/New_York', // DST สหรัฐฯ
  'America/Los_Angeles', // UTC-7/-8
  'Europe/London', // UTC+0/+1
  'Pacific/Auckland', // UTC+12/+13 (วันที่ล้ำหน้าไทยเกือบครึ่งวัน)
  'Pacific/Kiritimati', // UTC+14 สุดขอบ
  'Pacific/Pago_Pago', // UTC-11 สุดขอบอีกด้าน
  'Asia/Kolkata', // UTC+5:30 (ครึ่งชั่วโมง)
]

let failed = 0
for (const tz of ZONES) {
  const run = spawnSync('npx', ['vitest', 'run', '--reporter=dot'], {
    env: { ...process.env, TZ: tz },
    encoding: 'utf8',
    shell: process.platform === 'win32',
  })
  const summary =
    /Tests\s+(.*)/.exec(run.stdout.replace(/\x1b\[[0-9;]*m/g, ''))?.[1]?.trim() ??
    run.stderr.slice(0, 200)
  const ok = run.status === 0
  if (!ok) failed++
  console.log(`${ok ? '✓' : '✗'} ${tz.padEnd(22)} ${summary}`)
  if (!ok)
    console.log(
      run.stdout
        .split('\n')
        .filter((l) => /FAIL|AssertionError|Expected|Received/.test(l))
        .slice(0, 12)
        .join('\n'),
    )
}
console.log(failed === 0 ? `\nผ่านทั้ง ${ZONES.length} เขตเวลา` : `\nไม่ผ่าน ${failed} เขตเวลา`)
process.exit(failed === 0 ? 0 : 1)
