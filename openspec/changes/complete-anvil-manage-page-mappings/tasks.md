# Tasks

## 1. Home 入口、操作与凭据

- [X] 1.1 在 `src/test/AnvilManagePages.test.jsx` 落地 Home「装配页面」「已受理停止或重启」「操作失败」：真实 `AppRoutes`/`PermissionProvider`/Home，覆盖 `/index` 身份快照、restart 受理中间态、stop/restart/leave 失败与 `success=0/false` 边界。验证：`npm run test:web -- src/test/AnvilManagePages.test.jsx` 对应用例通过。
- [X] 1.2 落地 Home「新增 ADMIN 或 COLLABORATOR 后展示密码」「新增失败或凭据异常」：真实 Home/EditUserModal/CredentialModal；ADD 受理后显式关闭人员弹窗仍保留同一凭据；失败断言脱敏文案、无密码、无成功、`accounts` 不插行；ROOT 自动关闭路径独立。验证：同文件对应用例通过。
- [X] 1.3 落地 Home 成员守卫离线/冻结/处理中、ROOT 只发一次；ROOT 双凭据的 N+1 逐项 DOM、普通角色互换无凭据/无密码弹窗、关闭凭据无密码日志已补真实断言。验证：同文件对应用例通过。
- [X] 1.4 落地 Home 真实 COLLABORATOR（删除/解除关联不可见、`deleteContainer` 未调用）、paused 已长期取消禁用、提交前重解析；静默刷新磁盘新值与 online 卡片/弹窗可观察同源已补断言。验证：同文件 online 对应用例通过；首页解冻入口调整见 1.5。
- [X] 1.5 Q85：按新决定移除首页解冻入口；真实首页测试验证冻结时卡片与弹窗均无解冻按钮，独立详情页与管理页面保持原有行为。

## 2. MachineDetail 与 ManageMachine

- [X] 2.1 落地 MachineDetail「装配页面」「保存未修改端口」「显式清空端口」「维护开关顺序」「确认后修复连接」：真实路由/页面/API 替身，只断言修复入口的 `machine:manage` 门；维护状态轮询后既有维护标记不被清除已补真实断言。验证：同文件对应用例通过。
- [X] 2.2 落地 MachineDetail 限额、422/400 真实错误弹窗、添加宿主机描述与最小信任锚、390/320/768/1440 仅 DOM/控件/未知占位（不声称像素布局）。验证：同文件对应用例通过。
- [X] 2.3 落地 ManageMachine 路由 bypass、仍有容器时删除机器计数/禁用、静默刷新保页、paused 卡片 unpause 与 resolver 一致；机器实时 CPU/内存/GPU 展示与新角色入口已补真实断言。验证：同文件对应用例通过。

## 3. ManageUser 与 ManageUserInTable

- [X] 3.1a 落地 ManageUser 路由 bypass、重置密码/删除用户只走用户 API。验证：同文件对应用例通过。
- [X] 3.1b Q84：保存权限组前去重；真实页面回归覆盖重复 matrix 与绑定输入，断言提交 `[2, 5]`。
- [X] 3.2 落地 ManageUser 离线解绑中文原因、paused 已长期取消禁用、容器标题不选中用户行；静默刷新磁盘限额与本用例 `page_size=4` 归属、跨页面 online/ROOT 矩阵已补真实断言。验证：同文件对应用例通过。
- [X] 3.3 落地 ManageUser ADMIN/manage operator 的 start/stop 真实页面矩阵，以及 ManageUserInTable 移动端真实 `TableComponent` 展开、paused 长期父级 disabled/reason。验证：同文件对应用例通过。
- [X] 3.4 已执行页面测试；Q84 去重与 Q85 新的首页入口决策分别由真实页面断言覆盖。

## 4. Workflow follow-up

Q84 与 Q85 已按用户决定处理；首页规格变更由 `remove-home-unpause` 跟踪。

- 按 `openspec instructions apply` 执行并逐项勾选；若实现暴露真实缺陷，先报告父代理并保留证据，不修 app、不弱化测试。
- 运行 official `openspec-verify-change` advisory，不创建 verify.md。
- 精确 no-op sync 五个 delta，确认 28 个主 spec SHA 不变。
- 用 `anvil-test-plan` 维护五个主侧车，再按 `2026-10-28` 归档；保留 Q38 与真实浏览器限制。
- 汇总完整命令、raw exit 与测试/lint 结果交父代理；父代理负责 Git commit，不自行 commit/push。
