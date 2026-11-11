# Tasks

## 1. 状态派生与门禁

- [x] 1.1 在 `src/utils/mountUsage.js` 增加 `mount_cleanup_state`/`mount_cleanup_error_reason` 归一化与展示/门禁派生：历史 `cleaned_at`/`mount_cleaned` 优先；未清理时 `cleaning` 优先于实时 `not_found`，任务结束后 `not_found` 优先于失败/未知；非法状态映射未知。验证：`npm run test:web -- src/test/mountUsage.test.js`，并覆盖 `frontend--page-deleted-containers / DeletedContainers 用量派生不改变恢复与清理门禁 / 清理中与实时 not_found 并存时清理中优先`。

## 2. 页面受理、列表刷新与界面

- [x] 2.1 在 `src/api/container_api.jsx` 为既有 `listDeletedContainers` 增加可选取消信号；在 `DeletedContainers.jsx` 只把 `accepted === true` 视为受理，复用列表立即刷新，并在存在未清理 `cleaning` 时每 3 秒单飞轮询、翻页/刷新/离开取消，合并状态时保留分页、展开和用量。验证：`npm run test:web -- src/test/DeletedContainersAsyncCleanup.test.jsx`，覆盖 `异步清理受理与列表状态 / 列表轮询单飞并取消旧请求` 与 `只刷新当前页并保留列表事实`。
- [x] 2.2 在 `DeletedContainers.jsx` 接入“清理中/清理失败/清理状态未知”状态与门禁，清理中禁用恢复和重复清理，失败/未知按既有字段和路径门禁重开，历史清理事实仍显示已清理；保留刷新、恢复二选一、凭据、分页、移动布局和权限。验证：`npm run test:web -- src/test/DeletedContainersAsyncCleanup.test.jsx`，覆盖失败/未知、非法状态、Ctrl 重启及既有 `not_found` 组合场景。

## 3. 测试落地

- [x] 3.1 新增 `src/test/DeletedContainersAsyncCleanup.test.jsx`，按 test-plan 落地 planned locator：受理、刷新恢复、单飞取消、当前页合并、历史已清理、失败/未知两按钮、部分删除恢复、清理中与 `not_found` 两阶段、非法状态、Ctrl 重启、请求失败、旧 Ctrl、移动卡片。验证：`npm run test:web -- src/test/DeletedContainersAsyncCleanup.test.jsx` 全通过。
- [x] 3.2 更新既有 DeletedContainers 测试的 API/列表 mock：清理受理改为 `accepted: true`，列表按需返回 `mount_cleanup_state`；保留原有分页、用量、恢复、移动与权限断言。验证：`npm run test:web -- src/test/DeletedContainers.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/DeletedContainersRestorePassword.test.jsx src/test/AnvilCreateDeleted.test.jsx` 全通过。

## 4. 完整校验

- [x] 4.1 运行 `npm run test:web` 与 `npm run lint`，确认本变更未破坏既有测试、无新增 lint 错误；不修改其他仓库，不提交推送。验证：两条命令退出码 0 并保留实际测试结果。
