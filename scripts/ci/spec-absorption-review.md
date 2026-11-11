# Web 规范吸收审查记录（两轨）

主审说明：以下保留 DSH 原始过程记录。主审随后修正了部分语义及检查能力表述，条款数量也可能因拆分改变；本报告不作为实施或验收依据，现行规则以本仓库 `openspec/specs` 为准。

范围：`E:\AI\Fuxi\FuxiYu_Web`（FuxiYu_Web，业务按页面）
本文性质：**过程记录，不是 SPEC**；不放入 `openspec/`，不构成新增或替代规范。

本文件包含两条独立吸收线：

- **轨 A**：Global 旧业务 SPEC 退役吸收（`Global/openspec/changes` 下 12 份 `spec.md`），需核对本仓库业务源码。
- **轨 B**：已移除的 `AGENTS.md` / `AGENT.md` 中的 hook、commit、PR 代码规范吸收，落地为本仓库单篇流程规范。

上轮已完成并保留的第三部分（Global **新建**流程规范退役的判定）记于 §5；那一部分的结论（不吸收、并列出清理项）不变。

---

## 0. 结论

| 轨 | 结论 | 产物 |
| --- | --- | --- |
| A | 4 处最小吸收，其余条目判定为已覆盖/未实现/不适用/冲突 | 编辑 4 份既有业务 `spec.md`（不增删改名 capability） |
| B | 规范类要求综合成本地单篇流程规范（不搬 Global 三篇） | 新增 `openspec/specs/procedure--repository-workflow/spec.md` |
| 上轮（Global 新建流程规范） | 不吸收，保留清理项报告 | 无 |

新增 capability 数量：1（`procedure--repository-workflow`）；既有 22 份 `frontend--page-*` 的名称与数量未变，未新增、未删除、未改名。未改动任何业务代码。

---

## 1. 判定标准

- 只吸收「Global 旧业务条目中与本仓库有关、且本仓库代码已实现、而既有 SPEC 未覆盖」的事实；每条吸收都能指向本仓库源码行。
- 已覆盖的不重复；未实现、过时或与本仓库现状相冲突的，MUST NOT 写成现状需求，只登记理由与代码路径。
- 不复制 Global 文件、不新建业务 capability、不借机修业务代码；Container 大规模细节扩展仍暂缓。
- 规范类条款不得混入业务表或类型契约，只进单篇流程规范。
- 不声称脚本能验证未实现的检查（提交信息的中文真实性、PR 标题等）。

---

## 2. 现状取证（上轮保留，行号均为本次读取时状态）

- `openspec/specs` 原为 22 个目录，全部 `frontend--page-*`；`src/pages/*.jsx` 22 个，与 22 份 SPEC 一一对应；`src/routes/index.jsx:33-68` 装配 21 条路由，`ManageUserInTable.jsx` 为页面组件。
- 22 份 SPEC 的 `## Source references` 三类链接目标均存在（`FuxiYu_Global/QUESTIONS.md`、页面 jsx 与 routes、`src/test/`、`vite.config.js`）。
- 「21 个测试文件」与 `src/test/` 实际一致（22 个文件中 `setup.js` 非测试）。
- 三份退役流程规范在 `FuxiYu_Global\bak\2026-10-11\retired-global-standards\openspec\specs\`；`FuxiYu_Global\openspec` 目录已不存在。
- 会话期间被外部并发改写（非本人）：`scripts/ci/check_pr.py`（351→372 行，改为中英双语四栏）、`.github/pull_request_template.md`（21→24 行）、`.github/workflows/pr-format.yml:59`（摘要 `59c1b7b8…`→`18c7f5a2…`）、`githooks/*` 的 Global 指向、`AGENTS.md` 删除。

---

## 3. 轨 A：Global 旧业务 SPEC 逐条判定

来源目录：`E:\AI\Fuxi\FuxiYu_Global\bak\2026-10-11\Global\openspec\changes\`，共 12 份 `spec.md`。

### 3.1 `container-image-provenance/specs/container-image-provenance/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 容器记录构建版本戳（`:3-17`） | 不适用（Ctrl 数据职责） | Web 不读写容器构建版本戳；`CreateImage.jsx:110`、`CreateContainer.jsx:29` 仅把模板 `updated_at` 透传进展示模型 |
| 落后判据由版本戳比较（`:19-37`） | 不适用（Ctrl/Node 判定） | 全 `src` 无「容器版本戳 vs 模板版本」的比较逻辑 |
| 运行基底展示唯取容器侧留痕（`:39-67`） | **吸收（Web 侧）** | `src/pages/ContainerDetailPage.jsx:648-657` 原样展示容器详情下发的 `image_dockerfile`，页面不按当前模板重渲染 |
| 留存配方输入而非渲染结果（`:69-101`） | 不适用（Ctrl 落库规则） | Web 只提交 `base_image`/`dockerfile_body`（`CreateImage.jsx:288-314`） |
| 镜像标签可推导且不落库（`:103-125`） | 不适用（Ctrl/Node） | Web 无标签构造代码 |

### 3.2 `container-image-provenance/specs/image-template-lifecycle/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 移除是停用而非删除（`:3-24`） | 已覆盖 | `frontend--page-create-image/spec.md:20`「删除为停用」；`CreateImage.jsx:89-98` 状态文案 `disabled: '停用'` |
| 停用状态在业务读点一致生效（`:26-44`） | **吸收（Web 侧：模板选择读点）** | `CreateContainer.jsx:141-147` 只保留 `status === 'ready'`，选中项变非 ready 时清空 |
| 管理路径仍能取到已停用模板（`:46-62`） | 不适用（Ctrl 原语查询）；Web 管理页表现得当 | `CreateImage.jsx:429` 管理列表仍列出并标注停用状态 |
| 停用可撤销（`:64-78`） | 已覆盖 | `CreateImage.jsx:477-484` 状态可切回 `ready`/`draft`（`status` 三态可编辑，已有 SPEC:20 记为「维护 …status」） |
| 模板名唯一性由应用层保证（`:80-94`） | 不适用（Ctrl + DB） | Web 无唯一性判定 |
| 内置模板收敛（`:96-118`） | 不适用（Ctrl SEED） | Web 无内置模板收敛逻辑 |

### 3.3 `container-image-provenance/specs/container-image-binding/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 归属由外键保持完整（`:3-19`） | 不适用（DB 约束） | —— |
| 创建容器必须指定镜像归属（`:21-47`） | 已覆盖 + 吸收 | `frontend--page-create-container/spec.md:20`「镜像使用 image_id」；`CreateContainer.jsx:323` 提交 `image_id`；不可用模板过滤见 3.2 吸收项 |
| 运行镜像由平台解析、调用方不得指定（`:49-59`） | 已符合/不适用 | Web 不发送镜像名，仅发 `image_id`（`CreateContainer.jsx:13, 323`；`container_api.jsx` 创建入参） |
| 存量容器归属回填（`:61-87`） | 不适用（一次性迁移） | —— |

### 3.4 `container-image-provenance/specs/container-image-restore/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 恢复以留痕为前提（`:3-13`） | 不适用（Ctrl 判定） | —— |
| 内容来源由模板状态与新鲜度判定（`:15-51`） | 不适用（Ctrl 判定） | —— |
| 内容会变时不得静默替换（`:53-71`） | **吸收（Web 侧）** | `DeletedContainers.jsx:123-141` 首个响应为 `requires_choice` 时不恢复，默认预选 `snapshot`（`:131`），用户选择后带 `content_source` 重调（`container_api.jsx:322-330`） |
| 内容会变时先给人看两份内容（`:73-95`） | **吸收（Web 侧：分段与公布落点）** | `DeletedContainers.jsx:352-363` 按后端 `sections[].name` 映射基础镜像/业务片段并标有变化/无变化；`:364-379` 逐行差异就地计算；`:120-122` 注释与 `:127-137` 表明留痕只随恢复请求公布，无独立查询接口 |
| 恢复接口入参与响应形状固定（`:97-120`） | 已覆盖 | `frontend--page-deleted-containers/spec.md:20-25` 已记 `requires_choice`/`content_source`；`container_api.jsx:322-330` |
| 恢复必须有内容可依（`:122-134`） | 不适用（Ctrl 拒绝路径）；Web 以通用错误反馈 | `DeletedContainers.jsx:142-152` 走 `showErrorModal` |
| 恢复刷新版本戳与留痕（`:136-152`） | 不适用（Ctrl） | —— |
| 恢复来源可事后分辨（`:154-164`） | 不适用（Ctrl 审计写入）；展示已覆盖 | `frontend--page-admin-logs/spec.md:20` 通用操作类型/详情映射；`AdminLogs.jsx:125` |
| 挂载行为与镜像来源无关（`:166-178`） | 不适用（Node/Ctrl） | —— |
| 容器改名不改变数据位置（`:180-188`） | 不适用（Ctrl/Node） | —— |
| 账号重建后家目录属主被修正（`:190-202`） | 不适用（Node） | —— |

### 3.5 `container-image-provenance/specs/machine-image-cache-record/spec.md`

全篇（`:3-57`）**不适用**：Ctrl 侧「派发过的构建」记录、其观测语义与不设失效逻辑均为 Ctrl 数据职责；Web 无对应读写（全 `src` 无该记录相关字段）。其中「记录不在执行链上/未命中由 Node 自愈」（`:31-45`）为 Ctrl↔Node 行为，浏览器不参与。

### 3.6 `renew-machine-trust/specs/machine-trust-renewal/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 只对已登记的机器重钉（`:3-18`） | 不适用（Ctrl 行更新语义）；Web 侧行为一致 | `MachineDetailPage.jsx:124-125` 注释「后端只更新原行，不重建档」 |
| 重抓对端证书并覆盖 pin（`:19-30`） | 不适用（Ctrl TLS 职责） | Web 无证书/pin 逻辑 |
| 失败时整体不落地（`:31-38`） | 不适用（Ctrl） | Web 仅透传失败（`MachineDetailPage.jsx:136-137`） |
| uid 按需重发（`:39-49`） | **吸收（Web 侧：结果反馈）** | `MachineDetailPage.jsx:129-133` 按响应提示「已重发身份牌」/「身份牌与对端不一致，已保留本端值」 |
| 重钉全程留痕（`:51-65`） | 不适用（Ctrl 日志写入）；展示已覆盖 | `frontend--page-admin-logs/spec.md:20`；`AdminLogs.jsx:37, 80` 有 `renew_machine_trust` 标签映射；`showErrorModal.jsx:124` 路由级错误映射 |
| 可从机器详情页触发（`:67-77`） | **吸收（Web 侧）** | `MachineDetailPage.jsx:366-372`（`machine:manage` 门槛）、`:627-650`（二次确认弹窗）、`:126-141`（成功反馈并静默刷新）、`machine_api.jsx:136-156`、`backend_config.js:48` |

### 3.7 `track-machine-last-seen/specs/machine-last-seen/spec.md`

全篇（`:3-77`）**不适用**：`last_seen_at` 的写入、启动扫描播种窗口起点、扫描先于拨号、迁移携带均为 Ctrl 职责。

- 证据：全 `src` 检索无 `last_seen`（无匹配），Web 不展示也不提交该字段。
- 「不修改结算与消费口径」（`:55-65`）的一条落地是展示侧：Web 以服务端 `cleanup_status`/`seconds_until_cleanup` 为准（`src/utils/timeFormat.js:107-115`），本地仅在缺服务端值时才用固定 7 天兜底（`timeFormat.js:117-122`，常量 `:76-77`）。兜底路径不含顺延，属**待核差异**，本次不写成现状需求（见 §7）。

### 3.8 `unify-action-task-scope/specs/machine-scope-gate/spec.md`

全篇（`:3-71`）**不适用**：管辖范畴判定与三个自动动作任务（容器清理、挂载清理、磁盘检测）的跳过、留痕口径均为 Ctrl 侧自动任务；浏览器只经 `/api` 访问 Ctrl（`README.md:28` 明确「不会让浏览器直接连接 Node」），Web 无对应入口。

### 3.9 `per-machine-node-port/specs/machine-node-endpoint/spec.md`

| Global 要求 | 本仓库判定 | 证据 |
| --- | --- | --- |
| 每台机器一个 Node 端点、默认端口回落（`:3-25`） | 不适用（Ctrl 端点解析）；Web 仅编辑该字段 | `MachineDetailPage.jsx:66, 75-77` 端口显式 `null` 表示清空回落默认 |
| 端口在机器建档时录入（`:27-41`） | 已覆盖 | `frontend--page-manage-machine/spec.md:20`「注册只发送最小信任锚 machine_name/machine_ip/description/可选 port」 |
| 三条出站路径共用端口来源（`:43-53`） | 不适用（Ctrl） | —— |
| pin 文件键统一为裸主机（`:55-65`） | 不适用（Ctrl） | —— |
| 端点变更后链路跟随（`:67-81`） | 不适用（Ctrl） | —— |
| 端点变更只改登记、不涉信任（`:83-105`） | 不适用（Ctrl）；**登记为相冲突待核项** | `MachineDetailPage.jsx:55` 注释称「IP 变更后端自动校验证书并重 pin」，与该条「MUST NOT 在变更过程中向对端取证、比对证书指纹或重写 pin」表述不一致 → 见 §7，未改代码、未写入 SPEC |

### 3.10 `defer-freeze-and-mount-windows/specs/unavailable-window-deferral/spec.md`

全篇（`:3-79`）**不适用**：顺延的覆盖范围、结算事务、起点复位归零、无顺延时行为不变，均为 Ctrl 读侧判定与结算；Web 只消费服务端下发的 `cleanup_status`/`seconds_until_cleanup`（`timeFormat.js:107-115`）与 mount 状态（`DeletedContainers.jsx:30` 升级清理标签）。

### 3.11 `reverse-wss-dial-direction/specs/node-link/spec.md`

全篇（`:3-89`）**不适用**：Ctrl 出站链路集合、对齐、退避、在线判定、快照帧消费、按机器 pin 的 TLS 信任均为 Ctrl↔Node 内部通道；Web 无 WebSocket 到 Node 的代码。

### 3.12 `reverse-wss-dial-direction/specs/node-snapshot-endpoint/spec.md`

全篇（`:3-53`）**不适用**：Node 的 `/ws/ctrl` 端点、uid 校验、周期推送与重连职责移交均为 Node 侧实现。

### 3.13 轨 A 吸收清单（最小编辑）

| 文件 | 编辑内容 | 代码证据 |
| --- | --- | --- |
| `openspec/specs/frontend--page-machine-detail-page/spec.md` | 主流程补「machine:manage 用户可发起修复连接（重钉信任锚），执行前二次确认」；新增 Scenario「确认后修复连接」（调用 `renew_machine_trust`、成功反馈含重发/不一致、静默刷新、失败经 `showErrorModal`、无权限不展示入口） | `MachineDetailPage.jsx:366-372, 627-650, 126-141`；`machine_api.jsx:136-156`；`backend_config.js:48`；`showErrorModal.jsx:124` |
| `openspec/specs/frontend--page-container-detail-page/spec.md` | 主流程补「镜像信息卡在容器详情下发 `image_dockerfile` 时原样展示（容器自身记录），不按当前模板另行渲染」 | `ContainerDetailPage.jsx:648-657` |
| `openspec/specs/frontend--page-create-container/spec.md` | 主流程补「环境模板列表只保留 status 为 ready 的模板，选中项变非 ready 时清空」；新增 Scenario「模板不在可用集合内」 | `CreateContainer.jsx:141-147` |
| `openspec/specs/frontend--page-deleted-containers/spec.md` | 主流程补「差异按 `sections` 分段标注基础镜像/业务片段并在前端计算逐行差异；留痕只随二选一响应公布」；新增 Scenario「差异分段与公布落点」 | `DeletedContainers.jsx:120-141, 352-379, 37-38` |

未改动的既有业务 SPEC（判定为已覆盖或不适用）：`frontend--page-create-image`（`:20` 删除为停用 + 状态三态）、`frontend--page-manage-machine`（`:20` 可选 port）、`frontend--page-admin-logs`（`:20` 通用操作映射），以及 `frontend--page-home`、`frontend--page-apply`、其余 16 份页面 SPEC（未涉及本轮 Global 条目）。

---

## 4. 轨 B：仓库流程规范落地

新增单篇：`openspec/specs/procedure--repository-workflow/spec.md`（capability 前缀合法、不叠加；未搬运 Global 三篇，未复制其文本结构）。

收录的规则（均对应本仓库已交付的脚本/工作流或明确的人工评审职责）：

1. 提交信息每行 `- NEW/- AMEND/- FIX 中文短句`、一行一条、关键字仅三者、说明真实变更；空行与 `#` 注释不计；CRLF 与无终止换行兼容。
2. 禁止工具署名与生成标记；非合并提交至少一条实际条目。
3. 真实 merge（`MERGE_HEAD`）使用 Git 默认信息；豁免不按消息文字判断。
4. 每克隆 `git config --local core.hooksPath githooks`；该配置替换 `.git/hooks`，启用前核对既有钩子。
5. 新增/修改 shell 钩子保持 LF 与 Git 100755；`git add --chmod=+x -- …`；用 `git ls-files -s` 核对。
6. 新 capability 使用 `standard--`/`frontend--`/`backend--`/`procedure--` 且不叠加；只约束新增，既有不改名。
7. 命名钩子只查暂存区新增标记文件；既有主规格 delta、修改、`git mv` 改名、`archive` 免强迁。
8. 业务单元边界：Ctrl 按表、Node 8 个业务能力（文件内保留完整类型契约）、Web 按页面；根目录保留 README，`openspec/` 内无 README。
9. 规范各仓库独立执行，不依赖 Global 或其他仓库 SPEC。
10. 问题集中 Global `QUESTIONS.md`，区分「已复现/源码确认/待验证/已修复」。
11. 规范不代表业务问题已修复；格式校验不等于逻辑描述完整。
12. PR 正文四类中英双语栏目；前三交付类至少一栏真实条目；`下一步计划 | Coming Up` 可选且不算交付；无内容栏目可删或写 `- 无`；验证说明与通过率可选。
13. 占位、HTML 注释与围栏代码块不计交付；原样模板不通过。
14. PR 标题自然描述、不强制 conventional 前缀；**脚本不校验标题**，由人工评审。
15. 旧 `NEW | 新增内容`/`FIX | 修复漏洞` 仅过渡兼容，不作为推荐格式。
16. 工作流读取 event JSON 的 `pull_request.body`，正文当数据（不求值、不调 shell）；优先 `base.sha` 的检查器，首次接入仅接受与固定 SHA256 一致的引导检查器，摘要不符即失败。
17. commit 关键字（NEW/AMEND/FIX）与 PR 栏目相互独立，AMEND 不改写成 PR 栏目关键字。

明确未收录/未声称：

- 未声称 `commit-msg` 能验证中文表达真实性或内容真伪（SPEC 的 Purpose 与相应 Requirement 均写明由人工评审确认）。
- 未声称 `check_pr.py` 校验 PR 标题或正文属实性。
- 未收录与本仓库无关的其他仓库规则（如 CodeArts 溯源、原型流程等）。
- 未把任何规范条款写进业务表或类型契约。

---

## 5. 上轮保留：Global 新建流程规范退役的判定（结论不变）

- `standard--code-style`、`standard--pull-request-format`、`procedure--spec-naming` 三篇**不吸收**进业务 SPEC：条目全属提交/钩子/PR/规格组织约定，落点为 `standard--` 与 `procedure--`，业务页面 SPEC 无落点；其中 PR 栏目部分已与当前实现（中英双语四栏）不一致，不符合「仍符合当前代码状态」。
- 该内容现由轨 B 的单篇本地规范承接，且未复制 Global 文本。
- 三份退役规范位置：`FuxiYu_Global\bak\2026-10-11\retired-global-standards\openspec\specs\`（`FuxiYu_Global\openspec` 已不存在）。
- 保留的清理项（父代理范围，我只报告）：
  1. 三仓库钩子注释指向「本仓库 openspec/specs 中的工作流程规范」——轨 B 落地后本仓库已有该落点（`procedure--repository-workflow`）；Ctrl/Node 两仓库仍需各自落地或改写指向（证据：`FuxiYu_CtrKernel/githooks/pre-commit:21,127`、`…/commit-msg:22`；`FuxiYu_NodeKernel/githooks/pre-commit:21,127`、`…/commit-msg:22`）。
  2. `githooks/pre-commit:53-54` 注释残留（断句「—— 规格 / 提交关键字仅允许…」）。
  3. 钩子注释用 `git update-index --chmod=+x`，`.gitattributes` 与 AGENTS 原文用 `git add --chmod=+x`，口径可统一（不影响执行）。
  4. 上一轮创建的探针文件 `scripts/ci/.spec-absorption-write-test.tmp` 仍在（无 shell 无法删除），可随清理一并删除。

---

## 6. 检查结果

### 6.1 静态核对（本次完成）

| 检查项 | 结果 |
| --- | --- |
| 既有 22 份页面 SPEC 与 `src/pages/*.jsx` 对应 | 通过（22 = 22） |
| 轨 A 每条判定的代码证据可指向具体行 | 完成（§3） |
| 轨 A 吸收内容均对应本仓库已实现行为 | 完成（§3.13） |
| 未把未实现/冲突条目写成现状需求 | 完成（§3.7、§3.9、§7） |
| 新增 capability 命名符合前缀规则且未叠加 | `procedure--repository-workflow`，通过 |
| 既有 capability 名称与数量未变 | 22 份 `frontend--page-*` 未改名，未增删 |
| 规范条款未进入业务表或类型契约 | 通过（轨 B 独立成篇） |
| 未复制 Global 规范文本 | 通过（结构与条目均为本地综合） |

### 6.2 可执行校验（按本次要求移交父代理）

按要求不再进行 ACL 诊断、提权或反复执行，也不向用户索要完全权限。以下命令由父代理在可执行环境完成：

- `openspec validate --specs --strict`（本仓库新增 1 份 SPEC、编辑 4 份，需确认 strict 通过）
- `E:\Miniconda3\python.exe -m unittest discover -s scripts\ci\tests -p test_check_pr.py`
- `Get-FileHash -Algorithm SHA256 scripts\ci\check_pr.py` 与 `.github/workflows/pr-format.yml:59` 的 `18c7f5a2…` 比对
- `git status --porcelain`、`git ls-files -s -- githooks/pre-commit githooks/commit-msg`

父代理已反馈的状态（据用户转述，未由我复算）：PR 检查器 40 项测试通过；checker SHA 为 `18c7f5a20a07d38d98b86609204b4d17d64b214254f1f187538054b7ce75fe0c`；Global SPEC 已归档；四仓库 AGENTS 已移除。

---

## 7. 未决问题

1. **`MachineDetailPage.jsx:55` 注释与 Global `machine-node-endpoint` 冲突**：注释称「IP 变更后端自动校验证书并重 pin」，Global 条目要求端点变更只改登记、不涉信任（由独立人工操作重钉）。我未读 Ctrl 实现、未改代码，登记为待核项：需在 Ctrl 侧确认更新路径是否触发取证/重写 pin；若是，属业务缺陷，应进现有问题体系（`Global/QUESTIONS.md`），不得写成规范要求。
2. **展示侧兜底不含顺延**：`src/utils/timeFormat.js:117-122` 在缺少服务端 `seconds_until_cleanup` 时用固定 7 天计算距清理时间，不含机器不可用窗口顺延；正常路径以服务端值为准（`:107-115`）。属待核差异，未写入 SPEC。
3. **轨 B 的落地范围**：`procedure--repository-workflow` 为本仓库本地规范；Ctrl/Node 两仓库是否各自落地、以及其钩子注释指向如何改写，属父代理裁决（§5 清理项 1）。
4. **首次接入摘要**：`pr-format.yml:59` 的 SHA256 未由我复算（移交父代理，§6.2）。
5. **strict 校验未由我执行**：新增/编辑的 5 份文件需父代理跑一次 `openspec validate --specs --strict` 确认格式（尤其新增 SPEC 的 Scenario 结构）。
6. **探针文件残留在库**：`scripts/ci/.spec-absorption-write-test.tmp`（无 shell 无法删除）。

---

## 8. 本次未触碰范围

- 未编辑 `.github/pull_request_template.md`、`scripts/ci/check_pr.py`、`githooks/*`、`AGENTS*`、Global 仓库、Git 配置与暂存区；未 `stage`/`commit`/`push`。
- 未读取 `.local/` 或凭据文件；未运行依赖外部真实服务的业务测试；未运行无关构建。
- 未复制 Global 文件，未新建业务 capability，未改业务代码。
- Container 大规模细节扩展仍暂缓；本轮只吸收明确列出的 Global 旧业务条目。

## 附：本次变更文件清单

| 文件 | 变更 |
| --- | --- |
| `openspec/specs/frontend--page-machine-detail-page/spec.md` | 轨 A 最小吸收（修复连接入口与确认流程） |
| `openspec/specs/frontend--page-container-detail-page/spec.md` | 轨 A 最小吸收（展示容器自身 `image_dockerfile`） |
| `openspec/specs/frontend--page-create-container/spec.md` | 轨 A 最小吸收（仅 ready 模板可选） |
| `openspec/specs/frontend--page-deleted-containers/spec.md` | 轨 A 最小吸收（差异分段与留痕公布落点） |
| `openspec/specs/procedure--repository-workflow/spec.md` | 轨 B 新增单篇本地流程规范 |
| `scripts/ci/spec-absorption-review.md` | 本过程记录（更新为两轨结论） |
| `scripts/ci/.spec-absorption-write-test.tmp` | 上轮遗留探针文件，待删除 |
