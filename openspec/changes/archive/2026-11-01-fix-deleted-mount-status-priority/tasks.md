# Tasks

## 1. 现状核对与实施边界

- [x] 1.1 核对 `src/utils/mountUsage.js` 的 `deriveDeletedMountState`、`src/pages/DeletedContainers.jsx` 的 `statusTag` 与 `renderUsageCell`，确认桌面表格与移动卡片共用同一派生结果和采集列展示。
- [x] 1.2 核对工作区已有的相关未提交改动，实施时在其基础上完成，不回退、不覆盖无关文件；确认本次不新增请求、字段、权限或 WSS。

## 2. 挂载状态优先级

- [x] 2.1 在 `src/utils/mountUsage.js` 将派生顺序固定为：无挂载 → 已清理且成功采集（含 0 B）→ 已清理 → `not_found` → `permission_denied` → 升级清理 → `mount 保留`；首个命中即返回，保持函数签名与返回结构不变。
- [x] 2.2 确认已清理记录的 `not_found`/`permission_denied` 不再覆盖“已清理”，同时 `renderUsageCell` 仍按既有 `usage.message` 显示“统计不可用（目录不存在）/（无权限读取目录）”；无挂载仍在最早分支显示并不进入请求。

## 3. 测试更新

- [x] 3.1 更新 `src/test/mountUsage.test.js` 中已清理 + `not_found`/`permission_denied` 的旧期望，并覆盖无挂载优先、已清理成功（正数与 0 B）、已清理错误、已清理 pending/其他失败、未清理错误、未清理回退七类分支。
- [x] 3.2 更新 `src/test/DeletedContainersDisplay.test.jsx`、`src/test/DeletedContainersMountUsage.test.jsx` 中已清理错误行的状态断言为“已清理”，并断言采集列仍显示对应稳定错误文案；核对 `src/test/DeletedContainersMobile.test.jsx` 的同方向断言，确认桌面与移动一致。
- [x] 3.3 保留并运行无挂载不采样、成功 0 B、pending/Node 不可用回退、轮询取消、分页保持和恢复/清理门禁的既有回归用例，确认其他行为不变。

## 4. 验证与交付

- [x] 4.1 运行 `npm run test:web -- src/test/mountUsage.test.js src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/AnvilCreateDeleted.test.jsx`，记录实际结果。
- [x] 4.2 运行 `npx eslint src/utils/mountUsage.js src/pages/DeletedContainers.jsx src/test/mountUsage.test.js src/test/DeletedContainersDisplay.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainersMobile.test.jsx src/test/AnvilCreateDeleted.test.jsx`。
- [x] 4.3 运行 `npx openspec validate fix-deleted-mount-status-priority --strict`，确认 delta 结构通过。


验证结果：定向回归 5 个文件、122 项通过；ESLint 与 OpenSpec 校验通过。
