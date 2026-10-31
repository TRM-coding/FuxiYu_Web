# Design

## Context

本 change 覆盖两个既有 capability：`frontend--page-container-detail-page`（67 个 Scenario）与 `frontend--container-credentials`（36 个 Scenario），合计 103 个。两份主规格已经过历史实现与修复，当前工作区还存在两个与本 change 无关的 active change；本 change 不读取或修改它们。

旧尝试 `1be2f7ba` 在启动后立即 `quota_exceeded`，未留下 proposal、spec、test-plan 或测试文件；当前 change 目录只有 `.openspec.yaml`。现有主规格 sidecar 仍是旧表格格式，凭据侧只列了 32 行，且包含无法作为行为证据的源码字符串检查；因此本 change 以主规格和实际测试代码为唯一映射依据，不把 sidecar 当权威，也不修改 sidecar。

测试框架为 Vitest + Testing Library（jsdom）。页面测试可通过真实 `ContainerDetailPage`、真实 `container_api` 和受控 `fetch` 驱动；Ctrl/Node 的后台复核、审计写入和响应头属于其他仓库或运行时契约，不能在本仓用静态字符串或反射替代行为验证。

## Goals / Non-Goals

**Goals:**

- 用两份 MODIFIED no-op delta 逐字保留两个 capability 的全部 Requirement 与 Scenario，不改已定业务语义。
- 为 103 个 Scenario 建立可复核的 test/check 映射：能落到真实既有断言的标 `[X]`，确有断言的缺口标 `[ ]` 并指向 `src/test/AnvilDetailCredentials.test.jsx`。
- 让 fresh reviewer 能逐行核对：场景、测试文件、测试名、Assertion scope、Coverage note 和缺口计划。
- 把 Web 可验证行为与 Ctrl/Node 跨仓职责分开，避免虚假覆盖。

**Non-Goals:**

- 不修改主规格、sidecar、review、tasks、业务源码、共享 fixture、配置、CI、DB 或任何其他 active change。
- 不修正实现、不弱化规格、不把静态源码字符串或反射当作行为通过。
- 不在本阶段创建 `AnvilDetailCredentials.test.jsx`、不执行 apply、不 commit/push。
- 不声称真实浏览器像素、真实 Ctrl 后台、真实 Node 时序或真实 DB 已验证。

## Decisions

1. **Delta 采用逐字 MODIFIED no-op。**
   从两份主规格的 `### Requirement:` 开始，到 `## Source references` 之前完整复制，不重写任何 Requirement 或 Scenario。原因是本 change 只补测试映射，任何行为改写都会制造新的规格变更并需要独立实现决策。

2. **Canonical 映射放在 change 的 `test-plan.md`，不写运行台账。**
   映射使用中文 Requirement/Scenario 名称和中文 Assertion scope；只记录测试位置与断言范围，不记录时间戳、运行结果、通过数、状态字段或 per-entry evidence。main spec 不插入任何测试说明；sidecar 留待官方 sync 后由 `anvil-test-plan` 维护。

3. **`[X]` 只代表映射已从测试代码核实，不代表执行通过。**
   现有测试必须能读出对应 THEN 的实际断言；仅名称相近、仅覆盖前置条件或仅做源码字符串匹配的行不标 `[X]`。一个测试可以服务多个 Scenario，但必须在 Coverage note 说明共享范围和缺失部分。

4. **缺口集中规划到 `src/test/AnvilDetailCredentials.test.jsx`。**
   新增测试使用真实 `ContainerDetailPage`、真实 `container_api`、真实 `CredentialModal` 与真实错误弹窗路径；只 mock 外部 HTTP（受控 `fetch`）、身份/权限输入和只读平台用户数据，不 mock 目标页面或目标凭据处理逻辑，不读取源码字符串作为断言。重点缺口包括：ADMIN 新增路径、缺少 `user_id`/提交前变化的原因与警告回归、离线/主机不可用的页面级按钮门、删除禁用原因与不请求、动作确认弹窗不出现长期控件、N+1 凭据在详情页的逐项渲染、顶层 `root_password` 忽略、关闭/卸载/重挂无查回、卸载不取消请求、超时不重试、错误弹窗 pending 时 loading 释放、reset 失败 console 不泄密、动作失败原因，以及非法/缺少受理标志的页面级无密码行为。磁盘 100% 单分支由既有 `containerActions` resolver 测试与新增页面磁盘-only 测试覆盖。

5. **跨仓义务只做 Web 侧映射并显式标注。**
   Ctrl 的受理前 guard、后台最小复核、oplog/审计写入、`Cache-Control: no-store` 响应头和真实 Node 终态不属于 Web 测试可断言范围。映射只验证 Web 请求体、按钮门、错误脱敏、历史标签和不重复提交；Coverage note 必须写明后端/跨仓部分未被本仓断言，不能用源码字符串检查冒充。

6. **两项 reset 原因缺失记录为暂缓缺陷，其他测试继续。**
   - 账号缺少有效 `user_id` 时，规格要求禁用并显示原因；确认框打开后容器变为离线/维护/过渡态时，规格要求提示原因、关闭确认且不发改密请求。当前实现两处均静默；对应 Global QUESTIONS.md Q76（源码确认、修复暂缓）。
   - 用户已决定“先记录缺陷，继续其他测试”。`test-plan.md` 保留两个 `[ ]` 定位及规格要求；本轮暂不创建或执行依赖修复的两个测试，不加 skip/xfail，不应用外部 `proposed-existing-spec-fixes.diff`。
   - 本计划共 23 个唯一定位：21 个独立测试 + 2 个暂缓 reset 定位；其余 21 个独立测试在同一独立复审通过后实施。本 change 不写业务源码，也不把暂缓定位勾选或弱化规格；这两项缺陷仍明确未解决。

## Risks / Trade-offs

- **两项 reset 原因回归依赖已暂缓的业务修复。** 按用户决定保留 `[ ]` 与准确缺口，本轮不实施这两个回归，不宣称完整覆盖；其余 21 个独立测试不被连带阻塞。本修订须由同一独立 review 复审。
- **jsdom 无法确认真实像素。** 320/390/768px 的 `scrollWidth` 只能由 CSS 契约测试和仓库外浏览器证据补足；plan 不把 CSS 正则匹配写成真实布局通过。
- **跨仓契约不可在 Web 仓闭环。** Ctrl guard、后台复核、oplog 与响应头只能标注边界，不能在本仓宣称已验证。
- **既有测试多为模块级 mock。** 现有 `ContainerDetailPasswords` 等测试 mock 了 `container_api`；它们可证明页面状态机，但不能证明真实 API 边界。真实边界由 `containerApiCredentials`、`RoleAdversarial` 和新增测试补足；plan 必须区分两者。
- **定时器/可见性测试容易受真实 5 秒影响。** 现有测试使用确定性回调注入；新增测试沿用同一方式，不 sleep、不依赖真实等待。
- **Review 失效规则。** 任何 Requirement、Scenario、locator、Assertion scope 或 Coverage note 变化都必须重新 review；外部运行日志变化不使 review 失效。
