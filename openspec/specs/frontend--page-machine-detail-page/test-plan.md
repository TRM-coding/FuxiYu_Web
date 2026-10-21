# MachineDetailPage 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`acfcf8f0a851c42ce31abdc732933eb60bfe7be639c693f843fe1756d5a8d564`
- 本轮映射：已覆盖 6；部分覆盖 4；待复核 4。
- 测试基线：当前工作区最终实现；新增窄屏布局场景复用 `DetailPagesLayout.test.js` 的 CSS 契约测试。
- 运行证据：父代理最终 `npm test` 68 files/652 tests + server 40 tests，0 failed；`MachineSharedLimit.test.jsx` 4/4、`MachineDetailPort.test.jsx` 3/3 在最终全量中通过。
- 真实浏览器：父代理 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`verified-complete/results.json` 的 sourceHashes 与当前实现一致；旧 468px 窄屏失败保留为历史。
- 限制：CSS 契约测试不计算真实 `scrollWidth`；真实机器详情宽度/换行由外部浏览器补足。CI Node 20.19.0/22 未在本轮实际远程运行。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| MachineDetailPage 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计直接路由装配；旧契约保留，不用其他页面测试推断。 |
| MachineDetailPage 主流程 | 保存未修改端口的基本信息 | 已覆盖 | ../../../src/test/MachineDetailPort.test.jsx::未改动端口时保存回传真实端口，而不是 null | 断言自定义端口回填、未修改保存不发送 null；最终全量通过。 |
| MachineDetailPage 主流程 | 内存限额 32 GB、共享限额 16 GB | 已覆盖 | ../../../src/test/MachineSharedLimit.test.jsx::共享内存滑条上限取本次编辑的 max_memory_gb（32 GB），不再固定 8 GB | 断言共享上限取本次内存限额，16 GB 可选并提交；最终全量通过。 |
| MachineDetailPage 主流程 | 确认后修复连接 | 待复核 | — | 本轮未找到直接断言 renew_machine_trust 确认流程的测试；旧契约保留。 |
| MachineDetailPage 限额编辑的输入口径与超限阻断 | 降低内存限额 | 已覆盖 | ../../../src/test/MachineSharedLimit.test.jsx::降低内存上限时同步收敛已有共享值（32→4 时 shared 16→4），保存 payload 不超限 | 断言内存降到 4 GB 时共享同步收敛，保存 payload 不超限；最终全量通过。 |
| MachineDetailPage 限额编辑的输入口径与超限阻断 | 数字输入与滑条同口径 | 已覆盖 | ../../../src/test/MachineSharedLimit.test.jsx::四项限额都有与滑条同口径的数字输入，超上限输入收敛到同一上限 | 断言数字输入与滑条共用收敛边界；最终全量通过。 |
| MachineDetailPage 限额编辑的输入口径与超限阻断 | 限额只在机器详情页编辑 | 待复核 | — | 本轮未审计添加宿主机弹窗与详情页限额编辑的边界；旧契约保留。 |
| MachineDetailPage 保存失败的错误呈现 | 服务层拒绝共享超内存 | 已覆盖 | ../../../src/test/MachineSharedLimit.test.jsx::保存被后端拒绝时把具体 message、状态与路由交给 showErrorModal | 断言 422/具体 message/路由进入 showErrorModal；最终全量通过。 |
| MachineDetailPage 保存失败的错误呈现 | 请求模型层非法值 | 待复核 | — | 本轮未找到 invalid_payload 400 的直接断言；旧契约保留。 |
| MachineDetailPage 构建归属 | 生成生产产物 | 已覆盖（机械检查） | 命令：npm run build | 2026-10-21 15:38 前最终构建通过；仅证明构建产物可生成，不替代页面行为断言。 |
| MachineDetailPage 窄屏共享布局不横向溢出 | 390px 长机器名与长指标文案 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_machine_css_01_390 | 断言共享网格/标题/指标的 CSS 契约；真实 390px `scrollWidth` 由外部 26/315 补足。 |
| MachineDetailPage 窄屏共享布局不横向溢出 | 320px 长 GPU 名称与限制说明 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_machine_css_02_320 | 断言 320px 限额区换行契约与 GPU 省略规则；真实 320px 宽度/控件可见性由外部 26/315 补足。 |
| MachineDetailPage 窄屏共享布局不横向溢出 | 768px 与桌面的共享布局 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_machine_css_03_768_desktop | 断言共享 `minmax(min(460px, 100%), 1fr)` 与卡片 min-width；真实 768/1440 布局由外部 26/315 补足。 |
| MachineDetailPage 窄屏共享布局不横向溢出 | 可选指标缺失时仍保持布局 | 部分覆盖 | ../../../src/test/DetailPagesLayout.test.js::tc_machine_css_04_optional_metrics | 断言指标/运行项换行规则；缺失指标的运行时布局由外部 26/315 补足。 |

## 最近验证

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）。
- 版本：当前工作区最终实现；主 spec SHA256 见上。
- 命令与环境：父代理 `npm test` → 前端 68 files/652 tests、server 40 tests，0 failed；`npm run lint`、`npm run build` 通过。
- 真实浏览器：父代理 Chrome 153 外置 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。
- 稳定性：本会话第 15/16 次全量遇到既有 `HomeEligibility`/`DeletedContainersMountUsage` 5 秒超时；定向单 worker 28 项通过；父代理最终全量通过。原因未充分证明，仅保留 warning，不修改测试或超时配置。
- 限制或尚未运行项：CSS 契约不证明真实像素；未验证真实后端、真实设备、Safari；CI Node 20.19.0/22 未实际远程运行。
