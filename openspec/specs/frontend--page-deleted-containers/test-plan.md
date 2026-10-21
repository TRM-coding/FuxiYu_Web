# DeletedContainers 测试覆盖

规格：[spec.md](spec.md)

## 台账状态

- 主 spec SHA256：`bde6560dc60ea9436c2acebb8d773c7c1061e9e8526208db95eda2b5b1de71c7`
- 本轮映射：已覆盖 9；待复核 19；部分覆盖 0。
- 测试基线：固定版 Web 代码 `a98e51d`；验收文档 HEAD `372fb80`。本轮只同步文档，未重跑业务套件。
- 运行证据：`npm test`（Node v26.8.1，提交 `a98e51d`）→ 前端 64 files / 605 tests、server 40 tests，0 failed / 0 skipped / 0 todo（`.git/direct-q-fixed-commit-suite.log`）。本 capability 的 `DeletedContainersDisplay.test.jsx` 在该套件中为 9 tests 通过；`DeletedContainers.test.jsx`、`DeletedContainersMountUsage.test.jsx`、`DetailPages.test.jsx` 作为回归文件进入同一套件。
- 限制：jsdom 组件测试，没有真实浏览器/E2E/视觉验收；CI 的 Node 20.19.0/22 矩阵未在本轮实际远程运行；本地实际环境为 Node v26.8.1。

## 当前场景映射

| Requirement | Scenario | 覆盖状态 | 测试位置与 nodeid/参数 | 验证范围或缺口 |
| --- | --- | --- | --- | --- |
| DeletedContainers 页面入口与身份 | 装配页面 | 待复核 | — | 本轮未审计；旧契约保留，未用本 change 总套件数字推断该场景已覆盖。 |
| DeletedContainers 主流程 | 恢复需要选择来源 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 主流程 | 差异分段与公布落点 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 构建归属 | 生成生产产物 | 待复核 | — | 本轮未审计；未把一次构建成功当作该场景的逐条断言。 |
| 长期恢复超限保留明确失败反馈 | 数量达到上限 | 待复核 | — | 本轮未审计；旧契约保留。 |
| 已删除容器保留分页与当前操作上下文 | 空页仍可翻页 | 待复核 | — | 本轮未审计；旧契约保留。 |
| 已删除容器保留分页与当前操作上下文 | 操作期间切换分页 | 待复核 | — | 本轮未审计；旧契约保留。 |
| 已删除容器保留分页与当前操作上下文 | 最后一页减少 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 仅按当前页请求异步用量 | 列表先出现、统计后到达 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 仅按当前页请求异步用量 | 仅请求当前页可测记录 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 仅按当前页请求异步用量 | 无挂载、mount_cleaned=true 或 cleaned_at 非空不扫描 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功且确实为零 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_zero_byte_success_renders_success_progress_not_unknown` | 断言 0 B 显示为成功进度条与测量时间，不把零误判为失败/缺项；`a98e51d` 全套件通过，该文件 9/9。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本与旧测量时间 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_success_usage_renders_progress_and_short_measurement_label` | 断言成功进度条、逻辑大小、短测量文案与完整 `title` 时间；不声称实时。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本有上限或没有上限 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_positive_limit_is_determinate_and_missing_limit_is_indeterminate` | 断言正数上限用确定进度与封顶，无/非正上限用无比例轨道和 `aria-valuetext`。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 测量中 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_loading_and_pending_keep_existing_text_without_progress` | 断言 pending/加载沿用既有文字，不渲染成功条、不显示 0 或伪造时间。 |
| DeletedContainers 如实展示逻辑大小与测量时间 | 失败、缺项或形状非法 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_error_missing_and_cleaned_rows_keep_existing_states` | 断言 error/缺项/非法形状/无挂载/已清理保留既有状态，不渲染成功条、不写 0 B。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | pending 收敛即停止 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 离开、翻页、刷新取消 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 清理或恢复后不保留旧用量 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 有界轮询、取消与旧响应失效 | 单页预算耗尽 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 旧 Ctrl 没有统计接口 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 单机失败不拖累其他机器 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 旧 Node 不支持或响应异常 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 保持旧接口兼容与原有流程 | 不扩张权限与持久化 | 待复核 | — | 本轮未审计；旧契约保留。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 删除列表显示详情与可复制 Mount | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip` | 断言主表无独立镜像列、展开详情显示镜像，Mount 为小号复制控件且值/`title` 完整。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 空 Mount 或空镜像 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_empty_mount_has_no_copy_control_and_empty_image_is_unknown` | 断言空 Mount 显示“无挂载”且无复制控件，空镜像显示“未知”。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 复制失败 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_mount_copy_failure_preserves_path` | 断言复制失败反馈出现，路径、`title`、复制值不变。 |
| DeletedContainers 表格信息层级与 Mount 复制样式 | 旧流程 | 已覆盖 | `../../../src/test/DeletedContainersDisplay.test.jsx::test_pagination_usage_polling_cleanup_and_restore_are_unchanged` | 断言翻页、有限轮询、取消、清理、恢复保持原行为，迟到响应不覆盖当前页。 |

## 最近验证

- 时间：2026-10-21 04:01:26 +08:00（固定提交npm test起始时间；本轮归档未重跑）。
- 版本：Web 代码 `a98e51d`；验收文档 `372fb80`。
- 主 spec SHA256：`bde6560dc60ea9436c2acebb8d773c7c1061e9e8526208db95eda2b5b1de71c7`。
- 命令与环境：固定版 `npm test`（Node v26.8.1）→ 64 files / 605 + 40 tests；change 定向 `npx vitest run src/test/ContainerDetailDisplay.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/ContainerDetailBindPath.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainers.test.jsx src/test/DetailPages.test.jsx --maxWorkers=2` → 6 files / 57 tests。
- 结果：上述通过记录均为 0 failed / 0 skipped；未把筛除或跳过用例计入。
- 限制或尚未运行项：真实浏览器/E2E/视觉验收未运行；CI Node 20.19.0/22 未实际远程执行；本台账未重跑业务套件。
