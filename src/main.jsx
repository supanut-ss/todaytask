import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/global.css'
import App from './App.jsx'
import { initInstall } from './lib/install.js'
import { requestPersistentStorage } from './lib/persist.js'

// ต้องเริ่มฟังก่อน React ทำงาน เพราะเบราว์เซอร์อาจส่งอีเวนต์ "ติดตั้งได้" มาเร็วมาก
initInstall()
requestPersistentStorage()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
