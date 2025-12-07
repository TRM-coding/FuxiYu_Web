import { Outlet } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin'

export default function MainLayout() {
  return (
    <div>
      <NavbarAdmin />
      <main>
        <Outlet /> {/* 渲染嵌套的子路由内容 */}
      </main>
    </div>
  )
}
