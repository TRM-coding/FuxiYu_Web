# DeletedContainers 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`b2fe4a2e3350b487a01c549d5422d34cf785567eeca4e68401561452b6ee44d4`
- 本轮映射：已覆盖 36；部分覆盖 6；待复核 5。
- 测试基线：当前工作区最终实现；历史 `a98e51d` 基线保留。
- 运行证据：父代理最终 `npm test` 68 files/652 tests + server 40 tests，0 failed；本 capability 的 `DeletedContainersDisplay.test.jsx` 9/9、`DeletedContainersMountUsage.test.jsx` 18/18、`DeletedContainers.test.jsx` 10/10、`DeletedContainersMobile.test.jsx` 17/17 在最终全量中通过。
- 真实浏览器：父代理 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。旧 508px/遮挡失败保留为历史。
- 限制：jsdom 测试不能证明真实剪贴板/像素宽度；标注“部分覆盖”的场景由外部 26/315 补足。CI Node 20.19.0/22 未在本轮实际远程运行。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| DeletedContainers 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计直接路由装配；旧契约保留。 |
| DeletedContainers 主流程 | 恢复需要选择来源 | 已覆盖 | ../../../src/test/DeletedContainers.test.jsx::asks which content to use when the restore response says a choice is needed | 断言 requires_choice 先不恢复、选择后按 content_source 提交；最终全量通过。 |
| DeletedContainers 主流程 | 差异分段与公布落点 | 待复核 | — | 本轮未找到直接同时断言 sections 中文标签与逐行差异的页面测试；旧契约保留，未用 `dockerfileDiff` 单测替代整页场景。 |
| DeletedContainers 构建归属 | 生成生产产物 | 待复核 | — | 本轮未把构建成功写成该场景的逐条断言；保留旧契约。 |
| 长期恢复超限保留明确失败反馈 | 数量达到上限 | 待复核 | — | 本轮未审计长期配额错误文案；旧契约保留。 |
| 已删除容器保留分页与当前操作上下文 | 同页刷新保持当前位置 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 断言动作后按当前页刷新并保留分页上下文；最终全量通过。 |
| 已删除容器保留分页与当前操作上下文 | 空页仍可翻页 | 已覆盖 | ../../../src/test/DeletedContainers.test.jsx::当前页为空但 total>0 时仍保留分页入口 | 断言空页保留分页入口并可回翻；最终全量通过。 |
| 已删除容器保留分页与当前操作上下文 | 操作期间切换分页 | 已覆盖 | ../../../src/test/DeletedContainers.test.jsx::动作在途时切换页码：动作完成后跟随当前页刷新 | 断言动作后跟随当前页，不调用旧页回调；最终全量通过。 |
| 已删除容器保留分页与当前操作上下文 | 最后一页减少 | 已覆盖 | ../../../src/test/DeletedContainers.test.jsx::清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页 | 断言仅越界时回退有效末页；最终全量通过。 |
| DeletedContainers 仅按当前页请求异步用量 | 列表先出现、统计后到达 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_19_usage_list_first_stats_later | 断言列表/卡片先显示“读取统计中”，统计后到达才写结果；最终全量通过。 |
| DeletedContainers 仅按当前页请求异步用量 | 仅请求当前页可测记录 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_20_usage_only_current_page_ids | 断言仅发送当前页 [1,2]，请求体不含宿主路径；最终全量通过。 |
| DeletedContainers 仅按当前页请求异步用量 | 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_21_usage_cleaned_no_mount_no_request | 断言已清理/无挂载不进入统计请求并显示原状态。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功且确实为零 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_zero_byte_success_renders_success_progress_not_unknown | 断言 0 B 成功进度条与测量时间，不误判为失败/缺项。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本与旧测量时间 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_success_usage_renders_progress_and_short_measurement_label | 断言成功条、逻辑大小、短测量文案与完整 title 时间。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本有上限或没有上限 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_positive_limit_is_determinate_and_missing_limit_is_indeterminate | 断言正数上限确定比例、无/非正上限用无比例轨道。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 测量中 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_loading_and_pending_keep_existing_text_without_progress | 断言加载/pending 只显示文字，不渲染成功条或伪造 0。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 失败、缺项或形状非法 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_error_missing_and_cleaned_rows_keep_existing_states | 断言 error/缺项/非法/已清理/无挂载保持既有状态，不写 0 B。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | pending 收敛即停止 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::上一批未返回不叠请求；返回后只轮询仍 pending 的行，收敛即停止 | 断言只轮询仍 pending 的行，收敛即停止；最终全量通过。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 离开、翻页、刷新取消 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::翻页 abort 旧请求并丢弃迟到响应，不覆盖新页 | 断言翻页取消旧请求/迟到响应不覆盖新页；刷新/卸载另由同文件相邻用例覆盖。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 清理或恢复后不保留旧用量 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::清理开始时旧统计失效；成功后重载只显示已清理，迟到响应不贴回旧值且不再扫描 | 断言清理后旧 bytes/计时器失效；恢复相邻用例通过。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 单页预算耗尽 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求 | 断言 120 次后停止、显示测量未完成；最终全量通过。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 旧 Ctrl 没有统计接口 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::旧 Ctrl 统计 404/405、success=0 或非法响应只降级为不可用，不填 0、不阻断恢复/清理 | 断言 404/405/非法响应只降级，不阻断恢复清理；最终全量通过。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 单机失败不拖累其他机器 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::逐项 Node 失败只影响对应行，部分成功仍展示真实大小 | 断言逐项失败只影响对应行，成功行保留真实大小。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 旧 Node 不支持或响应异常 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::旧 Ctrl 统计 404/405、success=0 或非法响应只降级为不可用，不填 0、不阻断恢复/清理 | 断言 node_unsupported/timeout/unavailable/bad_response 只显示不可用原因，不填 0。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 不扩张权限与持久化 | 待复核 | — | 本轮无直接断言“不写数据库/不扩 WSS”的自动测试；旧契约保留，不据页面测试推断。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 删除列表显示详情与可复制 Mount | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip | 断言主表无镜像列、详情镜像、小号 Mount 与完整复制值；真实 320 剪贴板由外部 26/315 补足。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 空 Mount 或空镜像 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown | 断言空 Mount 无复制控件、空镜像显示未知。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 复制失败 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_mount_copy_failure_preserves_path | 断言复制失败反馈且路径/title/复制值不变。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 旧流程 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 断言翻页、有限轮询、取消、清理、恢复保持；最终全量通过。 |
| DeletedContainers 移动端复用共享卡片布局 | 390px 以卡片展示七列 | 部分覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_01_mobile_390_seven_columns | 断言卡片/七列/无表格；jsdom 不计算 `scrollWidth`，真实 390px 宽度由外部 26/315 补足。 |
| DeletedContainers 移动端复用共享卡片布局 | 768px 使用卡片而桌面保留表格 | 部分覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_02_mobile_768_desktop_769 | 断言 768 卡片、769 表格；1440/768 的真实布局由外部 26/315 补足。 |
| DeletedContainers 移动端复用共享卡片布局 | 320px 长路径与长名称不遮挡操作 | 部分覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_03_mobile_320_long_actions | 断言卡片内 Mount/操作按钮存在；真实 320px 点击与遮挡由外部 26/315 补足。 |
| DeletedContainers 移动端复用共享卡片布局 | 列定义或数据为空 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_04_mobile_empty_page_pagination | 断言移动空态、描述与分页入口，不生成空白卡片。 |
| DeletedContainers 移动端详情主动展开与收起 | 390px 展开并收起一行详情 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_05_mobile_390_expand_collapse | 断言受控展开/收起、aria、详情字段且不增加用量请求。 |
| DeletedContainers 移动端详情主动展开与收起 | 桌面展开图标与移动按钮共享状态 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_06_desktop_expand_shared_state | 断言桌面 antd 展开图标可打开同一详情；移动受控状态由 `tc_dc_05` 覆盖。 |
| DeletedContainers 移动端详情主动展开与收起 | 详情文本很长 | 部分覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_07_mobile_320_long_detail | 断言长账号详情结构；真实 320px 换行/无溢出由外部 26/315 补足。 |
| DeletedContainers 移动端详情主动展开与收起 | 旧展开 key 不属于当前页 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_08_mobile_stale_key_page_change | 断言翻页后不渲染旧空白详情，当前页字段与用量正常。 |
| DeletedContainers 移动端 Mount 复制与用量状态 | 320px 真实点击复制完整 Mount | 部分覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_09_mobile_320_mount_copy | 断言组件剪贴板调用与完整 title；真实浏览器点击/剪贴板由外部 26/315 补足。 |
| DeletedContainers 移动端 Mount 复制与用量状态 | 复制失败保留路径 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_10_mobile_copy_failure | 断言复制失败提示且路径/title/值不变。 |
| DeletedContainers 移动端 Mount 复制与用量状态 | 390px 展示全部用量状态 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_11_mobile_390_usage_states | 断言成功/零/pending/error/缺项/已清理/无挂载状态且非成功不显示 0 或成功条。 |
| DeletedContainers 移动端 Mount 复制与用量状态 | 390px 统计未返回时显示读取统计中 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_12_mobile_usage_loading | 断言统计未返回显示“读取统计中”，不显示成功条/0/时间。 |
| DeletedContainers 移动端 Mount 复制与用量状态 | 已清理与无挂载不采样 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_13_mobile_cleaned_no_mount_no_sample | 断言已清理/无挂载不进入统计请求并显示原状态。 |
| DeletedContainers 移动端分页、确认流程与轮询语义不变 | 手机翻页并按当前页采样 | 已覆盖 | ../../../src/test/DeletedContainersMobile.test.jsx::tc_dc_14_mobile_page_two_usage | 断言第二页只渲染第二页记录并只采样第二页 ID。 |
| DeletedContainers 移动端分页、确认流程与轮询语义不变 | 手机确认清理与恢复 | 已覆盖 | ../../../src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 断言确认前不调用写接口、确认后刷新当前页；移动卡片布局另由 `tc_dc_05` 覆盖。 |
| DeletedContainers 移动端分页、确认流程与轮询语义不变 | pending 时切换分页 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::翻页 abort 旧请求并丢弃迟到响应，不覆盖新页 | 断言翻页取消旧请求且迟到响应不覆盖新页。 |
| DeletedContainers 移动端分页、确认流程与轮询语义不变 | 移动端最后一页减少 | 已覆盖 | ../../../src/test/DeletedContainers.test.jsx::清空当前页最后一条后按新 total 回到有效页，而不是一律回第一页 | 断言越界时回退有效末页，不强制回首页。 |
| DeletedContainers 移动端分页、确认流程与轮询语义不变 | 轮询预算耗尽 | 已覆盖 | ../../../src/test/DeletedContainersMountUsage.test.jsx::pending 单计时器精确轮询 120 次后停止，提示测量未完成且不再请求 | 断言 120 次后停止、提示测量未完成且不再请求。 |

## 最近验证

- 时间：2026-10-21 15:38 +08:00（父代理最终全量）；历史记录保留 2026-10-21 04:01:26 的 a98e51d 基线。
- 版本：当前工作区最终实现；历史基线 `a98e51d`。
- 主 spec SHA256：`b2fe4a2e3350b487a01c549d5422d34cf785567eeca4e68401561452b6ee44d4`。
- 命令与环境：父代理 `npm test` → 前端 68 files/652 tests、server 40 tests，0 failed；`DeletedContainersMobile.test.jsx` 17/17、`DeletedContainersDisplay.test.jsx` 9/9、`DeletedContainersMountUsage.test.jsx` 18/18、`DeletedContainers.test.jsx` 10/10。
- 结果：新增/修改场景按上表具名测试或机械检查映射；移动宽度/真实点击/纯视觉遮挡标“部分覆盖”，由外部浏览器补足。
- 稳定性：本会话第 15/16 次全量遇到既有 `DeletedContainersMountUsage`/`HomeEligibility` 5 秒超时，单 worker 28 项通过，父代理最终全量通过；原因未充分证明，保留 warning。
- 历史定向证据：`npx vitest run ... --maxWorkers=2` 6 files/57 tests 与固定版 64 files/605+40 tests 记录保留。
- 限制：jsdom 组件测试；真实浏览器补充见下；CI Node 20.19.0/22 未实际远程运行。

## 真实浏览器渲染审计（历史与当前）

### 历史基线（2026-10-21）

- 基线：`e659c22`，页面源码未改。临时审计脚本与产物已移至仓库外，不作为仓库内测试依赖。
- 用例：`deleted-desktop`、`deleted-mobile`、`deleted-permission-denied`；真实 Chromium 153，1440px/390px，固定 API 夹具。
- 历史运行结果：桌面与 403 通过；窄屏失败。桌面 Mount 写入真实剪贴板成功；390px 下列挤压、页面宽达 `508px`，普通点击被相邻单元格遮挡。无未捕获异常、控制台 error 或未建模 API。
- 历史缺陷：窄屏表格列宽与滚动边界当时未修复；该缺陷是本 change 的修复对象，以下当前证据显示已收敛，不再作为当前未修复状态。

### 当前补验（父代理，2026-10-21 15:38 之后）

- 真实 Chromium 26 cases / 315 checks 全部通过，覆盖 320/390/768/1440px 与 769px 表格断点；`verified-complete/results.json` 的 sourceHashes 与当前实现一致。
- 当前 `deleted` 用例覆盖 390/320 卡片七列、真实 Mount 剪贴板、展开/收起、全部用量状态、分页、恢复/清理确认取消与长路径，均通过。
- 父代理最终 `npm test` 68 files/652 tests + server 40 tests 全部通过；本会话 15/16 次全量的既有 5 秒超时见上，单 worker 28 项通过，父代理最终全量通过。
- 未覆盖：真实后端采样/清理/恢复、真实设备、其他浏览器与全部历史场景；不能把夹具确认框当作生产恢复成功。