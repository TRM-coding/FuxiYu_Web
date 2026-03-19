import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import NavbarAdmin from '../components/NavbarAdmin';
import AdminAvatar from '../components/AdminAvatar';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const touchStartTargetRef = useRef(null);
  const touchStartTimeRef = useRef(0);
  const [menuResetToken, setMenuResetToken] = useState(0);
  const swipePaths = useMemo(() => ['/admin/users', '/admin/machines'], []);

  const normalizePath = (pathname) => {
    if (pathname.startsWith('/admin/users')) return '/admin/users';
    if (pathname.startsWith('/admin/machines')) return '/admin/machines';
    if (pathname.startsWith('/admin/profile')) return '/admin/profile';
    return pathname;
  };

  // 点击导航菜单或头像时的路由跳转逻辑
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
    touchStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    if (window.innerWidth > 768) return;
    const touch = e.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartXRef.current;
    const dy = touch.clientY - touchStartYRef.current;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    // 忽略很小水平移动
    if (absDx < 50) return;
    // 要求水平移动明显大于垂直移动
    if (absDx < absDy * 1.5) return;
    // 如果触摸起点在输入/选择/按钮等控件上，忽略导航
    const startTag = touchStartTargetRef.current?.tagName?.toLowerCase();
    if (['input', 'textarea', 'select', 'button'].includes(startTag)) return;

    if (dx === 0) return;

    const currentPath = normalizePath(location.pathname);
    const currentIndex = swipePaths.indexOf(currentPath);
    if (currentIndex < 0) return;

    const nextIndex = dx < 0 ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= swipePaths.length) return;

    if (document?.activeElement && typeof document.activeElement.blur === 'function') {
      document.activeElement.blur();
    }
    setMenuResetToken((v) => v + 1);
    navigate(swipePaths[nextIndex]);

    // 清理 touch refs
    touchStartXRef.current = 0;
    touchStartYRef.current = 0;
    touchStartTargetRef.current = null;
    touchStartTimeRef.current = 0;
  };

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
        <NavbarAdmin menuResetToken={menuResetToken} />
        <AdminAvatar onNavigate={handleNavigate} />
      </div>

      <main
        style={{ padding: '20px', marginTop: '64px', position: 'relative' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <Outlet />
      </main>
    </div>
  );
}