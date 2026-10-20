# Tasks

## 1. Ctrl HTTP 客户端

- [x] 1.1 在 `src/configs/backend_config.js` 增加 `/api/containers/get_deleted_container_mount_usage` 路由；在 `src/api/container_api.jsx` 增加仅发送 `{deleted_ids}` 的 POST helper，校验去重正整数且最多 100 个，支持取消且不发送 `path`/`machine_id`。验证：API 单测断言请求方法、URL、body 与 `credentials: include`，非法/超限入参不发请求，无 Node 调用。
- [x] 1.2 在 helper 的响应边界校验 `success === 1` 与 `usages` 形状，把 HTTP 404/405、整体非法形状与原样字段交给页面降级，不补 0、不自动重试。验证：mock 404/405、`success=0`、非数组和畸形项，断言调用方收到失败/不可用而非空成功。

## 2. ContainerDetailPage

- [x] 2.1 在既有“镜像信息”卡增加“宿主 bind 路径”：非空 `bind_mount_path` 原样展示并用 `CopyChip` 复制完整值；`null`、空串和旧 Ctrl 缺字段显示“未记录”，无复制候选，并标注“最近记录，非实时核对”。验证：详情页测试覆盖有值复制逐字一致、空值/缺字段、不拼猜、不产生新 API 或 Node 请求。
- [x] 2.2 确认新增字段不改变原详情加载、状态轮询、动作权限与错误处理；路径较长时能换行且不影响卡片布局。验证：现有详情资格/轮询用例回归通过，长路径展示完整且无横向溢出。

## 3. DeletedContainers 首批统计

- [x] 3.1 列表成功且写入当前页后，从该页派生 `deleted_id` 为正整数、有 `mount_path`、`mount_cleaned !== true` 且 `cleaned_at` 为空的记录，异步发首批统计；`mount_cleaned === true` 或 `cleaned_at` 非空均视为已清理，不请求、不扫描并显示“已清理”。验证：延迟统计响应时表格与分页先出现；请求 ID 集正确、去重且不含路径；覆盖 `mount_cleaned=true` 且 `cleaned_at` 为空的记录不被请求且显示“已清理”。
- [x] 3.2 按 `deleted_id` 合并结果并区分 `loading/pending/success/error/unavailable`：成功显示逻辑大小与真实 `measured_at`，真实 `bytes=0` 显示 0 B；`bytes=null` 的 pending/error、缺项和畸形项绝不显示 0。验证：组件测试覆盖成功非零、成功 0、旧测量时间、pending、错误、缺项与整批失败。

## 4. 轮询、取消与竞态

- [x] 4.1 仅对当前页 pending 行启用 5 秒单计时器轮询，单页最多 120 个 tick；success/error 行停止，全部收敛即清计时器，预算耗尽停止并显示“测量未完成”提示，允许手动刷新。验证：假计时器测试精确计数 120 次、无并发堆叠、收敛停止、预算后不再请求。
- [x] 4.2 离开、翻页、刷新、清理或恢复时清除计时器、abort 在途统计并推进统计代次；迟到响应按代次/当前页/行 ID 丢弃，清理后的行只显示“已清理”且不再扫描。验证：延迟首批/轮询响应分别在卸载、翻页、清理、恢复后返回，断言旧值不覆盖新页、目标行无旧 bytes/pending、无后续请求。

## 5. 兼容与集成验证

- [x] 5.1 旧 Ctrl 统计 404/405、非法响应或旧 Node 的 `node_unsupported`/`node_timeout`/`node_unavailable`/`node_bad_response` 只让相关行显示“统计不可用”及原因；单机失败不影响其他行，列表、分页、恢复、清理仍可用。验证：组件测试覆盖上述错误码、部分成功和旧接口，断言无 0、无阻断、恢复/清理按钮仍按原记录工作。
- [x] 5.2 运行相关 Vitest 用例与 `npm run build`，确认替换后的统计不影响既有列表/恢复/清理测试；再运行 `openspec validate show-mount-path-and-deleted-usage --strict`、`openspec status --change show-mount-path-and-deleted-usage --json`、`git diff --check` 与范围检查。验证：全部通过，4 个 artifact 为 done，改动仅在本仓 Web 范围，无主规格/archive/Global、Ctrl/Node 实现或提交。

## 父代理首轮审查收紧证据

- `normalizeMountUsageItem` 强制 `deleted_id`/`bytes`/`measured_at`/`pending`/`error` 五个字段实际存在；`pending`/`error` 三态的 `bytes`、`measured_at`、`error` 必须为实际 `null`，缺失、`undefined`、空串均不接受。
- 成功项 `measured_at` 只接受 UTC ISO（`Z` 或 `+00:00`，允许小数秒）；拒绝无时区、非零 offset、空串、非法日历日期（如 `2026-02-30`、非闰年 `2026-02-29`）及非法时分秒（24 时、60 分/秒）。
- `error` 只接受契约稳定 code allowlist：`node_unsupported`、`node_timeout`、`node_unavailable`、`node_bad_response`、`not_found`、`invalid_path`；未知 code、HTML、stderr 长文按“统计不可用”降级且不回显。
- 缺项、重复 ID、畸形项只让对应行 unavailable；同一批内合法 success/pending 行不受影响。
- 新增 pure util 与页面畸形降级测试，覆盖五字段缺失、非 UTC 时间、非法日历日期、HTML/未知 error、重复 ID 与部分合法项。
- 复跑 `npx vitest run src/test/mountUsage.test.js src/test/containerMountUsageApi.test.js src/test/DeletedContainersMountUsage.test.jsx --maxWorkers=1` 共 40 个用例通过；`src/test/DeletedContainers.test.jsx` 10 个既有用例通过；`npm run build` 通过；`openspec validate ... --strict`、`openspec status ... --json`、`git diff --check` 通过。
- 预算耗尽文案改为“多轮查询仍未完成，已停止自动刷新”，不再声称实际不超过 10 分钟。
- 未修改恢复/清理按钮业务资格、既有 `container:manage` 权限、全局 401 `ensureOk → abortAll` 行为；未 commit。

## 最终边界走审修补证据

- stable error allowlist 增补 `permission_denied`、`timeout`、`non_zero_exit`、`empty_output`、`parse_error`、`du_unavailable`、`du_failed` 并映射中文不可用原因；未知 code、HTML、stderr 长文仍统一 generic unavailable，不回显原文。
- 权限 `loaded`/`canManageContainers` 变为 false 时执行 `resetMountUsage()` 并推进列表请求序号：停止 pending 计时器、abort 在途统计，迟到 list 响应不能重新开启统计；未改原权限规则、恢复/清理资格或新增 machine gate。
- 新增参数化 pure util 用例与页面 `du_failed` 已知错误用例；新增权限 rerender 后 pending 计时取消、在途统计 abort、迟到 list 响应取消测试。
- 复跑 `npx vitest run src/test/mountUsage.test.js src/test/DeletedContainersMountUsage.test.jsx --maxWorkers=1` 共 44 个用例通过；`src/test/DeletedContainers.test.jsx` 10 个既有用例通过；`npm run build` 通过。
- 未 commit。
