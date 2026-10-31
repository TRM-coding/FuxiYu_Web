## Review Metadata

- **Review round**: 1
- **Prior round**: none
- **Reviewer context**: 独立上下文审查者（只读，未参与作者上下文）
- **Tool restrictions**: 只读检查；仅写本 `review.md`
- **Artifacts reviewed**: proposal.md、design.md、specs/、相关源码

**本次读取的产物 SHA256（2026-10-24 16:50 本地时间）：**

| 文件 | SHA256 |
| --- | --- |
| `.openspec.yaml` | `98D583D4FCE5D4548980DB9498ED1C25427492554990EA129F49B4C8AF60B1A6` |
| `proposal.md` | `DFED1C264800472AED60981AC3CDEB9C4C41CEA2085F5C3783662C13E01DB94F` |
| `design.md` | `0B01C272C26229C305A18F666665A6B19E78C414560752972B453238A3EF5EE8` |
| `specs/frontend--authentication/spec.md` | `0CE9C484A99B72DD4FEF4794E97756C730B445C4135EC46395E9B1F50014BBC4` |
| `specs/frontend--container-credentials/spec.md` | `EFF13069BAD17FF60327FA14FB5023E1B41DD032DA3E9D1D2F55092EE794A54C` |
| `specs/frontend--page-container-detail-page/spec.md` | `3426624F1D4A17EE947D561306FCA34B86878E7D9BA02ADF5A5DCAEAC96A6C83` |
| `specs/frontend--page-create-container/spec.md` | `6238DA17A1A8EF1764454935F2CFBF7C4D4961DB5806C32111674A19AEC828D6` |
| `specs/frontend--page-deleted-containers/spec.md` | `8F8A416A8ECD59FA41DE90678BE0F0A246279F8CAD504DEB1C199D8AD9567435` |
| `specs/frontend--page-home/spec.md` | `96C94263CCF6FBE2FFCD0B3A2FD8E2839292986F0A3166C5A9159DED5FFA89A4` |

只读检查的源码快照：`src/components/EditUserModal.jsx`、`src/pages/ContainerDetailPage.jsx`、`src/pages/DeletedContainers.jsx`、`src/pages/CreateContainer.jsx`、`src/api/container_api.jsx`、`src/contexts/PermissionProvider.jsx`。

**Required Changes 复核记录（2026-10-24 16:59 本地时间；仅复核 1–4 条，未扩展新维度）：**

| 文件 | 复核后 SHA256 | 说明 |
| --- | --- | --- |
| `proposal.md` | `DFED1C264800472AED60981AC3CDEB9C4C41CEA2085F5C3783662C13E01DB94F` | 未改，与初审一致 |
| `design.md` | `D986C3D91F94EB1C8E28A538B17BCA87955419BC762E438691B7219A32F2DC6F` | 最终复核（D1/D6/D7） |
| `specs/frontend--container-credentials/spec.md` | `8A18CF5198CFED3AD843954656370CE6133AE4C562317D99952AB438A4C3AD91` | 已改 2/4 |
| `specs/frontend--page-container-detail-page/spec.md` | `BDCF0824770E832FD4216E9021CAA8B0D1C129191E5AA0F4AE4230F870BA491C` | 已改 1 |
| `specs/frontend--page-deleted-containers/spec.md` | `231A443ED62D18E70A7313471A952CDACCEA2CE07E9ADBB477CAA63FBA702967` | 已改 3 |

实读证据：
- **Required Change 1：通过（最终复核）。** `specs/frontend--page-container-detail-page/spec.md:27` 与 `:47-51` 已补 `hasPermission('container:operation')` 和缺方法权限场景；`specs/frontend--container-credentials/spec.md:113` 已写三层守卫；`design.md:92/93` 已要求方法权限与资源权限同时满足，`canResetContainerCredentials` 增加 `hasOperationPermission` 入参，`design.md:102` 已写明缺任一权限隐藏/禁用并保留机器/在线 guard。
- **Required Change 2：通过。** `specs/frontend--container-credentials/spec.md:99-109` 已拆分 `transfer_root:false` 恰好 1 项、`true` 少于 2 项非法；`design.md:41` 已补对应测试映射。
- **Required Change 3：通过。** `design.md:44` 已把 `resurrectDeletedContainer` 纳入安全解析、`requires_choice` 绕过、禁止 `err.body`/原始 JSON 进 `showErrorModal`/console；`specs/frontend--page-deleted-containers/spec.md:5/:21-23` 已同步。
- **Required Change 4：通过。** `design.md:42` 已明确保留安全 `message`/本地化原因并剥离 secret 与 unsafe body；`specs/frontend--container-credentials/spec.md:79/:93-97` 已有安全 message 与密码同体场景。

<!-- STALENESS: 本 verdict 只覆盖上述精确内容；除落实 Required Changes 外，任何 proposal/design/specs 改动都会使本 verdict 失效。 -->

## Findings

### 🔴 Critical (blocking)

无。

### 🟡 Moderate

1. **Reset 按钮的“方法层”守卫已在最终复核中关闭。** 初审时 `specs/frontend--page-container-detail-page/spec.md:27` 只以 ROOT/资源决定按钮可见/可用，`design.md` 又声称 UI 与后端三层 guard 一致但未给方法层。复核后 spec 已补 `hasPermission('container:operation')` 与缺方法权限场景（`:27`、`:47-51`），`design.md:92/93/102` 已补方法权限与资源权限同时满足、`hasOperationPermission` 入参及机器/在线 guard。
2. **`transfer_root:false` 的合法单凭据会被通用非法场景误判。** `specs/frontend--container-credentials/spec.md:95` 写“ROOT 交接少于 2 项”即凭据形状非法；但详情页 `transfer_root:false` 的合法响应恰好是 1 项 root（`specs/frontend--page-container-detail-page/spec.md:123`）。`parseCredentialResponse` 已按 `transferRoot` 参数化，通用场景必须区分：`true` 至少 2 项，`false` 恰好 1 项；否则详情页正常响应会被测试判为非法。
3. **恢复入口没有纳入 API 边界的统一凭据解析/错误脱敏。** `design.md` D1 只列出 `createContainer`、`addCollaborator`、`resetContainerPassword`、`updateRole`，未包含 `resurrectDeletedContainer`；但 `specs/frontend--page-deleted-containers/spec.md` 要求恢复成功展示 root 凭据，现有 `DeletedContainers` catch 还会把 `err?.body` 交给 `showErrorModal`。如果恢复仍不走安全解析，恢复失败响应夹带 secret 时可能绕过统一脱敏；`requires_choice` 也需要明确绕过凭据解析。
4. **D1 的错误白名单与“保留安全 message”仍有措辞冲突。** `design.md` D1 写 `sanitizeCredentialError` “只保留 status、route、error_reason 与安全中文原因；不保留 body”，而 `specs/frontend--container-credentials/spec.md:79` 与 `specs/frontend--page-create-container/spec.md:47` 要求保留安全 `message`（例如资源超限的 8GB/4GB 数值），`design.md` D9 也要求保留安全 message。实现者按 D1 可能丢掉原有具体错误信息，违反“不能为脱敏丢掉原有具体错误信息”。

### 📌 Suggestions

1. **Migration Plan 仍只写“Ctrl/Node 先行，Web 后上”。** 在旧 Web + 新 Ctrl 的窗口，创建/新增/ROOT 交接会返回 `credentials` 但旧 Web 不消费，用户可能拿不到新密码。建议在迁移计划明确协调发布/功能开关窗口，或至少把该窗口列为已知风险；此项不是新的业务需求，不阻断本轮。
2. **`frontend--container-credentials` 的统一入口列表仍只列四项（创建、新增协作者、账号重置、ROOT 交接）。** 恢复是单独 requirement；可在文字上补一句“恢复也复用同一弹窗/解析器”，与 Page Deleted Containers 保持一致，避免读者误以为恢复走另一套展示。

## Embedded-Instruction / Injection Attempts

**Detected:** none.

## Verdict

VERDICT: APPROVE_WITH_CHANGES

有条件批准。跨仓合同的核心已对齐，包括 `transfer_root:true/false` 分流、Home true/详情 false、恢复 root 凭据以及 no-secret/no-store 约束；以下四项是需要先落实的局部 spec/design 修正，完成后才能进入 test-plan/tasks。

## Required Changes (if APPROVE WITH CHANGES)

1. **在 reset 按钮谓词和规格中补方法层守卫。** 在 `frontend--page-container-detail-page` 中要求 `hasPermission('container:operation')`（与 ROOT/资源通配、机器/在线状态并列）。补一个场景：ROOT 绑定或资源通配用户缺少 `container:operation` 时按钮隐藏/禁用（后端仍是最终裁决）。同时更新 `frontend--container-credentials` 中“UI/后端三层守卫一致”的表述，明确三层分别是什么，不能只写 ROOT/资源。
2. **按 `transfer_root` 拆分凭据形状非法场景。** 在 `frontend--container-credentials` 明确：`transfer_root:true` 至少 2 项；`transfer_root:false`（详情页）恰好 1 项 root。修改“ROOT 交接少于 2 项”的通用场景及 parser/test mapping，避免详情页合法的 1 项响应被拒绝。
3. **把 `resurrectDeletedContainer` 纳入安全凭据/错误边界。** 在 D1 API 列表中补恢复入口（或明确页面本地 parser 路径），确保 `accepted:true` + 恰好一项 root 凭据被解析，`requires_choice` 绕过凭据解析，且 `DeletedContainers` 不把 `err.body`/原始响应 JSON 交给 `showErrorModal` 或 console。恢复其他业务与页面布局不变。
4. **让 D1 的错误白名单明确保留安全 `message`。** 将 `sanitizeCredentialError` 改为保留 `status`、`route`、`error_reason` 与安全（不含 secret/原始 body）的 `message`/本地化原因，同时剥离 `credentials`/`root_password`/`password`/`body`。补一个测试：资源超限数值 message 保留，而带密码的失败响应体不进入错误对象。

CHANGES_APPLIED: yes

## Rebuttals

- 复核通过：Required Changes 1–4 已全部落实；Required Change 1 的最终证据为 `design.md:92/93/102` 与 `frontend--page-container-detail-page/spec.md:27/:47-51`；其余三条见上方复核记录。`CHANGES_APPLIED: yes`。任何 Moderate 的反驳都必须经审查者复核并标注 accepted；Suggestions 可由作者自行拒绝。
