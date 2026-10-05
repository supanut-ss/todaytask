import { SearchX } from 'lucide-react'
import Button from '../components/Button.jsx'
import Card from '../components/Card.jsx'
import EmptyState from '../components/EmptyState.jsx'
import { usePageTitle } from '../hooks/usePageTitle.js'

export default function NotFoundPage() {
  usePageTitle('ไม่พบหน้านี้')
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        headingLevel={1}
        title="ไม่พบหน้านี้"
        description="ลิงก์อาจพิมพ์ผิด หรือวันที่ในลิงก์ไม่ถูกต้อง"
        action={<Button to="/">กลับหน้าแรก</Button>}
      />
    </Card>
  )
}
