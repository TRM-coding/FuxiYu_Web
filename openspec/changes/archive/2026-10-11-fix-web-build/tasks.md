# Tasks

## 1. 导入与加载组织

- [x] 1.1 统一两处混合导入；主审确认业务语义保留，构建不再出现这两条 reporter 警告。
- [x] 1.2 实施页面与 Three viewer 的合理延迟加载；补充必要路由回归并记录模块边界，由实际构建包图验证入口体积下降。
- [x] 1.3 记录实现文件及不能在 DSH 沙箱执行的验证，报告不冒充运行结果。

> 实施状态（实施代理）：1.1 / 1.2 的构建判据已由主代理实测（build exit 0、两条混合导入
> 警告消失、入口包显著变小）；1.3 见 implementation-report.md。
> 第二轮（主审反馈）追加：three 按 build/core ↔ build/webgl ↔ examples 三分片、Viewer 局部
> ErrorBoundary 降级、新增失败场景回归、修正测试的 Provider/请求替身与动态导入等待。
> 第三轮（用户反馈）追加：撤回 LoginLayout 内新增的可见「3D 预览…」文案与 aria 播报，改为
> 保持布局尺寸的空占位；并按第 3 节同步 SPEC。
> 测试状态（截至本轮）：4 个 build 测试文件共 **13 例已由主代理实跑通过**
> （announcementAuthSignal 3、routeLoading 7、loginViewerLazy 2、loginViewerFailure 1），无待跑项。
> 最终验收（本轮追加）：Windows 生产构建 exit 0（3187 modules，无两条混合导入警告、无 >500 kB
> 包警告）；Linux WSL Ubuntu 生产构建 exit 0 且 chunk 文件名/体积一致；Web 严格校验 **26 items /
> 0 fail**（补齐两份页面 delta 后重验，项数不变）；`git diff --check` 通过、cached 为空。
> 产物 AST（`chunk-graph-final.log`）：115 JS chunks，无 missing static imports、无 static cycles；
> 入口 `index` 的 staticClosure 仅入口与 vendor-react，不含 ModelViewer/three；`ModelViewer` →
> vendorReact/webgl/addons/core，addons → webgl+core，webgl → core，core/react 无静态导入。
> full Web tests 第二轮以 `--maxWorkers=2` 重跑（仅限制并发，未弱化断言）：Windows
> `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s，均 **28 文件
> 156 测试全部通过（exit 0）**；此前 CreateContainer 的 5s 并发超时属历史记录，已随重跑通过。

## 2. 主代理集成验证

- [x] 2.1 Windows npm run build 成功，核对混合导入与大块警告及修复前后产物。
- [x] 2.2 运行现有 Web 测试及新增加载回归，确认原路由和权限场景。
- [x] 2.3 本地 Linux 生产构建验证，并保留真实命令及结果；不操作线上部署。
- [x] 2.4 主审 diff 与 OpenSpec 结构校验，汇总剩余问题，不自动提交后续修复。

## 3. 规格同步（SPEC 与实现保持一致）

- [x] 3.1 主 SPEC 22 份页面 capability 的「构建归属」段落改写为当前实现：页面/共同布局 `React.lazy`、
  `ModelViewer` 按需、three 按实际 `manualChunks` 进入三个 vendor chunk；删除「没有页面级 lazy
  拆包」与 2353.06 kB 旧观测，改为「预期不再出现混合导入警告」，体积/警告清单归验收报告。
- [x] 3.2 主 SPEC frontend--page-login / frontend--page-register 新增「登录布局与 3D 预览的独立加载」：
  左右并行、未就绪不阻塞表单、失败只空占位、不新增可见文案与播报、`renderDisabled` 语义保留；
  含「仍未就绪 / 正常就绪 / 导入被拒绝」三场景；匿名访问与权限策略照旧。
- [x] 3.3 移除本 change 的 `skip_specs: true`，为 22 份页面 capability 写 delta（login/register 另含
  ADDED），并新增 `frontend--build` delta；分包原则自 `vite.config.js` 注释迁入 main/delta。
- [x] 3.4 补齐残留：frontend--page-create-container、frontend--page-machine-detail-page 的主 SPEC
  「构建归属」段落已按同一口径改写并显式链接 `frontend--build`，同时新增两份 MODIFIED delta；
  原并行残留清零。