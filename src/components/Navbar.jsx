import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { HomeOutlined, InfoCircleOutlined, FormOutlined, UserOutlined } from '@ant-design/icons';
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
  // {
  //   label: '个人中心',
  //   key: '/index/user',
  //   icon: <UserOutlined />,
  // },
  {
    label: '关于',
    key: '/index/about',
    icon: <InfoCircleOutlined />,
  }
];

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()

  // 基于当前路径返回选中的菜单项
  // 当在个人中心时，返回空数组（无选中）
  const getSelectedKeys = () => {
    if (location.pathname === '/index/user') {
      return []
    }
    return [location.pathname]
  }

  const onClick = (e) => {
    navigate(e.key)
  }

  return (
    <div className="navbar">
      <Menu
        onClick={onClick}
        selectedKeys={getSelectedKeys()}
        mode="horizontal"
        items={items}
        style={{ display: 'flex', justifyContent: 'center' }}
      />
    </div>
  )
}
