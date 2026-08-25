import { useMemo, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  BookOutlined,
  CodeOutlined,
  FormOutlined,
  HomeOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons';
import { Menu, Typography } from 'antd';
import UserAvatar from '../components/UserAvatar';
import './MainLayout.css';

const userMenuItems = [
  { label: '我的容器', key: '/index', icon: <HomeOutlined /> },
  { label: '创建容器', key: '/index/create', icon: <FormOutlined /> },
  { label: '环境模板', key: '/index/images', icon: <CodeOutlined /> },
  { label: '使用说明', key: '/index/docs', icon: <BookOutlined /> },
];

export default function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTargetRef = useRef(null);
  const swipePaths = useMemo(() => ['/index', '/index/create', '/index/images', '/index/docs'], []);

  const normalizePath = (pathname) => {
    if (pathname === '/index') return '/index';
    if (pathname.startsWith('/index/create')) return '/index/create';
    if (pathname.startsWith('/index/images')) return '/index/images';
    if (pathname.startsWith('/index/apply')) return '/index/apply'; // 旧链接兼容
    if (pathname.startsWith('/index/docs')) return '/index/docs';
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

  const selectedKeys = [normalizePath(location.pathname)];

  return (
    <div className="main-shell">
      <aside className="main-sidebar">
        <button className="main-brand" type="button" onClick={() => navigate('/index')}>
          <InfoCircleOutlined className="main-brand-icon" />
          <span className="main-brand-copy">
            <Typography.Text strong className="main-brand-title">Fuxi</Typography.Text>
            <Typography.Text type="secondary" className="main-brand-subtitle">用户工作区</Typography.Text>
          </span>
        </button>

        <Menu
          className="main-side-menu"
          mode="inline"
          selectedKeys={selectedKeys}
          items={userMenuItems}
          onClick={(e) => navigate(e.key)}
        />
      </aside>

      <div className="main-mobile-topbar">
        <Menu
          className="main-mobile-menu"
          mode="horizontal"
          selectedKeys={selectedKeys}
          items={userMenuItems}
          onClick={(e) => navigate(e.key)}
        />
        <UserAvatar onNavigate={handleNavigate} />
      </div>

      <section className="main-panel">
        <header className="main-topbar">
          <div>
            <Typography.Text type="secondary" className="main-topbar-kicker">Fuxi</Typography.Text>
            <Typography.Title level={4} className="main-topbar-title">容器与创建</Typography.Title>
          </div>
          <UserAvatar onNavigate={handleNavigate} />
        </header>

        <main
          className="main-content"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <Outlet />
        </main>

        <footer className="main-footer">
          本平台所有时间均以北京时间（UTC+8）显示
        </footer>
      </section>
    </div>
  );
}
