import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import './LoginLayout.css'
import ModelViewer from '../components/ModelViewer';

export default function LoginLayout() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const active = pathname.includes('/register') ? 'register' : 'login'

  return (
    <div className="login-layout">
      {/* 左半部分 */}
      <div className="login-left">
        <div className="login-content">
          {/* 登录 / 注册切换按钮 */}
          <div className="login-switch">
            <button
              className={`switch-btn ${active === 'login' ? 'active' : ''}`}
              onClick={() => nav('/')}
            >
              登录
            </button>
            <button
              className={`switch-btn ${active === 'register' ? 'active' : ''}`}
              onClick={() => nav('/register')}
            >
              注册
            </button>
          </div>

          {/* 表单区 */}
          <div className="login-box">
            <div className="login-box-header">
              <h2 className="login-title">{active === 'login' ? '登录' : '注册'}</h2>
            </div>
            <Outlet />
          </div>
        </div>
      </div>

      {/* 右半部分 LOGO 或空白 */}
      <div className="login-right">
        <div className="model-stage">
          <ModelViewer modelPath="/glb.opt.glb" />
        </div>
      </div>
    </div>
  )
}
