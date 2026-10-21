## 测试计划

<!-- 每个 Scenario 都映射到一个可执行的具名测试；实现后将红灯更新为绿灯。 -->

| 规格要求 | Scenario | 测试文件 | 测试名称 | 初始状态 |
|---|---|---|---|---|
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 有记录时完整展示与复制 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_and_resources_render_in_runtime_metrics | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 空值或旧 Ctrl 缺字段 | src/test/ContainerDetailDisplay.test.jsx | test_missing_bind_path_uses_unrecorded_placeholder_without_request | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 最近记录与实时核对的区别 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_is_labeled_as_recent_record | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 复制失败 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_copy_failure_preserves_value | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 资源字段放入运行指标 | src/test/ContainerDetailDisplay.test.jsx | test_gpu_and_shared_memory_are_not_rendered_in_image_card | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 资源值缺失或为零 | src/test/ContainerDetailDisplay.test.jsx | test_zero_resource_is_distinct_from_missing_resource | 🟢 绿灯 |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 镜像内容缺失 | src/test/ContainerDetailDisplay.test.jsx | test_missing_image_and_dockerfile_use_explicit_placeholders | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本与旧测量时间 | src/test/DeletedContainersDisplay.test.jsx | test_success_usage_renders_progress_and_short_measurement_label | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功且确实为零 | src/test/DeletedContainersDisplay.test.jsx | test_zero_byte_success_renders_success_progress_not_unknown | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本有上限或没有上限 | src/test/DeletedContainersDisplay.test.jsx | test_positive_limit_is_determinate_and_missing_limit_is_indeterminate | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 测量中 | src/test/DeletedContainersDisplay.test.jsx | test_loading_and_pending_keep_existing_text_without_progress | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 失败、缺项或形状非法 | src/test/DeletedContainersDisplay.test.jsx | test_error_missing_and_cleaned_rows_keep_existing_states | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 删除列表显示详情与可复制 Mount | src/test/DeletedContainersDisplay.test.jsx | test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 空 Mount 或空镜像 | src/test/DeletedContainersDisplay.test.jsx | test_empty_mount_has_no_copy_control_and_empty_image_is_unknown | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 复制失败 | src/test/DeletedContainersDisplay.test.jsx | test_mount_copy_failure_preserves_path | 🟢 绿灯 |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 旧流程 | src/test/DeletedContainersDisplay.test.jsx | test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 🟢 绿灯 |

## 覆盖说明

- 台账现有 16 个具名 Scenario（两份 delta spec 共 16 个 `#### Scenario`；tasks/review 中“17 个”为既有计数笔误），已于 2026-10-21 按实现后的真实运行结果全部更新为绿灯；新场景只统计具名测试的通过结果。
- 详情页 7 个场景的证据：[ContainerDetailDisplay.test.jsx](../../../src/test/ContainerDetailDisplay.test.jsx)；已删除页 10 个场景的证据：[DeletedContainersDisplay.test.jsx](../../../src/test/DeletedContainersDisplay.test.jsx)。
- 回归基础已更新：`ContainerDetailBindPath.test.jsx`、`DeletedContainersMountUsage.test.jsx`、`DeletedContainers.test.jsx`、`DetailPages.test.jsx`；`DeletedContainersMountUsage.test.jsx` 的旧“测量于…”断言已改为新的短测量文案 + 完整时间 `title`。
- 正数比较上限存在时断言 `role="progressbar"`、`aria-valuenow` 和封顶行为；没有上限或上限不为正时断言成功无比例轨道及 `aria-valuetext`，不引入新的接口字段。
- pending、error、缺项、无挂载和已清理行沿用现有文字状态；测试确认它们不出现成功进度条且不伪造 0 B。

## 验证证据

最近一次实际运行（2026-10-21）：

- 受影响套件：`NODE_OPTIONS=--no-experimental-webstorage npx vitest run src/test/ContainerDetailDisplay.test.jsx src/test/DeletedContainersDisplay.test.jsx src/test/ContainerDetailBindPath.test.jsx src/test/DeletedContainersMountUsage.test.jsx src/test/DeletedContainers.test.jsx src/test/DetailPages.test.jsx --maxWorkers=2` → 6 files / 57 tests passed。
- 完整前端套件：`NODE_OPTIONS=--no-experimental-webstorage npm run test:web` → 55 files / 473 tests passed。
- 服务端入口集成回归：`npm run test:server` → 34 tests passed（本 change 未改服务端，作为完整回归证据）。
- 生产构建：`npm run build` → Vite 成功（3190 modules transformed，产物输出到 `dist/`）。
- OpenSpec 严格校验：`openspec validate refine-container-detail-and-deleted-list-display --strict` → `Change 'refine-container-detail-and-deleted-list-display' is valid`。
- 实现文件：[ContainerDetailPage.jsx](../../../src/pages/ContainerDetailPage.jsx)、[DeletedContainers.jsx](../../../src/pages/DeletedContainers.jsx)、[DeletedContainers.css](../../../src/pages/DeletedContainers.css)、[DetailPages.css](../../../src/pages/DetailPages.css)。
