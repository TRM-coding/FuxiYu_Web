# 规格变更：全仓 lint 与 Node 测试运行时

覆盖问题：Q28、Q29。Q29 只固定测试运行环境，不是业务修复。

## ADDED Requirements

### Requirement: 全仓 ESLint 必须零错误零警告

`npm run lint` SHALL 在仓库根目录检查全部既有 `**/*.{js,jsx}` 文件并以退出码 0 结束，输出 MUST 为 0 errors、0 warnings。修复 MUST 按规则与文件批量完成；MUST NOT 通过关闭规则、把规则改为 `off`、新增或扩大 `globalIgnores`、使用 `eslint-disable`/`eslint-disable-next-line`/`eslint-disable-line`、添加 `--ignore-pattern` 或屏蔽源码目录来达标。现有 `globalIgnores(['dist'])` 只忽略构建产物，保持原样，不得借 Q28 扩大或新增其他忽略。

#### Scenario: 全仓 lint 通过

- **GIVEN** 仓库按锁定依赖安装完成
- **WHEN** 在仓库根目录执行 `npm run lint`
- **THEN** 命令退出码为 0，ESLint 汇总为 0 errors、0 warnings，且检查范围仍覆盖 ESLint 配置当前包含的全部 JS/JSX 文件，没有新增忽略

#### Scenario: 禁用规则或忽略目录被拒

- **GIVEN** 代码变更试图通过关闭规则、新增忽略目录、添加 `--ignore-pattern` 或保留 `eslint-disable` 注释来消除报错
- **WHEN** 执行 lint 策略检查
- **THEN** 该做法被判失败，不能作为 Q28 的完成证据

### Requirement: 所有测试入口自动兼容 Node 26 实验 Web Storage

`npm test`、`npm run test:web`、`npm run test:watch`、`npm run test:server` 以及 CI 的测试步骤 SHALL 通过同一测试运行 helper 决定是否注入 `NODE_OPTIONS=--no-experimental-webstorage`：当 `process.allowedNodeEnvironmentFlags` 支持该 flag 时自动注入，不支持时不注入且不得因此失败；MUST NOT 要求用户手工设置 `NODE_OPTIONS`，也 MUST NOT 只修 `npm test` 而让 `npm run test:web` 继续绕过。

#### Scenario: Node 26 测试入口注入 flag

- **GIVEN** 当前 Node 的 `process.allowedNodeEnvironmentFlags` 包含 `--no-experimental-webstorage`
- **WHEN** 执行 `npm test` 或任一测试入口
- **THEN** 子进程环境自动包含该 flag，前端完整 Vitest 套件通过，不需要调用方手工设置环境变量

#### Scenario: 不支持 flag 的 Node 不注入

- **GIVEN** 当前 Node 不支持 `--no-experimental-webstorage`
- **WHEN** 执行任一测试入口
- **THEN** helper 不注入该 flag，测试仍按该 Node 的既有能力运行，不因 flag 不存在而失败

#### Scenario: 直接运行 test:web 同样注入

- **GIVEN** 当前 Node 支持 `--no-experimental-webstorage`
- **WHEN** 直接执行 `npm run test:web` 而不是先经过 `npm test`
- **THEN** 该入口同样自动注入 flag，不发生 jsdom 与实验 Web Storage 冲突

#### Scenario: Node 26 完整前端套件通过

- **GIVEN** 在 Node 26 环境安装锁定依赖
- **WHEN** 执行 `npm test`
- **THEN** 前端 Vitest 套件与生产入口集成测试均通过，证据记录真实文件数、用例数与退出码

### Requirement: Node 支持范围明确且覆盖新版本

`package.json` SHALL 通过 `engines.node` 声明支持范围 `^20.19.0 || >=22.12.0`，MUST NOT 加上仅允许 Node 22 或更低版本的上界；CI SHALL 使用 Node 20.19.0、22、26 的矩阵，覆盖声明下限、当前基线与 Node 26 兼容性。支持范围与矩阵 SHALL 由测试或静态检查守护，不能只写在 README。

#### Scenario: 支持范围与 CI 覆盖

- **GIVEN** 检查 `package.json` 与 Web Tests 工作流
- **WHEN** 读取 `engines.node` 和测试矩阵
- **THEN** `engines.node` 为 `^20.19.0 || >=22.12.0`，矩阵同时包含 Node 20.19.0、22、26，CI 的测试步骤调用统一入口

#### Scenario: 单一旧版本或缺失范围被拒

- **GIVEN** 变更把 CI 固定为仅 Node 22、删除 `engines.node` 或加上只允许旧版本的上界
- **WHEN** 执行支持范围检查
- **THEN** 检查失败，该配置不能作为 Q29 的完成证据
