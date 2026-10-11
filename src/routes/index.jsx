// routes/index.jsx
import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
// 登录布局是入口骨架："/" 与 "/register" 的首屏都要立刻出左侧表单框架，
// 它自身只依赖 react-router 与一份 CSS（Three viewer 已在布局内部按需加载），
// 因此保持静态导入，让登录/匿名注册首屏不经过额外 chunk 往返。
import LoginLayout from '../layouts/LoginLayout'

// ── 路由级按需加载（真实拆包）─────────────────────────────────────────────
// 随入口同步加载的只有 React 运行时（vendor-react，见 vite.config.js）、路由骨架
// 与登录布局；重布局（带 antd 导航壳的 Main/Admin）与全部业务页面各自成 chunk。
// 路由树本身不变——路径、默认重定向、AdminLayout 的 403 守卫、两个独立详情页与
// 404 都仍挂在原来的 Route 上，只是渲染时机变为对应 chunk 就绪之后。
const MainLayout = lazy(() => import('../layouts/MainLayout'))
const AdminLayout = lazy(() => import('../layouts/AdminLayout'))
const Home = lazy(() => import('../pages/Home'))
const Docs = lazy(() => import('../pages/Docs'))
const NotFound = lazy(() => import('../pages/NotFound'))
const LoginBlock = lazy(() => import('../pages/Login'))
const RegisterBlock = lazy(() => import('../pages/Register'))
const Apply = lazy(() => import('../pages/Apply'))
const CreateContainer = lazy(() => import('../pages/CreateContainer'))
const CreateImage = lazy(() => import('../pages/CreateImage'))
const User = lazy(() => import('../pages/User'))
const ManageUser = lazy(() => import('../pages/ManageUser'))
const ManageMachine = lazy(() => import('../pages/ManageMachine'))
const AdminProfile = lazy(() => import('../pages/AdminProfile'))
const Announcements = lazy(() => import('../pages/Announcements'))
const AnnouncementEditor = lazy(() => import('../pages/AnnouncementEditor'))
const TemplateManager = lazy(() => import('../pages/TemplateManager'))
const AdminLogs = lazy(() => import('../pages/AdminLogs'))
const Settings = lazy(() => import('../pages/Settings'))
const DeletedContainers = lazy(() => import('../pages/DeletedContainers'))
const RbacMatrix = lazy(() => import('../pages/RbacMatrix'))
const ContainerDetailPage = lazy(() => import('../pages/ContainerDetailPage'))
const MachineDetailPage = lazy(() => import('../pages/MachineDetailPage'))

// 加载反馈：只替换 Suspense 边界内的内容，不改变权限判定与跳转策略。
const RouteLoading = () => (
  <div
    role="status"
    aria-live="polite"
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '32px 16px',
      color: '#4f6b8a',
      fontSize: 14,
      letterSpacing: '0.04em',
    }}
  >
    页面加载中…
  </div>
)

const suspense = (element) => <Suspense fallback={<RouteLoading />}>{element}</Suspense>

export default function AppRoutes() {
  return (
    <Routes>
      {/* 带导航栏的页面 */}
      <Route path="/index" element={suspense(<MainLayout />)}>
        <Route index element={suspense(<Home />)} />
        <Route path="docs" element={suspense(<Docs />)} />
        <Route path="apply" element={suspense(<Apply />)} />
        <Route path="create" element={suspense(<CreateContainer />)} />
        <Route path="images" element={suspense(<CreateImage />)} />
        <Route path="user" element={suspense(<User />)} />
      </Route>

      {/* 独立详情页：使用 Ctrl DB id，不强制展示一般导航栏 */}
      <Route path="/index/containers/:containerId" element={suspense(<ContainerDetailPage />)} />
      <Route path="/index/machines/:machineId" element={suspense(<MachineDetailPage />)} />

      {/* 带导航栏的管理页面 */}
      <Route path="/admin" element={suspense(<AdminLayout />)}>
        <Route index element={<Navigate to="users" replace />} />
        <Route path="users" element={suspense(<ManageUser />)} />
        <Route path="machines" element={suspense(<ManageMachine />)} />
        <Route path="profile" element={suspense(<AdminProfile />)} />
        <Route path="announcements" element={suspense(<Announcements />)} />
        <Route path="announcements/editor" element={suspense(<AnnouncementEditor />)} />
        <Route path="announcements/templates" element={suspense(<TemplateManager />)} />
        <Route path="logs" element={suspense(<AdminLogs />)} />
        <Route path="settings" element={suspense(<Settings />)} />
        <Route path="deleted-containers" element={suspense(<DeletedContainers />)} />
        <Route path="rbac" element={suspense(<RbacMatrix />)} />
      </Route>

      {/* 不带导航栏的页面：登录 / 匿名注册 */}
      <Route path="/" element={<LoginLayout />}>
        <Route index element={suspense(<LoginBlock />)} />
        <Route path="register" element={suspense(<RegisterBlock />)} />
      </Route>

      {/* 404 */}
      <Route path="*" element={suspense(<NotFound />)} />
    </Routes>
  )
}