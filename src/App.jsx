import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import SnackbarProvider from './components/Snackbar.jsx'
import DayPage from './pages/DayPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ParkingPage from './pages/ParkingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

// แอปอยู่ใต้ path ย่อยของโดเมน (เช่น /todaytask/) ตาม base ของ Vite ตอนเทสต์/dev เป็น '/'
// ใส่ / ท้ายไว้ ให้หน้าแรกเป็น /todaytask/ เสมอ (ไม่ใช่ /todaytask) เพราะ service worker คุมเฉพาะใน scope /todaytask/
const basename = import.meta.env.BASE_URL

export default function App() {
  return (
    <BrowserRouter basename={basename}>
      <SnackbarProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<DayPage />} />
            <Route path="day/:date" element={<DayPage />} />
            <Route path="parking" element={<ParkingPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </SnackbarProvider>
    </BrowserRouter>
  )
}
