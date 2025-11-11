import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, InfoCircleOutlined, FormOutlined, LoginOutlined } from '@ant-design/icons';
import { Menu } from 'antd';
import './Navbar.css';

const items = [
  {
    label: '我的容器',
    key: '/index',
    icon: <HomeOutlined />,
  },
  {
    label: '容器申请',
    key: '/index/apply',
    icon: <FormOutlined />,
  },
  {
    label: '关于',
    key: '/index/about',
    icon: <InfoCircleOutlined />,
  },
  // {
  //   label: '个人中心',
  //   key: '/index/profile',
  //   icon: <Profile />,
  // }
];

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [current, setCurrent] = useState(location.pathname)

  const onClick = (e) => {
    setCurrent(e.key)
    navigate(e.key)
  }

  return (
    <div className="navbar">
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
