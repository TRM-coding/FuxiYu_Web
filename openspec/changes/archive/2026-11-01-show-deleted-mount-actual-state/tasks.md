# Tasks

## 1. 用量派生工具

- [x] 1.1 调整 `src/utils/mountUsage.js` 的可测记录判断：保留正整数 ID 与非空 `mount_path` 要求，允许已清理且有历史路径的记录进入当前页采样；验证 `src/test/mountUsage.test.js` 的派生 ID 用例通过。
- [x] 1.2 新增状态派生函数：`not_found` → 目录不存在，`permission_denied` → 无权限，成功且已清理 → 可能存在残留，其余状态回退列表事实；验证工具函数测试覆盖成功、两类错误、pending、Node 不可用、无路径与按钮事实无关的边界。

## 2. 已删除容器页面展示

- [x] 2.1 在 `src/pages/DeletedContainers.jsx` 使用派生函数渲染状态列，并让已清理且有路径的记录进入既有 `useDeletedMountUsage` 异步请求；验证 `DeletedContainersMountUsage.test.jsx` 中采样、轮询与清理/恢复取消用例通过。
- [x] 2.2 调整用量单元格：已清理记录在请求中显示加载/测量，成功时复用逻辑大小、测量时间与进度条，错误时显示新文案；无路径仍显示“无挂载”，恢复/清理按钮门禁不变；验证桌面与移动展示测试通过。

## 3. 过时测试与回归

- [x] 3.1 更新 `src/test/DeletedContainersMountUsage.test.jsx`、`src/test/DeletedContainersDisplay.test.jsx`、`src/test/DeletedContainersMobile.test.jsx`、`src/test/AnvilCreateDeleted.test.jsx` 中“已清理不采样/只显示已清理”的过时断言，并新增残留、目录不存在、无权限与 pending/Node 不可用不误称的定向断言。
- [x] 3.2 运行定向测试 `npm run test:web -- src/test/mountUsage.test.js src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/AnvilCreateDeleted.test.jsx`，确认全部通过。
- [x] 3.3 运行 `npx eslint src/pages/DeletedContainers.jsx src/utils/mountUsage.js src/test/mountUsage.test.js src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/AnvilCreateDeleted.test.jsx` 与 `npx openspec validate show-deleted-mount-actual-state --strict`，记录实际结果。

## Workflow follow-up

- 不归档、不提交；保留其他未提交工作。
- 实施完成后由用户决定是否同步主规格或归档。
