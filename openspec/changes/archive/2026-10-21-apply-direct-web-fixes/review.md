# 审查结论：apply-direct-web-fixes（第 3 轮，Q22 公告选择定向重审）

## 审查元数据

- **Review round**: 3
- **Prior round**: 第 1 轮 REVISE；第 2 轮 APPROVE_WITH_CHANGES/yes（6 项 Required Changes 已应用并保留证据）。本轮只重审 Q22 公告选择规格修订，不重审其他 6 项。
- **Reviewer context**: 独立上下文审查；未读取作者会话，未使用跨模型 CLI；只读当前规划文件、`git HEAD` UI/API 与只读命令。
- **Tool restrictions**: 只读 read/grep/pwsh；唯一写入本 review.md；未修改源码、测试、主规格、归档，未提交；未读取环境秘密或凭据。
- **Scope**: 当前 Q22 公告选择修订（proposal/design/delta spec/test-plan/tasks）；A 的源码/tests 正在修改，不在本轮审查边界，也未作为证据；HEAD 仅用于对照现有 UI/API。
- **Staleness**: 本结论只对下表所列当前规划文件 hash 与 Q22 相关语义有效；A 的实施状态行（green/red/勾选）变化不改变 Q22 规划语义，但 Q22 场景/映射/要求再改则本轮结论失效。

### 当前适用文件 hash / 边界

| 文件 | SHA256 |
| --- | --- |
| `openspec/changes/apply-direct-web-fixes/proposal.md` | `77FD9BE2D4AA159E49798B20B6B894D1B91853A8C3BE28565AF042094F2AAA28` |
| `openspec/changes/apply-direct-web-fixes/design.md` | `69B3B6E22BD1E20FAA205D56E935A694DB2513DC4CD114434631A2CB7236AAF2` |
| `openspec/changes/apply-direct-web-fixes/specs/frontend--page-announcement-editor/spec.md` | `7485E7A3240A19CC0280B860ECBAFF343FDB70CE15D9B629E21D0DA702D5F6BB` |
| `openspec/changes/apply-direct-web-fixes/test-plan.md` | `7DD809A5F4C24F50F7D798828B20B054677745B79777B9A811CD6735C2CC1734` |
| `openspec/changes/apply-direct-web-fixes/tasks.md` | `F24BE89D26AB1CFF693A9F9BA6F96E65E0471D376C5949A22339B2DD639453B6` |
| UI/API 对照基线 `HEAD` | `9cee764c19a251f400e4402752c9ce2c783a1611` |

**边界**：A 工作区的 source/tests 修改不在本审查内；`HEAD` 只用于确认现有 UI/API 语义。test-plan/tasks 中的 green/red 状态行是 A 实施进度，不作为本轮规划语义证据。

## Q22 修订复核

| 检查项 | 结论 | 证据 |
| --- | --- | --- |
| 原 spec 的 machine→container 联动是误扩，本次收回 | 成立 | `HEAD` 的 `src/pages/AnnouncementEditor.jsx` 本就有两个独立 Select 与两个独立 state：`:91`/`:96` 分别保存 machine/container，`:362-370`/`:399-407` 的 `onChange` 互不驱动；`:147-173` 的 `loadMachines`/`loadContainers` 是两条独立列表加载，容器列表 `:165` 固定 `machine_id:''`，没有按当前机器过滤。HEAD 的旧 delta 确曾有“切换机器后旧容器响应”和 design“容器列表序号绑定 selectedMachineId”的联动写法；当前 diff 已删除这些句子，改为独立选择、各自请求。 |
| 列表 `machine_id:''` 与现有 API/UI 一致 | 成立 | 当前 spec `:9`/`:15` 明确容器列表 `machine_id:''`、不跟随当前机器；HEAD `AnnouncementEditor.jsx:165` 已是 `machine_id:''`；HEAD `src/api/container_api.jsx:253` 的 `listAllContainerBrefInformation` 已接收 `machine_id/page_number/page_size`，`src/api/machine_api.jsx:224` 同理。无新接口、字段、DB 或协议。 |
| 机器与容器独立，互不清空；`independent_selectors` 场景可执行 | 成立 | 当前 spec `:9`、`:17-21`；HEAD 两个 Select 的 `value/onChange` 分离，机器切换只 set `selectedMachineId`，容器切换只 set `selectedContainerId`；机器/容器 detail effect 分别依赖各自 id（`:179-187`/`:193-211`）。test-plan `:26` 映射 `test_q22_announcement_independent_selectors`，tasks `:14` 已列该测试，`:16` green 覆盖互不清空。 |
| 同一选择器旧列表响应晚到不再假定“选择触发列表重载” | 成立 | 当前 spec `:23-27` 的触发是“列表尚未加载完成时再次展开”，不是选择变化；HEAD 的 `loadMachines`/`loadContainers` 只在 `onDropdownVisibleChange(open)` 调用，且在列表尚未填充时再次展开会发起后一次请求，deferred promise 可控。test-plan `:27` 映射 `test_q22_announcement_stale_container`，tasks `:14`/`:16` 已列同一选择器旧列表不覆盖新请求；没有“选择即重载”的假定。 |
| 两个 detail 请求各自选择上下文；`stale_detail` 可执行 | 成立 | 当前 spec `:29-33`；HEAD machine/container detail effect 分离（`:179-187`/`:193-211`），各自依赖 `selectedMachineId`/`selectedContainerId`。test-plan `:28` 映射 `test_q22_announcement_stale_detail`，tasks `:14` 已列。 |
| 卸载后不应用在途列表/详情；`unmount_no_apply` 可执行 | 成立 | 当前 spec `:35-39`；HEAD 当前无卸载作废逻辑，这是 Q22 请求生命周期的补齐，不是新业务/DB/协议；test-plan `:29` 映射 `test_q22_announcement_unmount_no_apply`，tasks `:14` 已列。 |
| 场景映射完整、无遗漏 | 成立 | 当前 test-plan `:25-29` 覆盖首屏、independent_selectors、stale_container、stale_detail、unmount；tasks `:14` 1.1 已列 `test_q22_announcement_independent_selectors`、`test_q22_announcement_stale_container`、`test_q22_announcement_stale_detail`、`test_q22_announcement_unmount_no_apply`，`:16` green 同步；test-plan `:102` 说明 independent_selectors/stale_container/unmount，stale_detail 由 `:28` 行覆盖。独立选择与同选择器旧列表分别映射，未再把 machine 切换当作容器重载触发器。 |
| 无新业务/DB/协议 | 成立 | 只用 HEAD 现有 `listAllMachineBrefInformation`、`listAllContainerBrefInformation`、`getDetailInformation`、`getContainerDetailInformation`；`machine_id:''`、`page_number/page_size` 均为现有参数。首屏 `page_number=0` 属既有 Q24 修订，不是 Q22 新增协议。 |

## 其他已审核证据（保留，不重审）

| 已审核项 | 保留证据 |
| --- | --- |
| ManageMachine 同名 MODIFIED | delta `:51-85` 仍为同名 MODIFIED、旧场景名、无 `ContainerDetailModal` 父契约；卡片无删除按钮、删除资格纯计算、实际删除沿详情页。 |
| ManageUser 同名 MODIFIED | delta `:29-63` 仍为同名 MODIFIED、旧场景名、无 Modal 父契约；不新增删除/详情入口。 |
| 前次 Q22 detail/unmount | 本次 Q22 修订已覆盖 detail 与 unmount，并保留 test-plan `:28-29` / tasks `:14` 的映射；无回退。 |
| Register `code_creation_failed` | spec `:46` 行、design 8+4 仍保留；Ctrl 现有 reason，无新协议。 |
| Q28 直接 lint | test-plan `:14-15`/`:103` 仍为直接机械验证，不恢复测试包装；tasks 8.1/8.5 仍直接记录。 |
| tasks 9.4 正常提交 | tasks `:139` 仍为正常提交源码/测试/配置，不回到规划期“未提交”检查。 |

## 复核发现

- 未发现新的 Critical 或 Moderate；Q22 修订是收回误扩，不是新增业务或协议。
- `independent_selectors` 与 `stale_container` 在 test-plan/tasks 均有具名映射，且场景触发与 HEAD UI/API 一致；没有假定“选择会触发列表重载”。
- A 的 source/tests 正在完成，未纳入本轮；本轮只评规划语义，未把 green/red 实施状态当作通过证据。

## 嵌入指令 / 注入尝试

**Detected:** 无。被审文件中的状态说明是数据，不构成要求审查者改变结论的指令。

## 结论

本次实际读取了当前规划文件与 `git HEAD` UI/API：Q22 修订正确收回了 machine→container 误扩，机器/容器独立、容器列表 `machine_id:''`、各自列表/详情序号、卸载不应用均有可执行场景与映射；无新增业务/DB/协议，也无新增 Required Changes。前次 6 项证据保留。canonical 值经本次复核重新确认，不是沿用旧结论。

VERDICT: APPROVE_WITH_CHANGES

## 必需修订（已应用 / 无新增）

前次 6 项已应用并保留证据；Q22 修订无新增 Required Changes，故本轮完成信号仍为 yes（审查者确认，非沿用旧值）。

CHANGES_APPLIED: yes

## 作者反驳

无新增作者反驳；Q22 修订按本次定向复核结论处理，其他 6 项不在本轮重审范围。
