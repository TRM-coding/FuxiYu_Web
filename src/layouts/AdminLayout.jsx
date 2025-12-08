import { Outlet, useNavigate } from 'react-router-dom';
import { Space, Typography, Avatar } from 'antd';
import { UserOutlined } from '@ant-design/icons';
import NavbarAdmin from '../components/NavbarAdmin';

export default function AdminLayout() {
  const navigate = useNavigate(); // 新增：路由跳转钩子

  // 点击管理员标签跳转到管理员页面
  const goToAdminProfile = () => {
    navigate('/admin/profile');
  };

  return (
    <div>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        padding: '0 20px',
        borderBottom: '1px solid #e8e8e8'
      }}>
        <div style={{ flex: 1 }}>
          <NavbarAdmin />
        </div>
        
        {/* 管理员标签添加点击跳转 */}
        <Space 
          align="center" 
          style={{ marginLeft: '20px', cursor: 'pointer' }} // 加鼠标指针提示
          onClick={goToAdminProfile}
        >
          <Avatar icon={<UserOutlined />} />
          <Typography.Text strong>管理员</Typography.Text>
        </Space>
      </div>

      <main style={{ padding: '20px' }}>
        <Outlet />
      </main>
    </div>
  );
}