import { Component, Suspense, lazy } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import './LoginLayout.css'
// Three.js + GLTFLoader 体积大且属非关键路径（纯装饰性 3D 展示）：按需加载，
// 不再进入入口包。
const ModelViewer = lazy(() => import('../components/ModelViewer'));

// 空舞台占位：沿用 ModelViewer 容器的尺寸口径，只占位保持布局稳定，
// 不新增任何可见文案、不播报（不引入 role="status"/aria-live）。
const emptyStageStyle = {
  width: '100%',
  height: '100%',
  minHeight: '100%',
};

// 装饰性 3D 模块的局部兜底：chunk 加载失败（lazy 动态导入被拒绝）或组件渲染抛错
// 只降级右侧舞台（空占位），不向上传播；左侧登录 / 匿名注册表单与路由跳转策略
// 完全不受影响。ModelViewer 自身原有的 renderDisabled 降级语义未改动。
class ModelStageBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error('3D 预览加载失败:', error);
  }

  render() {
    if (this.state.failed) {
      return <div data-testid="model-stage-unavailable" style={emptyStageStyle} />;
    }
    return this.props.children;
  }
}

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
          <ModelStageBoundary>
            <Suspense fallback={<div data-testid="model-stage-loading" style={emptyStageStyle} />}>
              <ModelViewer modelPath="/glb.opt.glb" />
            </Suspense>
          </ModelStageBoundary>
        </div>
      </div>
    </div>
  )
}
