// routes/index.jsx
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginLayout from '../layouts/LoginLayout'
import Home from '../pages/Home'
import About from '../pages/About'
import NotFound from '../pages/NotFound'
import LoginBlock from '../pages/Login.jsx'
import RegisterBlock from '../pages/Register.jsx'
import UserInfoFrame from '../pages/User.jsx'
import Apply from '../pages/Apply'
import User from '../pages/User'

export default function AppRoutes() {
  return (
    <Routes>
      {/* 带导航栏的页面 */}
      <Route path="/index" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="apply" element={<Apply />} />
        <Route path="user" element={<UserInfoFrame />} />
      </Route>

      {/* 不带导航栏的页面 */}
      <Route path="/" element={<LoginLayout />}>
        <Route index element={<LoginBlock />} />
        <Route path="register" element={<RegisterBlock />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
