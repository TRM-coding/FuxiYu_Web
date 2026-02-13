import { Button } from 'antd';
import { HomeOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import './NotFound.css';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div className="notfound-page">
      <div className="notfound-card">
        <div className="notfound-code">404</div>
        <h1 className="notfound-title">页面走丢了</h1>
        <p className="notfound-desc">你访问的页面不存在，可能已被移动或删除。</p>
        <Button
          type="primary"
          icon={<HomeOutlined />}
          size="large"
          onClick={() => navigate('/index')}
        >
          回到主页
        </Button>
      </div>
    </div>
  )
}