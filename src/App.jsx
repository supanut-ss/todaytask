import { BrowserRouter, Route, Routes } from 'react-router-dom'
import AppShell from './components/AppShell.jsx'
import SnackbarProvider from './components/Snackbar.jsx'
import DayPage from './pages/DayPage.jsx'
import NotFoundPage from './pages/NotFoundPage.jsx'
import ParkingPage from './pages/ParkingPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'

export default function App() {
  return (
    <BrowserRouter>
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
