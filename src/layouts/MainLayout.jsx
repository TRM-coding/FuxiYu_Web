import { Outlet, useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import UserAvatar from '../components/UserAvatar'

export default function MainLayout() {
  const navigate = useNavigate()

  // 导航处理函数
  const handleNavigate = (path) => {
    navigate(path)
  }

  return (
    <div>
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 999,
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #e8e8e8',
        backgroundColor: '#ffffff',
        height: '64px'
      }}>
        <Navbar />
        <UserAvatar onNavigate={handleNavigate} />
      </div>

      <main style={{ padding: '20px', marginTop: '64px' }}>
        <Outlet /> {/* 渲染嵌套的子路由内容 */}
      </main>
    </div>
  )
}
