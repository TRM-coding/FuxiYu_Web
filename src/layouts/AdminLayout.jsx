import { useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  DatabaseOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  SendOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Menu, Typography } from 'antd';
import AdminAvatar from '../components/AdminAvatar';
import { usePermission } from '../contexts/PermissionContext';
import './AdminLayout.css';

// 管理导航项：每项声明所需 manage 权限，无权限则隐藏
const adminMenuItems = [
  { label: '用户管理', key: '/admin/users', icon: <UserOutlined />, requiredPermission: 'user:manage' },
  { label: '机器管理', key: '/admin/machines', icon: <DatabaseOutlined />, requiredPermission: 'machine:manage' },
  { label: '公告管理', key: '/admin/announcements', icon: <SendOutlined />, requiredPermission: 'announcement:manage' },
  { label: '操作日志', key: '/admin/logs', icon: <FileTextOutlined />, requiredPermission: 'operation_log:manage' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { hasPermission, loaded } = usePermission();
  // 按权限过滤菜单（无对应 manage 的项不显示）
  const visibleMenuItems = adminMenuItems
    .filter(item => hasPermission(item.requiredPermission))
    .map(({ requiredPermission, ...item }) => item);
  // 路由守卫：权限加载完成后仍无任何 manage → 403（后端已兜底，这里是显示层提前拦）
  if (loaded && visibleMenuItems.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', color: '#ff4d4f', fontSize: 16 }}>
        403 · 无管理权限
      </div>
    );
  }
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTargetRef = useRef(null);
  const swipePaths = useMemo(() => ['/admin/users', '/admin/machines'], []);

  const normalizePath = (pathname) => {
    if (pathname.startsWith('/admin/users')) return '/admin/users';
    if (pathname.startsWith('/admin/machines')) return '/admin/machines';
    if (pathname.startsWith('/admin/announcements')) return '/admin/announcements';
    if (pathname.startsWith('/admin/logs')) return '/admin/logs';
    if (pathname.startsWith('/admin/profile')) return '/admin/profile';
    return pathname;
  };

  const handleNavigate = (path) => {
    navigate(path);
  };

  const handleTouchStart = (e) => {
    if (window.innerWidth > 768) return;
    const touch = e.touches?.[0];
    if (!touch) return;
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    touchStartTargetRef.current = e.target;
  };

  const handleTouchEnd = (e) => {
    if (window.innerWidth > 768) return;
    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 50 || absDx < absDy * 1.5) return;
    const startTag = touchStartTargetRef.current?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select', 'button'].includes(startTag)) return;

    const currentPath = normalizePath(location.pathname);
    const currentIndex = swipePaths.indexOf(currentPath);
    if (currentIndex < 0) return;

    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= swipePaths.length) return;

    document?.activeElement?.blur?.();
    navigate(swipePaths[nextIndex]);
  };

  const selectedKeys = location.pathname === '/admin/profile'
    ? []
    : [normalizePath(location.pathname)];

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => navigate('/admin/users')}>
          <InfoCircleOutlined className="admin-brand-icon" />
          <span className="admin-brand-copy">
            <Typography.Text strong className="admin-brand-title">Fuxi</Typography.Text>
            <Typography.Text type="secondary" className="admin-brand-subtitle">管理控制台</Typography.Text>
          </span>
        </button>

        <Menu
          className="admin-side-menu"
          mode="inline"
          selectedKeys={selectedKeys}
          items={visibleMenuItems}
          onClick={(e) => navigate(e.key)}
        />
      </aside>

      <div className="admin-mobile-topbar">
        <Menu
          className="admin-mobile-menu"
          mode="horizontal"
          selectedKeys={selectedKeys}
          items={visibleMenuItems}
          onClick={(e) => navigate(e.key)}
        />
        <AdminAvatar onNavigate={handleNavigate} />
      </div>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <Typography.Text type="secondary" className="admin-topbar-kicker">Fuxi 控制台</Typography.Text>
            <Typography.Title level={4} className="admin-topbar-title">资源与用户管理</Typography.Title>
          </div>
          <AdminAvatar onNavigate={handleNavigate} />
        </header>

        <main
          className="admin-content"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Outlet />
        </main>
      </section>
    </div>
  );
}
