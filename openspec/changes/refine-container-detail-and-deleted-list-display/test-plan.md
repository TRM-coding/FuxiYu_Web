## 测试计划

<!-- 每个 Scenario 都映射到一个可执行的具名测试；实现后将红灯更新为绿灯。 -->

| Requirement | Scenario | Test File | Test Name | Initial State |
|---|---|---|---|---|
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 有记录时完整展示与复制 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_and_resources_render_in_runtime_metrics | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 空值或旧 Ctrl 缺字段 | src/test/ContainerDetailDisplay.test.jsx | test_missing_bind_path_uses_unrecorded_placeholder_without_request | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 最近记录与实时核对的区别 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_is_labeled_as_recent_record | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 展示并复制既有宿主 bind 路径 | 复制失败 | src/test/ContainerDetailDisplay.test.jsx | test_bind_path_copy_failure_preserves_value | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 资源字段放入运行指标 | src/test/ContainerDetailDisplay.test.jsx | test_gpu_and_shared_memory_are_not_rendered_in_image_card | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 资源值缺失或为零 | src/test/ContainerDetailDisplay.test.jsx | test_zero_resource_is_distinct_from_missing_resource | 🔴 red |
| specs/frontend--page-container-detail-page/spec.md → ContainerDetailPage 运行指标资源归属 | 镜像内容缺失 | src/test/ContainerDetailDisplay.test.jsx | test_missing_image_and_dockerfile_use_explicit_placeholders | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本与旧测量时间 | src/test/DeletedContainersDisplay.test.jsx | test_success_usage_renders_progress_and_short_measurement_label | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功且确实为零 | src/test/DeletedContainersDisplay.test.jsx | test_zero_byte_success_renders_success_progress_not_unknown | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 成功样本有上限或没有上限 | src/test/DeletedContainersDisplay.test.jsx | test_positive_limit_is_determinate_and_missing_limit_is_indeterminate | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 测量中 | src/test/DeletedContainersDisplay.test.jsx | test_loading_and_pending_keep_existing_text_without_progress | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 如实展示逻辑大小与测量时间 | 失败、缺项或形状非法 | src/test/DeletedContainersDisplay.test.jsx | test_error_missing_and_cleaned_rows_keep_existing_states | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 删除列表显示详情与可复制 Mount | src/test/DeletedContainersDisplay.test.jsx | test_image_moves_to_expanded_detail_and_mount_uses_compact_copy_chip | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 空 Mount 或空镜像 | src/test/DeletedContainersDisplay.test.jsx | test_empty_mount_has_no_copy_control_and_empty_image_is_unknown | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 复制失败 | src/test/DeletedContainersDisplay.test.jsx | test_mount_copy_failure_preserves_path | 🔴 red |
| specs/frontend--page-deleted-containers/spec.md → DeletedContainers 表格信息层级与 Mount 复制样式 | 旧流程 | src/test/DeletedContainersDisplay.test.jsx | test_pagination_usage_polling_cleanup_and_restore_are_unchanged | 🔴 red |

## 覆盖说明

- 当前 change 只新增展示层行为，所有映射均为实现前的红灯；不把已有旧测试的绿色结果冒充新场景通过。
- `ContainerDetailBindPath.test.jsx` 和 `DeletedContainersMountUsage.test.jsx` 是已有回归基础；实现时可合并其 fixture，但必须补上本台账中的具名断言。
- 正数比较上限存在时断言 `role="progressbar"`、`aria-valuenow` 和封顶行为；没有上限或上限不为正时断言成功无比例轨道及 `aria-valuetext`，不引入新的接口字段。
- pending、error、缺项、无挂载和已清理行沿用现有文字状态；测试需确认它们不出现成功进度条且不伪造 0 B。
