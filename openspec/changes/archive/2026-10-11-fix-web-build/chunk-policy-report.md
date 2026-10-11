# Chunk Policy Report — fix-web-build / frontend--build

本文件是 Web 文档收尾阶段的独占报告：分包原则从 `vite.config.js` 注释迁入 SPEC 的落点、当前验收证据、三个相关 change 的 Tasks 状态，以及未运行边界。文中构建/测试数字均为**父代理（主审）实测证据**或**只读走查**，不是本代理运行结果。

## 1. 迁移规范链接（分包原则的规范落点）

| 内容 | 落点 |
| --- | --- |
| 主 SPEC（新增 capability，完整 Requirements） | [openspec/specs/frontend--build/spec.md](../../specs/frontend--build/spec.md) |
| fix-web-build delta（`ADDED Requirements`，正文/场景同主 SPEC） | [openspec/changes/fix-web-build/specs/frontend--build/spec.md](specs/frontend--build/spec.md) |
| 配置实现（逻辑逐字未改，仅删解释性注释） | [vite.config.js](../../../vite.config.js) `build.rollupOptions.output.manualChunks` |
| 页面级「构建归属」的既有描述 | 22 份 `openspec/specs/frontend--page-*/spec.md`；其中 [frontend--page-create-container](../../specs/frontend--page-create-container/spec.md) 与 [frontend--page-machine-detail-page](../../specs/frontend--page-machine-detail-page/spec.md) 本轮显式链接本 capability |

8 条 Requirement：告警与压缩保持默认、导入方式一致（不禁止合理的普通动态 import）、页面/布局按需加载且路由不变、`ModelViewer` 独立懒加载与局部隔离、按实际 `manualChunks` 分包、依赖方向以产物检验后陈述、分包原则由规格承载、不宣称依赖减少或首屏加速。每条正文 <500 字符、含 SHALL/MUST 与 WHEN/THEN 场景。

### 1.1 与实际配置核对的分组（只读走查 `vite.config.js`）

| 模块 id 匹配 | 返回 |
| --- | --- |
| `node_modules/(react\|react-dom\|react-router\|react-router-dom\|scheduler)/` | `vendor-react`（随入口加载、可长期缓存） |
| `node_modules/three/examples/` | `vendor-three-addons` |
| `node_modules/three/build/three.module.js`（正则不锚定结尾，容忍查询后缀） | `vendor-three-webgl` |
| 其余 `node_modules/three/` | `vendor-three-core` |
| 非 `node_modules`、以及其它 `node_modules` | `undefined`（交 Rollup 自动分包） |

`node_modules/three@0.181.2` 的 `build/three.module.js` 第 6 行从 `./three.core.js` 导入；`ModelViewer.jsx` 仅从 `three` 与 `three/examples/jsm/**` 导入；Vite 7.3.6（均为只读核对）。这些是源码证据，**实际 chunk 依赖边以主审产物核对为准**。

## 2. 本轮写入清单（文档收尾，不改实现/test）

- 主 SPEC 的「构建归属」段落：`openspec/specs/frontend--page-create-container/spec.md`、`openspec/specs/frontend--page-machine-detail-page/spec.md`（仅该段落）。
- fix-web-build：`proposal.md`、`design.md`、`tasks.md`、`implementation-report.md`、新增两份页面 MODIFIED delta 与 `frontend--build` delta、本报告。
- `frontend--build` 主 SPEC 与本 change 的 delta（措辞收紧，见 §3）。
- `clarify-resource-limits-and-errors/tasks.md`、`implementation-report.md`（仅写入验收证据）。

未改任何实现或测试代码（`vite.config.js` 仅删注释、逻辑逐字未改，未在代码重写长注释）。

## 3. 从配置注释迁出的事实，与措辞收紧

**迁出（有源码依据）：**

- `vendor-react` 成员与「随入口加载、可长期缓存」的定位；three 按自身发布边界三分片；正则不锚定结尾以容忍查询后缀；其它 `node_modules` 交 Rollup 自动分包。

**按主审要求收紧、不作为事实陈述的：**

- 动态导入：规范写成「本次两处共用模块采用静态导入 / 当前页面组件与 `ModelViewer` 使用 `React.lazy`」，并显式写明「该约束 MUST NOT 解释为禁止未来合理的普通动态 `import()`」。
- 依赖方向：不再写「addons 依赖 WebGL 与 core」作为结论；改为「实际依赖边须由主审以产物（chunk import 关系）验证后报告；MUST NOT 把源码 re-export 当作实际 chunk 边，也 MUST NOT 在未检验时把『单向无环』写成事实」。
- 「原本 613.72 kB 单 chunk 目标」只作修复前观测/拆分动机；「总依赖代码减少」「首屏更快」明确 MUST NOT 宣称；chunk 体积与警告清单属验收观测，不写入规格指标。

## 4. 当前验收证据（父代理实测；本代理未运行）

- **Windows 最终 `npm run build`：exit 0（3187 modules）**，无两条混合导入警告、无 >500 kB 包警告（未调高阈值、未屏蔽）。
- 体积：入口 `index-DnRt454i.js` **24.99 kB**（gzip 8.18 kB）；随入口的 `vendor-react` **231.86 kB**；`ModelViewer` **4.80 kB**；three 分片 addons **66.97 kB** / core **206.40 kB** / webgl **339.90 kB**；其余 chunk <500 kB。
- **入口 24.99 kB 不是首屏下载总量**：首屏还含随入口的 `vendor-react` 等静态 chunk 与页面异步 chunk。
- **Linux**（本地 WSL Ubuntu，Node 22.22.3 / npm 10.9.8）：`npm ci` 391 packages / 10s，生产构建 **exit 0**，chunk 文件名与体积同 Windows，build 8.01s；`npm ci` 仅原有 `whatwg-encoding` 弃用警告，**不是** Vite 构建警告。
- 日志（UTF-16LE）：`FuxiYu_Global/bak/2026-10-11/repair-verification/windows-build-final.log`、`.../linux-build-final.log`。
- 修复前基线（历史）：build 亦 exit 0，带 2 条混合导入警告与主 JS 2353.06 kB 观测——**原构建并未失败**，该数字不是本 change 的验收门槛。
- **产物依赖图（主审 AST，`chunk-graph-final.log`）**：115 JS chunks，无 missing static imports、无 static cycles；入口 `index` 的 staticClosure 仅入口与 `vendor-react`，不含 `ModelViewer`/three；`ModelViewer` → vendorReact/webgl/addons/core，addons → webgl+core，webgl → core，core/react 无静态导入。
- **仓库检查**：`git diff --check` 通过；cached 为空。以上产物观测只记入本报告，主 SPEC 保持规范原则、不硬码这些数字。
- **full Web tests（最终）**：**28 文件 156 测试全部通过（exit 0）**，`--maxWorkers=2` **仅限制并发、未弱化断言**；Windows `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s（Global `bak/2026-10-11/repair-verification`）。

## 5. Tasks 状态

### 5.1 Web `fix-web-build`

- **代码已实现**：两处混合导入统一为静态导入；页面/共同布局 `React.lazy` + route element `Suspense`（路径、403、两详情页、404 保留）；`ModelViewer` 独立 lazy + 局部空占位；`manualChunks` 三分片。
- **测试已通过**：4 个 build 测试文件共 **13 pass**（announcementAuthSignal 3、routeLoading 7、loginViewerLazy 2、loginViewerFailure 1），无待跑项；**full Web tests 28 文件 156 测试全部通过（exit 0）**（`--maxWorkers=2` 仅限制并发、未弱化断言；Windows 103.03s / Linux 60.70s）。Web strict **26 items / 0 fail**（补齐两份页面 delta 后重验，项数不变）。Windows/Linux 生产构建 exit 0 且 chunk 一致；`git diff --check` 通过。
- **测试未完成**：无（此前 `CreateContainer` 5s 并发超时属历史记录，已随重跑通过）。
- **规格未同步**：**无残留**。两份页面主 SPEC 旧段落已改写并显式链接 `frontend--build`，对应 MODIFIED delta 新增；proposal 已把 New Capabilities 补为 `frontend--build`、Modified 补两页；20→22 已更新。
- **真正代码缺口**：无新增。已知限制：`three.core.js` 是单个模块，Rollup 不能再切分；若 tree-shaken 后仍 >500 kB，只能改用 `three/src/*` 内部路径（本 change 不做）。
- **勾选**：1.1–1.3、2.1–2.4、3.1–3.4 全部已勾；**剩余未勾项 0**。

### 5.2 Web `clarify-resource-limits-and-errors`

- **代码已实现**：配额三层/共享联动/提交阻断、限额编辑（移除 `max={8}`、降内存收敛）、错误呈现保留超限数值并分路由映射；主 SPEC 与 delta 已同步。
- **测试已通过**：定向 **16 passed**（错误弹窗 8 + ResourceLimits 8，`web-resource-cleanup-fixed.log`）；**full Web tests 28 文件 156 测试全部通过（exit 0）**（`--maxWorkers=2` 仅限制并发、未弱化断言）。首轮 20 例 13 pass / 7 fail 全在测试交互/作用域，第 2 轮已修正 3 个测试文件，**未删除或放宽断言、未改页面实现**。
- **测试未完成**：无。
- **规格未同步**：资源内容已同步，无残留；`frontend--page-create-container` / `frontend--page-machine-detail-page` 的「构建归属」已由本轮改为新口径（业务 Requirement 未动）。
- **真正代码缺口**：本轮范围内无；越界项（`ManageMachine` 登记弹窗勘误、`Apply` 展示口径、`MachineDetailModal` 只读）为既有问题/建议。
- **勾选**：1.1–1.4、2.1 全部已勾；**剩余未勾项 0**。

### 5.3 Ctrl `remove-shared-memory-hard-cap`（跨 cwd，只读）

- **代码已实现**：`services/machine_tasks.py` 移除固定 8GB 上限与组合不变量；回归与 SPEC/delta 已写。
- **测试已通过**：targeted **107 pass**；strict **27 items / 0 fail**；Ctrl 2.1 记录已综合本仓库 Windows/Linux 各 28 文件 156 测试全过。
- **测试未完成**：无业务缺口；Ctrl 全套 1048 pass / 3 fail，3 个失败均为旧文档路径不存在（`docs/testing.md`、`docs/testing_legacy_migration.md`、`test/README.md`，见 Global Q31）——**非业务失败，已作为基线记录接受，不称全绿**。
- **规格已达标**：strict 27 items / 0 fail，无残留。
- **真正代码缺口**：8GB 范围内无；已知残余（硬件漂移可留 `shared > mem`、Node `shm_size`、旧键名不落库）明确不做。
- **勾选**：1.1–1.7、2.1 全部已勾（该仓库 tasks.md 由其归属方更新）；**剩余未勾项 0**。

## 6. 未运行事实（本代理）

- 本代理未运行任何命令（build/test/lint/openspec CLI/git 均未执行），只用文件工具；执行环境限制的细节见 implementation-report.md 的历史事实。
- Web 侧验收已全部返回并通过；**没有浏览器性能计时**，故不宣称首屏更快；**没有真实 Docker / 部署端到端**（未做 Docker 构建、容器部署或线上 E2E，不涉及 SSH）。
- 状态说明：**主 SPEC 已同步，但 change 尚未归档**；不要把 OpenSpec archive 的「already exists / already applied」提示当作代码未 apply。

## 7. 边界声明

未改任何实现或测试代码；未改其它页 SPEC（仅 create-container / machine-detail-page 的构建段落）、其它 change 的业务要求与规范、`procedure--repository-workflow`。未 archive/stage/commit/push、未 SSH/GitHub、未生成 AGENT.md/AGENTS.md/OpenSpec README、未动 hooks/依赖/lockfile/其它仓库；未改任何 SPEC 规范原则。

## 8. 三个任务清单剩余项数量

| Change | 剩余未勾 | 说明 |
| --- | --- | --- |
| Web `fix-web-build` | **0** | 1.1–1.3、2.1–2.4、3.1–3.4 全部已勾 |
| Web `clarify-resource-limits-and-errors` | **0** | 1.1–1.4、2.1 全部已勾 |
| Ctrl `remove-shared-memory-hard-cap`（只读） | **0** | 1.1–1.7、2.1 全部已勾（由该仓库归属方更新；Ctrl 全套 3 个失败为旧文档路径，已记录接受） |

三个任务清单合计剩余 **0** 项。附：Ctrl 全套 1048 pass / 3 fail 的 3 个失败均为旧文档路径（非业务失败），不作为未完成项。