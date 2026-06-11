// routes/index.jsx
import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from '../layouts/MainLayout'
import AdminLayout from '../layouts/AdminLayout'
import LoginLayout from '../layouts/LoginLayout'
import Home from '../pages/Home'
import About from '../pages/About'
import NotFound from '../pages/NotFound'
import LoginBlock from '../pages/Login'
import RegisterBlock from '../pages/Register'
import Apply from '../pages/Apply'
import User from '../pages/User'
import ManageUser from '../pages/ManageUser'
import ManageMachine from '../pages/ManageMachine'
import AdminProfile from '../pages/AdminProfile'
import Announcements from '../pages/Announcements'
import AnnouncementEditor from '../pages/AnnouncementEditor'
import TemplateManager from '../pages/TemplateManager'


export default function AppRoutes() {
  return (
    <Routes>
      {/* 带导航栏的页面 */}
      <Route path="/index" element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="about" element={<About />} />
        <Route path="apply" element={<Apply />} />
        <Route path="user" element={<User />} />
      </Route>

      {/* 带导航栏的管理页面 */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={<ManageUser />} />
        <Route path="machines" element={<ManageMachine />} />
        <Route path="profile" element={<AdminProfile />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="announcements/editor" element={<AnnouncementEditor />} />
        <Route path="announcements/templates" element={<TemplateManager />} />
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
