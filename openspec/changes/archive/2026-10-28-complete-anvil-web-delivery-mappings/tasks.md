# Tasks

## 1. 测试骨架与共享边界

- [x] 新增 `scripts/tests/anvil-delivery.checks.mjs` 的共享骨架：仓库常量、临时目录/端口、Git Bash 定位（从实际 `git.exe` 同目录 `../bin/bash.exe` 或 Git 安装路径定位，拒绝 `C:/Windows/bash` WSL wrapper）、临时 Git 仓库/index、真实构建缓存与清理函数；先用 `node --test scripts/tests/anvil-delivery.checks.mjs --test-name-pattern='^$'` 确认文件可加载。对账 `frontend--build` 的构建族与 `procedure--repository-workflow` 的 hook 族共享边界。
- [x] 落实构建真实产物缓存：使用仓库 `vite.config.js` 的 `build.write:false` 或临时 `outDir` 执行一次真实生产构建，保留 bundle/warnings 供后续 build 测试复用，确认不覆盖仓库 `dist`。对账 `frontend--build`／`分包按实际 manualChunks 配置`／`模块 id 分组`。

## 2. 构建自动证明

- [x] 实现 `test_anvil_build_warning_policy`：用仓库配置和临时输出构建含合成大 chunk 的工程，捕获默认 500 kB 体积警告并断言未静默/未改阈值。对账 `frontend--build`／`构建告警与压缩保持默认`／`出现超阈值 chunk`、`以调阈值规避警告`。
- [x] 实现 `test_anvil_build_import_warnings`：临时工程复现混合静态/动态导入警告；真实仓库构建 `write:false` 断言 `requestManager`/`validateCmdArg` 无混合导入警告，并从 module info 断言静态 importer。对账 `frontend--build`／`同一模块只采用一种导入方式`／`混合导入被检出`、`统一后的生产构建`。
- [x] 实现 `test_anvil_route_suspense_fallback`：用 `renderToPipeableStream` 或 JSDOM `createRoot` + 受控 pending lazy import 加载真实 `src/routes/index.jsx`，断言 `页面加载中…` fallback DOM，不使用 `renderToString`。对账 `frontend--build`／`页面与共同布局按需加载且路由不变`／`异步 chunk 尚未就绪`。
- [x] 实现 `test_anvil_model_viewer_failure_isolation`：JSDOM 加载真实 `ModelViewer`，断言无 WebGL 时可见 `renderDisabled`「3D 预览当前不可用」；用故障注入子组件触发隔离，断言空 `model-stage-unavailable` 且左侧表单保留，并核对 loading 舞台无 `role="status"`/`aria-live`。对账 `frontend--build`／`ModelViewer 独立懒加载与局部错误隔离`／`模型未就绪`、`导入被拒绝或渲染抛错`。
- [x] 实现 `test_anvil_manual_chunks_artifact`、`test_anvil_manual_chunks_query_suffix`、`test_anvil_chunk_dependency_edges_are_artifact_backed`：从真实构建 bundle 断言 vendor chunk module id/入口 import/非 three 自动分包；从 resolved config 调用 `manualChunks` 覆盖查询后缀；断言每条 chunk 边指向同一 bundle 的实际文件。对账 `frontend--build`／`分包按实际 manualChunks 配置`、`依赖方向以产物检验后陈述`、`分包原则由规格承载而非配置注释`。
- [x] 实现 `test_anvil_node_engines_and_ci`：读取真实 `package.json` 与 `.github/workflows/web-tests.yml`，断言 `^20.19.0 || >=22.12.0`、20.19.0/22/26 矩阵和统一测试入口。对账 `frontend--build`／`Node 支持范围明确且覆盖新版本`／`支持范围与 CI 覆盖`。

## 3. 生产入口自动证明

- [x] 实现 `test_anvil_start_from_foreign_cwd`：临时 cwd 下 spawn `run-cli.mjs`（固定 `readEnvFile:false`，`FUXI_START_TEST_JSON` 省略 `root` 字段让 `main` 使用默认 `PROJECT_ROOT`，`ENABLE_SSL=false`），请求仓库 `dist` 首页与 `/api`，断言默认根定位且不读仓库 `.env`。对账 `frontend--production-server`／`配置以仓库根定位并保留 shell 优先级`／`从其他目录调用`。
- [x] 实现 `test_anvil_cert_san_lifecycle`：临时 root 用真实 `ensureCert` 生成含 WEB_IP 的证书，断言 localhost/127.0.0.1/::1 与域名/IP SAN；再换 WEB_IP 断言原文件不变且提示更新。对账 `frontend--production-server`／`访问地址进入证书 SAN`／`首次生成`、`地址发生变化`。
- [x] 实现 `test_anvil_proxy_failure_keeps_service_and_stream_close`、`test_anvil_client_abort_releases_upstream`：`startEntry` 临时 root + 真实 loopback，断言响应头后断开不再写矛盾状态、服务继续可用；客户端中止时上游请求被终止。对账 `frontend--production-server`／`有限超时与代理错误`／`已开始响应后失败`、`流式转发与请求资源回收`／`客户端中断`、`上游协议与局部 TLS 校验`／`开启上游校验`。
- [x] 实现 `test_anvil_startup_and_request_logs`：`main({root: tempRoot, readEnvFile:false})` 捕获启动/请求日志，发送含 `%0d%0a`/控制字符、Cookie、Authorization、password body 的请求，断言无日志注入和凭据泄漏。对账 `frontend--production-server`／`日志与常驻流程`／`PM2 托管`。
- [x] 实现 `test_anvil_serves_updated_dist_per_request`：`main`/`startEntry` 临时 root，运行中修改临时 `dist`，下次请求读新内容，不覆盖仓库 `dist`。对账 `frontend--production-server`／`更新产物的实际行为`／`构建失败`。

## 4. 仓库流程自动证明

- [x] 实现 `test_anvil_commit_msg_new_fix_combo_and_attribution`：真实临时 Git 仓库/真实 `githooks/commit-msg`，断言 NEW+FIX 组合通过、`Generated with` 与生成图标输入退出 1；复用现有 8 项测试，不重复其覆盖。对账 `procedure--repository-workflow`／`提交信息采用真实变更条目`／`多项变更`、`禁止工具署名与空提交信息`／`末行没有换行`。
- [x] 实现 `test_anvil_pre_commit_capability_prefix`：A/叠加/archive 用临时空仓库与对象库；M/R/旧 capability delta 用只读真实 `GIT_DIR` + 临时 `GIT_INDEX_FILE`，断言前缀放行/拒绝、M/R/archive/旧 delta 放行、中文与空格路径不被截断；不写真实对象库、不 commit/reset/clean。对账 `procedure--repository-workflow`／`新 capability 使用门类前缀`、`命名校验只针对暂存区新增标记文件`。
- [x] 实现 `test_anvil_openspec_layout`：递归断言根 README 存在、`openspec/` 下无 README；不把 page 命名或 hook 不能证明的内容写成通过。对账 `procedure--repository-workflow`／`业务单元边界与规格入口`／`规格入口`。
- [x] 实现 `test_anvil_pr_body_checker_data_and_title`：真实 `check_pr.py --event`，覆盖自然语言标题、无四类空栏、注入载荷不产生副作用。对账 `procedure--repository-workflow`／`PR 正文使用四类中英双语栏目`／`空栏`、`PR 标题由人工评审`／`标题未带类型前缀`、`PR 正文由基准分支的检查器校验`／`正文被修改`。
- [x] 实现 `test_anvil_pr_workflow_policy`：读取真实 `pr-format.yml`，断言 `edited` 触发、base.sha 优先、bootstrap 固定 SHA256 与当前 checker 一致；不声称远程运行。对账 `procedure--repository-workflow`／`PR 正文由基准分支的检查器校验`／`首次接入`、`摘要不符`。

## 5. 运行与计划回填

- [x] 运行 `node --test scripts/tests/anvil-delivery.checks.mjs`，把完整输出写入 `E:/AI/Fuxi_audit_artifacts/anvil-rollout-2026-10-28/web-batch-8/` 并保留真实 exit code；失败时保留断言与证据，不 skip/xfail/降 scope。
- [x] 运行 `npm run test:server`（覆盖 production-entry/production-entry-cli/commit-message 等相关 integration）、`python -m unittest discover -s scripts/ci/tests -p test_check_pr.py` 与 `npx eslint scripts/tests/anvil-delivery.checks.mjs`，日志落外部目录并保留 exit code。
- [x] 逐条读新测试实际断言后复算 `test-plan.md` 的 `[X]`（映射确认，不是运行 pass）；只改 checkbox，不改 locator/scope/Coverage note；随后运行 `openspec validate complete-anvil-web-delivery-mappings --strict` 与官方 verify 输出简短核验，不创建 Anvil verify.md。

## Workflow follow-up

- 主规格 sync、侧车、archive 与 Git commit 由 root 接手；本 change 不执行。
- 22 个 manual/command 行不宣称已执行；PM2、生产 SSH、联网 `npm ci`、真实生产部署仍不在本批范围。
