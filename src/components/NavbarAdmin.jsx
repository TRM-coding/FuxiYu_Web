import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { InfoCircleOutlined, UserOutlined, SendOutlined, FileTextOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import './Navbar.css'; // 复用了同样的样式

const items = [
    {
    label: '用户管理',
    key: '/admin/users',
    icon: <UserOutlined />,
  },
    {
    label: '宿主机管理',
    key: '/admin/machines',
    icon: <InfoCircleOutlined />,
  },
  {
    label: '公告管理',
    key: '/admin/announcements',
    icon: <SendOutlined />,
  },
  {
    label: '操作日志',
    key: '/admin/logs',
    icon: <FileTextOutlined />,
  }
];

export default function NavbarAdmin({ menuResetToken = 0 }) {
  const navigate = useNavigate()
  const location = useLocation()

  // 当路径为 /admin/profile 时，selectedKeys 应为空数组（无选中）
  const getSelectedKeys = () => {
    if (location.pathname === '/admin/profile') {
      return []
    }
    return [location.pathname]
  }

  const onClick = (e) => {
    navigate(e.key)
  }

  return (
    <div className="navbarAdmin" style={{ flex: 1 }}>
      <Menu
        key={`${menuResetToken}-${location.pathname}`}
        onClick={onClick}
        selectedKeys={getSelectedKeys()}
        mode="horizontal"
        items={items}
        style={{ display: 'flex', justifyContent: 'center' }}
      />
    </div>
  )
}

