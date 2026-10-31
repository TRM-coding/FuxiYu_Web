# Plan Review

## Review Record

- Change: complete-anvil-auth-page-mappings
- Reviewer: fresh-context independent reviewer；未参与作者 d6e48ae5 的规划，也未复用原失败 reviewer 的结论。本次仅复审修订后的 planning artifacts。
- Access: read-only；本文件是唯一写入。
- Reviewed plan: proposal.md、specs/frontend--authentication/spec.md、specs/frontend--page-login/spec.md、specs/frontend--page-register/spec.md、specs/frontend--page-rbac-matrix/spec.md、design.md、test-plan.md。
- Context checked read-only: 四份主规格、相关既有测试与必要的页面/路由源码，仅用于核对 locator、实际断言和可行性；未运行测试套件或构建。
- Invalidation scope: 对 Requirement、Scenario、design decision、scenario mapping、test/check locator、Assertion scope 或 Coverage note 的任何语义修改都会使本 verdict 失效；在断言未变时重算 checkbox，或仅外部运行/日志变化，不失效。
- Scope limit: 仅规划审查；实现、tasks、测试结果与 archive readiness 不在范围。

只读核对结果：4 份 delta 的 18 个 Requirement 块与主规格逐字一致（忽略行尾与空行）；40 Scenario、67 个 `[X]`、16 条 `[ ]`（15 个 unique planned tests）计数吻合。新增的详情页测试独立到 `src/test/AnvilAuthContainerDetail.test.jsx`，其余 14 个 unique planned tests 在 `src/test/AnvilAuthPages.test.jsx`，未与 detail-credential 批次的既有文件交错。上一轮 Blocking findings 已逐项修正。

## Findings

### Blocking

None.

### Non-blocking

- `test-plan.md:91`：新增详情页测试的 Assertion scope 只写了「mock `container_api`」，但真实 `ContainerDetailPage` 还从 `user_api` 调用 `getUserPermissions`（经 `PermissionProvider`）与 `listAllUserBrefInformation`。建议在 scope 中明确同时 mock `user_api` 的这两个导出（以及 `container_api`），否则测试无法注入权限快照或会尝试真实请求。该测试本身仍可行，属实现前的 mock 清单补全。

- `test-plan.md:100-102`：`test_anvil_permission_controller_unregister_is_idempotent` 被挂在「成功返回后释放控制器」下，但它验证的是重复 `unregisterController` 的幂等性，不是成功解析路径；成功释放仍由既有 `test_q27_success_unregisters_controller` 覆盖。建议在 Assertion scope 中一句话区分「既有成功释放」与「新增重复注销幂等」，避免把两个行为混为同一测试的覆盖。

- `test-plan.md:60`：该句写「同一 entities 列表（`container:operation,container:manage`）下」，但同组新增的 `normalizes API field...` 用例只使用 `entities: ['container:manage']`。建议把「同一列表」限定到 `maps...` 用例，缺字段归一化单独表述；当前写法略有 scope 过宽。

- `test-plan.md:143`、`:223`、`:356`：构建检查已明确说明 chunk 边界是 `dist/assets` 人工核对、不由退出码 0 自动证明，这一点已纠正。建议再给出可复现的具体检查路径/命令（例如列出 `dist/assets` 并核对入口文件），避免「人工核对」停留在不可复核的描述。

- `test-plan.md:255-257`：非法非空用户名新增测试写「`showErrorModal` 收到」；若实现时 mock 了 `showErrorModal`，该断言证明的是页面调用参数，而不是真实弹窗显示。若 Scenario 的「显示」需要真实可见结果，建议使用真实弹窗断言，或在 Coverage note 明确这是调用级覆盖；该消息本身仍是现有实现的非法字符反馈，不涉及新增业务语义。

## Verdict

VERDICT: APPROVE
