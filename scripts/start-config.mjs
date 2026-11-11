/**
 * 生产入口配置解析与启动前就绪检查（FuxiYu Web）。
 * 行为契约见 openspec/specs/frontend--production-server/spec.md。
 */
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export class ConfigError extends Error {
  constructor(message) {
    super(message)
    this.name = 'ConfigError'
  }
}

export const DEFAULT_WEB_HOST = '0.0.0.0'
export const DEFAULT_WEB_PORT = 5173
export const DEFAULT_CTRL_IP = '127.0.0.1'
export const DEFAULT_CTRL_PORT = 5000
export const DEFAULT_PROXY_TIMEOUT_MS = 120000

// setTimeout 超过 32 位有符号上限会退化成 1ms，因此给可配置超时设硬上限。
export const MAX_PROXY_TIMEOUT_MS = 2147483647

function readString(env, key) {
  const raw = env[key]
  if (raw === undefined || raw === null) return undefined
  const value = String(raw).trim()
  return value === '' ? undefined : value
}

function readBoolean(env, keys, fallback) {
  for (const key of keys) {
    const value = readString(env, key)
    if (value === undefined) continue
    const lowered = value.toLowerCase()
    if (lowered === 'true') return true
    if (lowered === 'false') return false
    throw new ConfigError(`${key} 只能取 true 或 false（当前为 "${value}"）`)
  }
  return fallback
}

function readPort(env, key, fallback) {
  const value = readString(env, key)
  if (value === undefined) return fallback
  if (!/^\d+$/.test(value)) {
    throw new ConfigError(`${key} 只能是 0-65535 的整数端口（当前为 "${value}"）`)
  }
  const port = Number(value)
  if (port > 65535) {
    throw new ConfigError(`${key} 超出端口范围 0-65535（当前为 "${value}"）`)
  }
  return port
}

function readTimeoutMs(env) {
  const value = readString(env, 'PROXY_TIMEOUT_MS')
  if (value === undefined) return DEFAULT_PROXY_TIMEOUT_MS
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > MAX_PROXY_TIMEOUT_MS) {
    // 不回显原值：该键的误填可能夹带其它配置片段。
    throw new ConfigError(`PROXY_TIMEOUT_MS 必须是 1-${MAX_PROXY_TIMEOUT_MS} 之间的整数毫秒`)
  }
  return Number(value)
}

/** IPv6 字面量需要加方括号才能拼进 URL。 */
export function urlHost(host) {
  return host.includes(':') && !host.startsWith('[') ? `[${host}]` : host
}

export function ctrlTarget(scheme, ip, port) {
  return `${scheme}://${urlHost(ip)}:${port}`
}

export function formatHostPort(host, port) {
  return `${urlHost(host)}:${port}`
}

export function resolveConfig(env = process.env, root = PROJECT_ROOT) {
  const host = readString(env, 'WEB_HOST') || DEFAULT_WEB_HOST
  const port = readPort(env, 'WEB_PORT', DEFAULT_WEB_PORT)
  // 与 vite.config.js 一致：VITE_ENABLE_SSL 优先于 ENABLE_SSL，默认 true。
  const enableSsl = readBoolean(env, ['VITE_ENABLE_SSL', 'ENABLE_SSL'], true)

  const ctrlIp = readString(env, 'CTRL_IP') || DEFAULT_CTRL_IP
  if (net.isIP(ctrlIp) === 0) {
    // 不回显原值：误填可能带协议、路径或 user:pass@host 这类凭据。
    throw new ConfigError('CTRL_IP 只能是裸 IP（IPv4 或 IPv6），不能包含协议、路径、端口或凭据')
  }
  const ctrlPort = readPort(env, 'CTRL_PORT', DEFAULT_CTRL_PORT)
  const scheme = (readString(env, 'CTRL_SCHEME') || (enableSsl ? 'https' : 'http')).toLowerCase()
  if (scheme !== 'http' && scheme !== 'https') {
    throw new ConfigError('CTRL_SCHEME 只能取 http 或 https')
  }
  const target = ctrlTarget(scheme, ctrlIp, ctrlPort)

  return {
    root,
    distDir: path.join(root, 'dist'),
    indexHtml: path.join(root, 'dist', 'index.html'),
    certFile: path.join(root, 'certs', 'web.pem'),
    keyFile: path.join(root, 'certs', 'web-key.pem'),
    host,
    port,
    enableSsl,
    proxyTimeoutMs: readTimeoutMs(env),
    ctrl: {
      ip: ctrlIp,
      port: ctrlPort,
      scheme,
      target,
      verifyTls: readBoolean(env, ['CTRL_TLS_VERIFY'], false),
    },
  }
}

/** 读取仓库根 .env；shell 环境变量优先，文件缺失不算错误。 */
export function loadWebEnv(root = PROJECT_ROOT, env = process.env) {
  const envFile = path.join(root, '.env')
  if (typeof process.loadEnvFile !== 'function') {
    throw new ConfigError('当前 Node 无法读取 .env（需要 Node 20.12+ 的 process.loadEnvFile），请在 shell 中显式导出环境变量后重试')
  }
  if (!fs.existsSync(envFile)) {
    return { envFile, loaded: false }
  }
  process.loadEnvFile(envFile)
  return { envFile, loaded: true, env }
}

/** 启动前的运行时就绪检查：构建产物与 TLS 材料。 */
export function assertRuntimeReady(config) {
  if (!fs.existsSync(config.indexHtml)) {
    throw new ConfigError(`未找到构建产物 ${config.indexHtml}：请先在仓库根目录执行 npm run build（生产进程不会自动构建）`)
  }
  if (!config.enableSsl) return
  const missing = [config.certFile, config.keyFile].filter((file) => !fs.existsSync(file))
  if (missing.length > 0) {
    throw new ConfigError(
      `ENABLE_SSL 为 true，但缺少 ${missing.join(' 与 ')}：请先执行 npm run gen-cert 生成自签证书` +
        '（生成需要 devDependencies 的 selfsigned，首次请 npm ci 全量安装），或自备证书放到 certs/web.pem 与 certs/web-key.pem',
    )
  }
}