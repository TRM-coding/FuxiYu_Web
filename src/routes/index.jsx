// routes/index.jsx
import { Routes, Route } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import LoginLayout from '../layouts/LoginLayout'
import Home from '../pages/Home'
import About from '../pages/About'
import Login from '../pages/Login'
import NotFound from '../pages/NotFound'
import Apply from '../pages/Apply'

export default function AppRoutes() {
  return (
    <Routes>
      {/* 带导航栏的页面 */}
      <Route path="/" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="apply" element={<Apply />} />
      </Route>

      {/* 不带导航栏的页面 */}
      <Route path="/login" element={<LoginLayout />}>
        <Route index element={<Login />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
