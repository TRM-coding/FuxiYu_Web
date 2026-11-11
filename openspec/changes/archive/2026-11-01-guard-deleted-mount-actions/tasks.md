# Tasks

## 1. 已清理成功采集的状态三态

- [x] 1.1 在已删除容器状态派生中实现 `original_container_is_valid` 严格三态：已清理且成功采集时 `true` → “已恢复”、`false` → “可能存在残留”、`null`/缺失/非布尔 → “已清理”；验证 `src/test/mountUsage.test.js` 覆盖三态、含 0 B、字段缺失/非布尔及无挂载/已清理优先级。
- [x] 1.2 更新状态标签映射并在桌面表格与移动卡片复用同一派生结果；验证 `DeletedContainersMountUsage.test.jsx`、`DeletedContainersDisplay.test.jsx`、`DeletedContainersMobile.test.jsx` 分别断言“已恢复/可能存在残留/已清理”及无挂载优先。
- [x] 1.3 验证旧 Ctrl 列表缺少 `original_container_is_valid` 时已清理成功记录显示“已清理”，并保留原场景名；运行相关单测与页面测试通过。

## 2. 恢复与清理门禁（已恢复与 `not_found`）

- [x] 2.1 实现 `original_container_is_valid === true` 的保护门禁：即使历史删除记录仍在，清理与恢复均禁用；恢复提示“已恢复”，清理提示“已恢复，无法清理”；确认/提交复检当前记录，确认框不打开、不调用写接口。验证 `true` + 成功/pending/`not_found`/其他结果的桌面与移动测试。
- [x] 2.2 实现门禁优先级：`original_container_is_valid === true` 优先于 `not_found`；`true` 时即使用量为 `not_found` 也提示已恢复。验证 `false`/`null` 或刷新解除后按 `not_found` 与既有列表字段恢复门禁，不保留旧禁用。
- [x] 2.3 实现 `not_found` 门禁（仅 `original_container_is_valid !== true`）：禁用恢复与清理并提示目录不存在；确认/提交复检当前样本。验证桌面与移动按钮禁用、提示存在、确认框不打开且不调用写接口。
- [x] 2.4 验证用量样本更新为非 `not_found` 后按原列表字段恢复门禁；覆盖 `not_found` 被 success、pending、`permission_denied` 等替换后的按钮状态。
- [x] 2.5 验证其他统计结果不改变门禁：成功、pending、`permission_denied`、`node_unavailable`、`node_timeout`、`node_unsupported`、`node_bad_response`、`invalid_path`、批量不可用、缺项/畸形；同时确认 `original_container_is_valid === true` 的保护门禁独立生效。

## 3. 集成核对

- [x] 3.1 运行 `npm run test:web`，确认已删除容器相关桌面/移动、三态、原容器保护、`not_found` 门禁与旧字段回退用例全部通过。
- [x] 3.2 运行 `openspec validate "guard-deleted-mount-actions" --strict`，确认 6 条 MODIFIED 需求与 3 个新增场景通过校验。
- [x] 3.3 人工核对：未新增 Web 请求、接口、数据库字段、Node 请求或权限门禁；页面仅消费列表事实 `original_container_is_valid`，缺失按 `null` 处理；`true` 时清理与重复恢复均禁用。
