# Spec Delta

## ADDED Requirements

### Requirement: 构建产物不是持续运行入口

生产构建 SHALL 只负责产出 `dist/` 静态产物并正常结束。项目 SHALL 通过 `npm start` 提供持续运行入口，其行为契约由 `frontend--production-server` 承载；`npm run dev` 与 `npm run preview` 保留开发及本地预览用途。构建配置 SHALL 保持构建职责，生产代理与 TLS 由独立启动入口提供。

#### Scenario: 构建只产出静态产物

- **WHEN** 执行 `npm run build`
- **THEN** 只产出 `dist/` 下的静态文件与分包结果，不产出常驻服务进程

#### Scenario: 构建后的持续运行

- **WHEN** 构建完成后执行 `npm start`
- **THEN** 常驻入口读取构建产物并提供服务，构建命令自身不常驻

#### Scenario: 不改构建配置补功能

- **WHEN** 需要生产环境的 HTTPS 与 `/api` 代理
- **THEN** 由生产入口提供；`vite.config.js` 的开发代理与构建分包配置保持原有职责，不因本需求改动
