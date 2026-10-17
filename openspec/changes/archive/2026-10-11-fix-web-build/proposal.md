# Proposal

## Why

修复前 `npm run build` 虽成功，但报告两处「同一模块既被静态又被动态导入」的 Rollup 警告与超过 500 kB 的主包警告；当时观测主 JS 为 2353.06 kB、gzip 691.60 kB。模块边界使非当前页面及 Three viewer 随入口加载，需要修正构建组织。**该 2353.06 kB 属修复前观测值，不是本 change 的指标或验收门槛。**

## What Changes

- 统一 announcement_api 的 requestManager 与 Apply 的 validateCmdArg 导入。
- 根据路由与大型组件依赖实施实际拆包：页面组件与共同布局（`MainLayout`、`AdminLayout`）用 `React.lazy`，`LoginLayout` 内 `ModelViewer` 按需加载，three 按自发布模块边界 vendor 分片；保留现有路径、权限与业务契约。
- 撤回 LoginLayout 内新增的可见 3D 提示与播报，加载中与失败只保留保持布局尺寸的空占位；`ModelViewer` 自身 `renderDisabled` 降级语义不变。
- 比较修复前后生产构建产物，验证路由加载及现有测试。
- 同步 SPEC 与实现：22 份页面主规格的「构建归属」段落按当前实现改写（含 `frontend--page-create-container`、`frontend--page-machine-detail-page`），login/register 增加独立加载要求；移除本 change 的 `skip_specs`，改以 capability delta 表达。
- 分包原则自 `vite.config.js` 注释迁入 capability `frontend--build` 的主 SPEC 与 delta；配置只保留逻辑，不重写长注释。

## Capabilities

### New Capabilities

- `frontend--build`：新增「前端构建与分包」capability，承载告警与压缩保持默认、导入方式、按需加载与 `ModelViewer` 隔离、按实际 `manualChunks` 分包、依赖方向以产物检验后陈述等原则；分包原则由 `vite.config.js` 注释迁入该 capability 的主 SPEC 与 delta。

### Modified Capabilities

- frontend--page-login、frontend--page-register：改写「构建归属」，并新增「登录布局与 3D 预览的独立加载」。
- frontend--page-admin-logs、frontend--page-admin-profile、frontend--page-announcement-editor、frontend--page-announcements、frontend--page-apply、frontend--page-container-detail-page、frontend--page-create-image、frontend--page-deleted-containers、frontend--page-docs、frontend--page-home、frontend--page-manage-machine、frontend--page-manage-user、frontend--page-manage-user-in-table、frontend--page-not-found、frontend--page-rbac-matrix、frontend--page-settings、frontend--page-template-manager、frontend--page-user、frontend--page-create-container、frontend--page-machine-detail-page：改写「构建归属」段落（本组 20 份，与上一行 login/register 合计 22 份页面 capability）。

不在本 change 内：procedure--repository-workflow。

## Impact

范围为 Web 路由、登录布局、两处混合导入、Vite 配置、`frontend--build` 新 capability 与上述 22 份页面主规格段落。禁止通过提高告警阈值、屏蔽日志、移除功能或升级依赖隐藏构建问题。业务缺陷清单、全库 lint 清理及共享内存政策调整另行处理。