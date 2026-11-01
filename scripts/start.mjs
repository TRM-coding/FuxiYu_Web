/**
 * FuxiYu Web 生产常驻入口：dist 静态资源 + HTTPS + 同源 /api → Ctrl 代理。
 * PM2 通过 `pm2 start npm --name FuxiYu -- run start` 调用 npm start 拉起本文件。
 * 行为契约见 openspec/specs/frontend--production-server/spec.md。
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import httpServer from 'http-server'
import httpProxy from 'http-proxy'
import {
  ConfigError,
  PROJECT_ROOT,
  assertRuntimeReady,
  formatHostPort,
  loadWebEnv,
  resolveConfig,
} from './start-config.mjs'

const API_PREFIX = '/api'
const NO_STORE = 'no-cache, no-store, must-revalidate'
const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': NO_STORE }

export function defaultLog(message) {
  process.stdout.write(`[fuxi-web] ${message}\n`)
}

function pathnameOf(rawUrl) {
  const raw = String(rawUrl || '')
  const queryAt = raw.indexOf('?')
  return queryAt === -1 ? raw : raw.slice(0, queryAt)
}

/** 只有 /api 与 /api/… 归 Ctrl；/apix、//api、大小写变体都不是。 */
export function isApiPath(rawUrl) {
  const pathname = pathnameOf(rawUrl)
  return pathname === API_PREFIX || pathname.startsWith(`${API_PREFIX}/`)
}

/** 静态侧点号路径守卫：http-server 14.1.1 的 showDotfiles 只管目录列表。 */
export function hasDotSegment(rawUrl) {
  let decoded
  try {
    decoded = decodeURIComponent(pathnameOf(rawUrl))
  } catch {
    // 非法百分号编码留给 http-server 静态层按 400 处理
    return false
  }
  return decoded.split('/').some((segment) => segment.startsWith('.'))
}

function errorCodeOf(error) {
  if (!error) return 'unknown'
  const code = String(error.code || '').trim()
  if (code) return code
  return /certificate|self.signed|SSL|TLS/i.test(String(error.message || '')) ? 'TLS_ERROR' : 'unknown'
}

export function classifyUpstreamError(error) {
  const code = String((error && error.code) || '')
  if (/^(ECONNREFUSED|EHOSTUNREACH|ENETUNREACH|ENOTFOUND|EAI_AGAIN|ECONNRESET|EPIPE|ETIMEDOUT|ESOCKETTIMEDOUT)$/.test(code)) {
    return 'upstream_unavailable'
  }
  if (/CERT|SSL|TLS|SELF_SIGNED|UNABLE_TO_VERIFY/i.test(code) || /certificate|self.signed/i.test(String((error && error.message) || ''))) {
    return 'upstream_tls_untrusted'
  }
  return 'upstream_error'
}

export function buildServer(config, { log = defaultLog } = {}) {
  const states = new WeakMap()

  const proxy = httpProxy.createProxyServer({
    target: config.ctrl.target,
    changeOrigin: true,
    secure: config.ctrl.verifyTls,
  })

  proxy.on('proxyReq', (proxyReq, req) => {
    const state = states.get(req)
    if (state) state.proxyReq = proxyReq
  })

  function proxyApi(req, res, rawRes) {
    const state = { settled: false, timedOut: false, proxyReq: null, timer: null }
    const cleanup = () => {
      if (state.timer) {
        clearTimeout(state.timer)
        state.timer = null
      }
      rawRes.removeListener('close', onClose)
      rawRes.removeListener('error', onRawError)
      rawRes.removeListener('finish', onFinish)
      states.delete(req)
    }
    const settle = () => {
      if (state.settled) return false
      state.settled = true
      cleanup()
      return true
    }
    const fail = (status, code) => {
      if (!settle()) return
      if (!rawRes.headersSent && !rawRes.writableEnded) {
        const body = JSON.stringify({ error: code })
        rawRes.writeHead(status, { ...JSON_HEADERS, 'content-length': Buffer.byteLength(body) })
        rawRes.end(body)
        return
      }
      if (!rawRes.writableEnded) rawRes.destroy()
    }
    const terminate = () => {
      if (state.proxyReq && !state.proxyReq.destroyed) state.proxyReq.destroy()
    }
    // proxy 的 'error' 事件分支只拿得到 state，失败回调随 state 传递并先终止上游请求。
    state.fail = (status, code) => {
      terminate()
      fail(status, code)
    }
    // 正常收完：只回收定时器与监听器，不改动已写出的响应。
    const onFinish = () => {
      settle()
    }
    const onClose = () => {
      const finished = rawRes.writableEnded
      settle()
      if (!finished) terminate()
    }
    const onRawError = (error) => {
      settle()
      terminate()
      log(`客户端连接中断（已忽略）：${errorCodeOf(error)}`)
    }

    states.set(req, state)
    // union 给所有响应统一加了 Accept-Ranges: bytes，JSON 响应不该带。
    rawRes.removeHeader('Accept-Ranges')
    rawRes.on('close', onClose)
    rawRes.on('error', onRawError)
    rawRes.once('finish', onFinish)

    state.timer = setTimeout(() => {
      state.timedOut = true
      state.fail(504, 'upstream_timeout')
    }, config.proxyTimeoutMs)

    // 不传回调：http-proxy 只在没有回调时才 emit 'error'，上游失败统一由上面的处理分支收敛。
    proxy.web(req, rawRes, {})
  }

  // 上游请求出错（连接被拒/被断开/TLS 校验失败等）都落到这里，按请求 state 收敛。
  proxy.on('error', (error, req) => {
    const state = req && states.get(req)
    if (state && typeof state.fail === 'function') {
      const timedOut = state.timedOut
      if (!timedOut) log(`Ctrl 代理失败：${errorCodeOf(error)} → ${config.ctrl.target}`)
      state.fail(timedOut ? 504 : 502, timedOut ? 'upstream_timeout' : classifyUpstreamError(error))
      return
    }
    log(`Ctrl 代理错误：${errorCodeOf(error)}`)
  })

  function gateway(req, res) {
    const rawRes = res.response || res
    const pathname = pathnameOf(req.url)
    const startedAt = Date.now()
    rawRes.once('finish', () => {
      log(`${req.method} ${pathname} ${rawRes.statusCode} ${Date.now() - startedAt}ms`)
    })
    if (isApiPath(req.url)) {
      proxyApi(req, res, rawRes)
      return
    }
    if (hasDotSegment(req.url)) {
      const body = 'Not Found'
      rawRes.writeHead(404, {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': NO_STORE,
        'content-length': Buffer.byteLength(body),
      })
      rawRes.end(body)
      return
    }
    res.emit('next')
  }

  const server = httpServer.createServer({
    root: config.distDir,
    // -1 即 Cache-Control: no-cache, no-store, must-revalidate，全部静态资源保守禁缓存。
    cache: -1,
    // http-server 14.1.1 用 `options.showDir !== 'false'` 判断，必须传字符串。
    showDir: 'false',
    autoIndex: true,
    before: [gateway],
    https: config.enableSsl ? { cert: config.certFile, key: config.keyFile } : undefined,
  })

  return { server, proxy }
}

export function listen(server, config, { log = defaultLog } = {}) {
  return new Promise((resolve, reject) => {
    const rawServer = server.server
    const onStartupError = (error) => {
      rawServer.removeListener('error', onStartupError)
      if (error && error.code === 'EADDRINUSE') {
        reject(new ConfigError(`端口 ${config.port} 已被占用（EADDRINUSE）：请释放该端口或修改 WEB_PORT 后重试`))
        return
      }
      if (error && error.code === 'EACCES') {
        reject(new ConfigError(`没有权限监听端口 ${config.port}（EACCES）：请改用 1024 以上的端口或提升权限`))
        return
      }
      reject(new ConfigError(`监听 ${formatHostPort(config.host, config.port)} 失败：${errorCodeOf(error)}`))
    }
    rawServer.once('error', onStartupError)
    rawServer.listen(config.port, config.host, () => {
      rawServer.removeListener('error', onStartupError)
      rawServer.on('error', (error) => log(`服务运行期错误：${errorCodeOf(error)}`))
      resolve(rawServer.address())
    })
  })
}

function describeConfig(config, address) {
  const bound = address && typeof address === 'object' ? address.port : config.port
  const scheme = config.enableSsl ? 'https' : 'http'
  const lines = [
    `静态根目录：${config.distDir}`,
    `监听地址：${scheme}://${formatHostPort(config.host, bound)}`,
    `Ctrl 上游：${config.ctrl.target}（证书校验：${config.ctrl.verifyTls ? '开启' : '关闭'}）`,
    `代理超时：${config.proxyTimeoutMs} ms；缓存：${NO_STORE}`,
  ]
  lines.push(config.enableSsl ? `TLS 证书：${config.certFile}` : 'TLS：已关闭（ENABLE_SSL=false）')
  return lines
}

function installShutdown(server, log) {
  let closing = false
  const shutdown = (signal) => {
    if (closing) return
    closing = true
    log(`收到 ${signal}，正在关闭…`)
    try {
      server.server.closeIdleConnections()
    } catch {
      // 旧版本 Node 没有该方法
    }
    server.server.close(() => process.exit(0))
    setTimeout(() => process.exit(0), 5000).unref()
  }
  process.on('SIGINT', () => shutdown('SIGINT'))
  process.on('SIGTERM', () => shutdown('SIGTERM'))
}

export async function main({ root = PROJECT_ROOT, env = process.env, log = defaultLog, readEnvFile = true } = {}) {
  if (readEnvFile && env === process.env) {
    const envInfo = loadWebEnv(root)
    if (!envInfo.loaded) log(`未找到 ${envInfo.envFile}，仅使用 shell 环境变量`)
  }
  const config = resolveConfig(env, root)
  assertRuntimeReady(config)
  const { server, proxy } = buildServer(config, { log })
  const address = await listen(server, config, { log })
  for (const line of describeConfig(config, address)) log(line)
  log('已就绪：静态资源与 /api 代理由同一端口提供')
  installShutdown(server, log)
  return { server, proxy, config, address }
}

export function reportStartupFailure(error) {
  const message = error instanceof ConfigError ? error.message : `启动失败：${errorCodeOf(error)}`
  process.stderr.write(`[fuxi-web] ${message}\n`)
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    reportStartupFailure(error)
    process.exit(1)
  })
}