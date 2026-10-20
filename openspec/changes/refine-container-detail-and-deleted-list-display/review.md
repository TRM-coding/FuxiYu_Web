# OpenSpec 最终复审：refine-container-detail-and-deleted-list-display

本次重新读取当前 change 的 `proposal.md`、`design.md`、两份 delta spec，以及两份主规格；没有沿用上一轮审查结论。另只读运行了 OpenSpec 校验并检查了解析后的 delta。除重写本 `review.md` 外，未修改代码、测试、其他规格或 QUESTIONS，未提交。

## VERDICT

VERDICT: APPROVE

未发现会阻塞归档的真实问题。标题和原有 scenario 名称已与主规格同步，新增 requirement 已正确放入 `ADDED`，进度条的无上限/非正上限路径已明确，空 Mount、空镜像和复制失败均有独立场景，接口/数据库边界和中文描述也符合要求。

## 1. 归档同步（通过）

`openspec validate --strict` 当前输出：

```text
Change 'refine-container-detail-and-deleted-list-display' is valid
```

`--json` 报告为 `valid: true`、`issues: []`；没有缺失标题、scenario 被丢弃或归档合并冲突。

### 1.1 MODIFIED 标题精确匹配

- 详情页 delta `specs/frontend--page-container-detail-page/spec.md:3` 的 `### Requirement: ContainerDetailPage 展示并复制既有宿主 bind 路径` 与主规格第 70 行完全一致。
- 已删除页 delta `specs/frontend--page-deleted-containers/spec.md:3` 的 `### Requirement: DeletedContainers 如实展示逻辑大小与测量时间` 与主规格第 84 行完全一致。
- 详情页新增的 `ContainerDetailPage 运行指标资源归属` 已在 `## ADDED Requirements` 下（delta 第 31 行）。
- 已删除页新增的 `DeletedContainers 表格信息层级与 Mount 复制样式` 已在 `## ADDED Requirements` 下（delta 第 37 行）。

`openspec show --json --deltas-only` 的解析结果也确认：详情页 bind requirement 为 `MODIFIED`、运行指标资源归属为 `ADDED`；已删除页用量 requirement 为 `MODIFIED`、表格/Mount requirement 为 `ADDED`。

### 1.2 原有 scenario 名称全部保留

详情页 bind requirement 保留了主规格的三个旧 scenario：

- `有记录时完整展示与复制`
- `空值或旧 Ctrl 缺字段`
- `最近记录与实时核对的区别`

并新增独立的 `复制失败` scenario（delta 第 25-29 行）。

已删除页用量 requirement 保留了主规格的四个旧 scenario：

- `成功样本与旧测量时间`
- `成功且确实为零`
- `测量中`
- `失败、缺项或形状非法`

并新增 `成功样本有上限或没有上限` scenario（delta 第 19-23 行）。

`MODIFIED` 会用 delta 的整个 requirement block 替换主规格同名 block；上述旧 scenario 名称都在，因此不会触发归档的 scenario 丢失检查。

## 2. 用户目标完整性（通过）

| 用户目标 | 当前覆盖 | 结论 |
|---|---|---|
| 详情页 GPU 分配、共享内存、宿主 bind 路径移入运行指标区域 | bind requirement 明确“在运行指标区域完整展示并复制”，新增资源归属 requirement 明确 GPU/共享内存放入运行指标；bind 的新 scenario 断言运行指标展示三项资源、镜像区不重复 | 通过 |
| 详情页镜像区只保留镜像身份与 Dockerfile | bind scenario 断言镜像区只展示镜像身份和已有 Dockerfile；新增资源 requirement 的 `资源字段放入运行指标` 断言镜像卡不再显示 GPU/共享内存；`镜像内容缺失` 断言空镜像显示“未知”、空 Dockerfile 不渲染伪造内容或空代码块 | 通过 |
| 已删除页镜像移入展开详情，主表不再单独占列 | `删除列表显示详情与可复制 Mount` 断言主表无独立镜像列、展开详情显示镜像；ADDED requirement body 明确主表保留容器、机器、Mount、用量、删除时间、状态和操作 | 通过 |
| 已删除页 Mount 使用小号可复制组件，完整路径通过 title 保留 | ADDED requirement 明确 `CopyChip` 的 `meta`/`soft` 小号样式和完整 `title`/复制值；正常场景断言复制值和 `title` 含完整路径 | 通过 |
| 空 Mount 固定“无挂载”，空镜像固定“未知” | `空 Mount 或空镜像` scenario 明确空 Mount 显示“无挂载”且不渲染复制控件，空镜像显示“未知” | 通过 |
| 复制失败独立处理 | 详情页和已删除页各有独立 `复制失败` scenario，均断言显示“复制失败”、路径/title/复制值不变、不发 API/Node 请求 | 通过 |
| 逻辑用量只在成功时显示进度条 | 用量 requirement body 和 `成功样本与旧测量时间`、`成功且确实为零`、`成功样本有上限或没有上限` 均限定成功条；`测量中`、`失败、缺项或形状非法` 明确不渲染成功条 | 通过 |
| 只有正数上限才显示百分比 | body 明确“若已有记录包含正数比较上限”才按比例；`成功样本有上限或没有上限` 的 THEN 明确“有正数上限时按逻辑字节与上限计算”，超限封顶但保留实际值 | 通过 |
| 无上限或非正上限使用无比例成功轨道并说明 | body 和 scenario 明确显示无比例成功轨道、使用 `aria-valuetext` 说明已测量但没有可比上限、不伪造百分比；design 决策 5 给出“已测量，未提供可比上限”的说明语义 | 通过 |
| pending/error/loading/缺项沿用既有文字状态 | `测量中` 覆盖 pending 和列表加载，沿用“读取统计中/测量中”；`失败、缺项或形状非法` 覆盖 error、缺项、非法形状、无挂载和已清理，沿用既有“统计不可用/无挂载/已清理”，不渲染成功条、不写 0 B | 通过 |
| 缩短测量文案并保留完整时间 | body 和 scenario 写死 `测量 {MM-DD HH:mm}`，完整时间放在可访问 `title`/提示属性；scenario 明确时间沿用现有浏览器本地化格式；只有成功样本显示时间 | 通过 |
| 不新增 API、数据库字段、Node 请求或持久化状态 | proposal 第 11 行、design Non-Goals、两份 delta 的 `MUST NOT`/“不引入新的……接口或持久化状态”均有明确声明 | 通过 |

`proposal.md:10` 也已区分“已删除页 Mount 用小号复制组件”和“详情页宿主 bind 路径继续完整展示并可复制”，没有把详情页路径误写成截断芯片。

## 3. 接口 / 数据库边界（通过）

当前文本没有越界：

- `proposal.md:11`：不新增 API、数据库字段、Node 请求或持久化状态。
- `design.md:18`：不增加 API、Node/WSS 回路、数据库列、缓存或新的权限门禁。
- 详情页 bind requirement 和新增资源 requirement：不新增宿主路径输入、页面入口、API 字段、权限判断、接口或持久化状态。
- 已删除页用量 requirement：`MUST NOT` 新增接口字段、数据库字段、Node 请求、缓存或权限门禁。
- 已删除页表格/Mount requirement：`MUST NOT` 新增接口字段、数据库字段、Node 请求或权限门禁。

“正数比较上限”只是对既有记录的条件判断，没有要求新增 limit 字段；当前数据没有该字段时，规范已经给出完整的无比例成功轨道路径，因此不构成接口/数据库扩张。若将来要真实配额百分比，仍应另开 change，而不是在本 change 中加字段。

## 4. 每个 requirement 的正常与边界场景（通过）

| Requirement | 正常场景 | 边界场景 | 结论 |
|---|---|---|---|
| `ContainerDetailPage 展示并复制既有宿主 bind 路径`（MODIFIED） | 有记录时完整展示并复制 | 空值/旧 Ctrl 缺字段；最近记录与实时核对的区别；复制失败 | 正常、边界齐全 |
| `ContainerDetailPage 运行指标资源归属`（ADDED） | GPU/共享内存放入运行指标，镜像卡不再重复 | 缺失/0；镜像内容缺失（空镜像、空 Dockerfile） | 正常、边界齐全 |
| `DeletedContainers 如实展示逻辑大小与测量时间`（MODIFIED） | 成功样本显示进度条、逻辑大小和短测量文案 | 零字节；有正数上限/超限；无上限或非正上限；测量中/加载中；error/缺项/形状非法/无挂载/已清理 | 正常、边界齐全 |
| `DeletedContainers 表格信息层级与 Mount 复制样式`（ADDED） | 无镜像列、展开详情显示镜像、Mount 为小号可复制控件 | 空 Mount；空镜像；复制失败；翻页/刷新/清理/恢复旧流程 | 正常、边界齐全 |

四个 requirement 都至少有一个正常场景和一个边界场景；关键边界（零字节、无上限、非正上限、空值、复制失败、非成功状态）都有明确 THEN，未发现用户目标遗漏。

## 5. 描述性文字（通过）

- `proposal.md`、`design.md` 和两份 delta spec 的说明性文字均为中文。
- 英文只出现在结构关键字（`MODIFIED`、`ADDED`、`GIVEN`/`WHEN`/`THEN`、`SHALL`/`MUST NOT`）、代码标识符/路径（`bind_mount_path`、`image_dockerfile`、`du -sb`、`usageById`、`CopyChip`、`meta`、`soft`、`aria-valuetext`、`pending`、`error`、`bytes`、`measured_at`、`title`）、技术/产品名（`GPU`、`API`、`Node`、`Ctrl`、`WSS`、`Dockerfile`、`Mount`）和时间格式占位（`MM-DD HH:mm`）。
- 没有需要翻译的英文描述句；`Open Questions`、`Goals / Non-Goals` 等是 OpenSpec 结构标题，可保留。

## 6. 非阻塞建议（不影响 VERDICT: APPROVE）

以下问题不构成归档阻塞，也不造成用户目标遗漏；可在后续实现或下一次整理时处理：

1. **详情页 requirement 归属略有重叠**：bind requirement 的正常/空值 scenario 仍顺带断言 GPU/共享内存和镜像卡，而新增的 `运行指标资源归属` requirement 也覆盖 GPU/共享内存，且其 `镜像内容缺失` scenario 覆盖镜像卡。两处规范目前一致，不影响归档；若后续维护希望单一归属，可把 GPU/共享内存和镜像卡断言收敛到 ADDED requirement，bind requirement 只保留路径展示/复制/来源说明。
2. **`aria-valuetext` 文案可统一**：spec 写“说明已测量但没有可比上限”，design 写“已测量，未提供可比上限”。语义一致，但测试若要断言精确文本，建议统一为同一字符串。
3. **正数上限 scenario 的 GIVEN 可补“上限不为正”**：THEN 已覆盖“没有上限或上限不为正”，GIVEN 只列了有可靠上限、超限、无上限；补上非正上限可使测试用例与 THEN 完全对应。
4. **进度条可访问语义可再具体化**：spec 的 `aria-valuetext` 已覆盖无比例状态，但正数上限分支没有明确写 `role="progressbar"`/`aria-valuenow`。实现时建议保证进度条有稳定的可访问角色和值；这不影响当前归档。
5. **样式复用需要落地**：design 复用 `fuxi-nested-child-disk-line` 的文字、track、fill 结构，但这些 class 定义在 `src/components/NestedEntityGrid.css`，`DeletedContainers` 当前没有 import 该 CSS。实现时需显式 import 或在 `DeletedContainers.css` 内复制对应样式，否则无比例轨道可能没有视觉样式。
6. **测试与 Source references 同步**：实施时更新 `DeletedContainersMountUsage.test.jsx:194` 的旧测量文案断言；若归档同步主规格，Source references 可补 `../components/CopyChip`。本 change 目录没有 `tasks.md`，不在本次 proposal/design/specs 审查范围内，也不作为 VERDICT 依据。

## 7. 结论

当前 delta 与主规格的标题、scenario 名称、ADDED/MODIFIED 分节均能正确合并；`openspec validate --strict` 无错误或警告。用户目标、接口/数据库边界、正常/边界场景和中文描述均满足要求。未发现真实阻塞，因此批准。

VERDICT: APPROVE

本次只重写 `review.md`；未修改代码、测试、其他规格或 QUESTIONS；未提交。
