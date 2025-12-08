import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, InfoCircleOutlined, FormOutlined, UserOutlined } from '@ant-design/icons';
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
    label: '容器管理',
    key: '/admin/containers',
    icon: <InfoCircleOutlined />,
  }
];

export default function NavbarAdmin() {
  const navigate = useNavigate()
  const location = useLocation()
  const [current, setCurrent] = useState(location.pathname)

  const onClick = (e) => {
    setCurrent(e.key)
    navigate(e.key)
  }

  return (
    <div className="navbarAdmin">
      <Menu
        onClick={onClick}
        selectedKeys={[current]}
        mode="horizontal"
        items={items}
        style={{ display: 'flex', justifyContent: 'center' }}  // 关键
      />
    </div>
  )
}

