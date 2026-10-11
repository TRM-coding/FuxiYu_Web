# Design

## Context

见 proposal.md。两处模块既有静态引用又做动态引用；所有页面及登录页 Three viewer 当前进入入口依赖。现有业务规则保持由主规格承载。

## Goals / Non-Goals

目标：消除混合导入警告、实质降低入口包、验证原路由及权限行为。

不包含：业务规则修复、全库 lint 清理、依赖升级、8GB 上限政策改变。

## Decisions

- 本次两处共用模块采用一致静态导入；保留原错误传播及认证处理。该约束只针对 `requestManager` / `validateCmdArg` 与「同一模块不得静态与动态并存」，**不禁止**未来合理的普通动态 `import()`。
- 按页面实施 lazy 加载并设置适当 Suspense 边界。大型 Three viewer 延迟加载；vendor 边界按实际 `vite.config.js` `manualChunks` 配置拆分。
- 加载反馈的边界：**页面级** route element 保留一行简洁加载反馈（原任务「加载反馈应合理」）；
  **装饰性 Three viewer 舞台不新增任何可见文案或播报**——加载中与加载失败都只用保持原布局
  尺寸的空占位（`data-testid` 供测试定位），失败由 LoginLayout 内的局部 ErrorBoundary 隔离，
  不影响左侧登录 / 匿名注册表单；ModelViewer 自身既有 renderDisabled 降级文案维持原样不动。
- 保持生产告警阈值；按产物和模块依赖验证真正的拆包，不依赖隐藏告警。chunk 之间的实际依赖边须以
  产物（chunk import 关系）验证后报告；源码 re-export / import 语句不当作实际 chunk 边。
- 分包原则自 `vite.config.js` 注释迁入 capability `frontend--build` 的主 SPEC 与 delta；配置只保留逻辑，
  不重写长注释。
- 规格同步：主规格「构建归属」只写真实加载组织（页面/共同布局 `React.lazy`、`ModelViewer` 按需、
  three 按实际 `manualChunks` 进入三个 vendor chunk）与**预期**（预期不再出现混合导入警告）；
  具体 chunk 体积与警告清单属构建验收观测，记入实现报告，不写成规格指标。22 份页面主规格
  （含 `frontend--page-create-container`、`frontend--page-machine-detail-page`）同步改写；login/register
  另以「独立加载」要求描述左右两侧并行、空占位降级与"不新增可见文案"，并显式保留 `ModelViewer`
  自身降级语义。
- 局部 ErrorBoundary 可做成独立包装组件，本次选择就地实现在 `LoginLayout` 内以缩小改动面。

## Risks / Trade-offs

- 懒加载使首次访问页面有等待 → 页面级给出简洁加载反馈并保留布局及权限守卫；装饰性 viewer
  舞台只做尺寸稳定的空占位，避免把"展示扩展"混进构建组织调整。
- 规格与实现漂移 → 22 份页面主规格的「构建归属」本轮已全部同步：最后两份
  `frontend--page-create-container`、`frontend--page-machine-detail-page` 已按同一口径补齐并新增对应
  MODIFIED delta，分包原则迁入 `frontend--build`。**主 SPEC 已同步，change 尚未归档。**
- vendor 依赖环会造成初始化错误 → 静态 chunk 依赖须以产物验证（见 `frontend--build`）。
- 单个库体积可能仍超阈值 → 如不能合理拆分须报告残余警告与产物，不能提高阈值掩盖。