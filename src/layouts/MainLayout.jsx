import { Outlet } from 'react-router-dom'
import Navbar from '../components/Navbar'

export default function MainLayout() {
  return (
    <div>
      <Navbar />
      <main>
        <Outlet /> {/* 渲染嵌套的子路由内容 */}
      </main>
    </div>
  )
}
