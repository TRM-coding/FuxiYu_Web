import { Outlet } from 'react-router-dom'

export default function LoginLayout() {
  return (
    <div>
      <Outlet /> {/* 登录页面内容会在这里显示 */}
    </div>
  )
}
