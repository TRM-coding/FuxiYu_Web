import { Outlet, useNavigate } from 'react-router-dom';
import NavbarAdmin from '../components/NavbarAdmin';
import AdminAvatar from '../components/AdminAvatar';

export default function AdminLayout() {
  const navigate = useNavigate();

  // 点击导航菜单或头像时的路由跳转逻辑
  const handleNavigate = (path) => {
    navigate(path);
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
        <NavbarAdmin />
        <AdminAvatar onNavigate={handleNavigate} />
      </div>

      <main style={{ padding: '20px', marginTop: '64px' }}>
        <Outlet />
      </main>
    </div>
  );
}