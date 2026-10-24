# Tasks

## 1. 实施与行为回归

- [x] 1.1 统一创建配额的当前申请值/有效上限文案、共享内存联动、切机器与降低内存后的校验，并补用户交互回归。
- [x] 1.2 核对机器限额编辑，移除共享滑条8GB并受目标机器内存约束；数字输入和滑条一致，0/未知不混淆，补交互回归。
- [x] 1.3 修正错误呈现以保留超限数值，验证 message/body/data、已知原因、未知原因、401/403/422及网络失败的映射语义，不改认证策略。
- [x] 1.4 更新两份业务 SPEC 和变更 delta，替换旧的允许 shared>mem 提交场景，明确 shared<=mem。

> 1.3 的实现与行为测试已写入（`src/utils/showErrorModal.jsx`、`src/test/ErrorPresentation.test.jsx`）。定向复跑证据：错误弹窗 8 例 + ResourceLimits 8 例共 **16 passed**（`web-resource-cleanup-fixed.log`），故 1.3 勾选。
>
> 2.1 勾选依据：full Web tests 以 `--maxWorkers=2` 重跑（**仅限制并发，未弱化断言**），Windows `web-all-final-two-workers.log` 103.03s、Linux `linux-tests-final.log` 60.70s，均 **28 文件 156 测试全部通过（exit 0）**；此前 CreateContainer 的 5s 并发超时属历史记录，已随重跑通过。

## 2. 主代理验收

- [x] 2.1 主代理运行 Web 回归、生产构建和严格规格校验，核对与 Ctrl 移除8GB修复的契约。