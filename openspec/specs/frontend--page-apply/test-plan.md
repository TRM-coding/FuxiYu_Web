# frontend--page-apply Test Plan

Spec: [spec.md](spec.md)

## Current Mapping

### Requirement: Apply 页面入口与身份

#### Scenario: 装配页面

- Test/check:
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply" 重定向到 "/index/create"，不再渲染旧表单`
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply?machine_id=42" 把机器上下文带到新入口`
  - [X] `src/test/legacyApplyRedirect.test.jsx::兼容 camelCase 的 machineId 查询参数`
  - [X] `src/test/legacyApplyRedirect.test.jsx::无机器上下文的旧链接仍回到新入口，不退化成 404`
- Assertion scope: 访问 `/index/apply` 后 `location.pathname` 为 `/index/create` 且不再是 `/index/apply`；CreateContainer 落位（`create:no-machine` / `create:42` / `create:9`）；旧 Apply 表单的确认标题「添加容器」不出现；`?page=3` 等无效上下文仍回新入口、不落 404（「页面走丢了」不出现）。
- Coverage note: 该文件按既有设计桩化 `CreateContainer`（`vi.mock('../pages/CreateContainer')`），只验证「旧 URL 落到新入口 + 机器上下文保留」；「不提交缺少 image_id 的旧请求」以旧表单不渲染间接体现，旧表单请求体本身无独立断言。创建入口的身份/权限与资源契约由 CreateContainer 承载，不在本 capability 断言。

### Requirement: Apply 主流程

#### Scenario: 通过旧表单提交创建

- Test/check:
  - [X] `src/test/legacyApplyRedirect.test.jsx::"/index/apply" 重定向到 "/index/create"，不再渲染旧表单`
  - [X] `src/test/CreateContainer.test.jsx::普通用户提交 payload 不带 owner_user_id（后端归一为自己）`
  - [X] `src/test/ResourceLimits.test.jsx::在限额内的组合按同口径取小后提交（mem 32 / shared 16）`
  - [X] `src/test/ResourceLimits.test.jsx::内存上限为 0 而申请值为 1 GB 时阻止超限 payload 并给出数值说明`
- Assertion scope: 历史创建链接进入系统后不再渲染旧表单（「添加容器」不出现），只能落到达标的新创建页；创建提交的 payload 取自新创建页所选镜像（`payload.image_id` 为所选 `image_id`），走现有创建流程的单一提交路径；限额内组合按与页面配额区同口径取小后提交（`payload.container.MEMORY` 为 32、`shared_memory` 为 16、无 `.cc-quota-error`），超限时 `createContainer` 不被调用并给出「内存 当前申请 1 GB，本次可申请上限 0 GB」的数值说明。
- Coverage note: 「选 `image_id`」与「按本次可申请上限提交」两侧均已有页面级断言（`CreateContainer.test.jsx`、`ResourceLimits.test.jsx` 直接渲染真实 `CreateContainer`）；前端上限数值来源与后端配额错误文案的对应关系不在本 capability 内，故不另记缺口。旧表单请求体本身无独立断言，仅以旧表单不渲染间接体现。

### Requirement: Apply 构建归属

#### Scenario: 生成生产产物

- Test/check:
  - [X] `npm run build`
- Assertion scope: 既有 `vite build` 检查（`npm run build`）：退出码 0；构建输出为页面级异步 chunk 结构，且不包含独立的旧 Apply 表单页面 chunk；兼容跳转后的创建入口以现有 CreateContainer 的异步页面 chunk 产出。
- Coverage note: 该 check 只对构建命令与其可观测产物负责。`src/pages/Apply.jsx` 已从源码清退、`React.lazy`/`manualChunks` 组织属人工核对事实，不由本 check 断言；「其他页面使用的资源仍可正常加载」以构建成功与产物完整体现，未逐 chunk 断言资源引用，也不新增静态文案类机械测试。
