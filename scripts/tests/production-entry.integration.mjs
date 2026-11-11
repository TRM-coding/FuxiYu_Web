import test from 'node:test'
import assert from 'node:assert/strict'
import { X509Certificate } from 'node:crypto'
import fs from 'node:fs'
import https from 'node:https'
import path from 'node:path'

import {
  FIXTURE_DOTFILE_SECRET,
  FIXTURE_INDEX,
  activeTimeoutCount,
  delay,
  makeFixture,
  makeMockCtrl,
  request,
  startEntry,
} from './support/harness.mjs'
import { ConfigError, MAX_PROXY_TIMEOUT_MS, loadWebEnv, resolveConfig } from '../start-config.mjs'
import { classifyUpstreamError, hasDotSegment, isApiPath } from '../start.mjs'

test('isApiPath 只认 /api 与 /api/ 族', () => {
  for (const value of ['/api', '/api/', '/api/users/me/permissions', '/api?a=1', '/api/x?y=z']) {
    assert.equal(isApiPath(value), true, value)
  }
  for (const value of ['/apix', '/apix/x', '//api/x', '/API/x', '/api2/x', '/', '', undefined, '/assets/api.js']) {
    assert.equal(isApiPath(value), false, String(value))
  }
})

test('hasDotSegment 拦住点号与编码点号路径', () => {
  for (const value of ['/.env', '/.git/config', '/assets/.hidden', '/%2Eenv', '/%2e%2e/x', '/a/../b', '/.well-known/x']) {
    assert.equal(hasDotSegment(value), true, value)
  }
  for (const value of ['/', '/index.html', '/assets/app-abc123.js', '/%zz', '/api/x']) {
    assert.equal(hasDotSegment(value), false, value)
  }
})

test('classifyUpstreamError 区分不可达与 TLS 不受信', () => {
  assert.equal(classifyUpstreamError({ code: 'ECONNREFUSED' }), 'upstream_unavailable')
  assert.equal(classifyUpstreamError({ code: 'ECONNRESET' }), 'upstream_unavailable')
  assert.equal(classifyUpstreamError({ code: 'DEPTH_ZERO_SELF_SIGNED_CERT' }), 'upstream_tls_untrusted')
  assert.equal(classifyUpstreamError({ code: 'SELF_SIGNED_CERT_IN_CHAIN' }), 'upstream_tls_untrusted')
  assert.equal(classifyUpstreamError({ message: 'unable to verify the first certificate' }), 'upstream_tls_untrusted')
  assert.equal(classifyUpstreamError(new Error('boom')), 'upstream_error')
})

test('resolveConfig 默认值、写死路径与非法值', () => {
  const root = path.join('C:', 'fixture-root')
  const config = resolveConfig({}, root)
  assert.equal(config.host, '0.0.0.0')
  assert.equal(config.port, 5173)
  assert.equal(config.enableSsl, true)
  assert.equal(config.distDir, path.join(root, 'dist'))
  assert.equal(config.certFile, path.join(root, 'certs', 'web.pem'))
  assert.equal(config.keyFile, path.join(root, 'certs', 'web-key.pem'))
  assert.equal(config.ctrl.target, 'https://127.0.0.1:5000')
  assert.equal(config.ctrl.verifyTls, false)
  assert.equal(config.proxyTimeoutMs, 120000)

  // 不再接受可变路径键：dist/certs 固定按 root 解析。
  const ignored = resolveConfig(
    { WEB_DIST: '/tmp/elsewhere', WEB_CERT_FILE: '/tmp/x.pem', WEB_KEY_FILE: '/tmp/x-key.pem' },
    root,
  )
  assert.equal(ignored.distDir, path.join(root, 'dist'))
  assert.equal(ignored.certFile, path.join(root, 'certs', 'web.pem'))

  assert.equal(resolveConfig({ WEB_PORT: '0' }, root).port, 0)
  assert.equal(resolveConfig({ ENABLE_SSL: 'false' }, root).enableSsl, false)
  assert.equal(resolveConfig({ ENABLE_SSL: 'false' }, root).ctrl.scheme, 'http')
  assert.equal(resolveConfig({ ENABLE_SSL: 'false', CTRL_SCHEME: 'https' }, root).ctrl.scheme, 'https')
  assert.equal(resolveConfig({ VITE_ENABLE_SSL: 'false', ENABLE_SSL: 'true' }, root).enableSsl, false)
  assert.equal(resolveConfig({ CTRL_TLS_VERIFY: 'true' }, root).ctrl.verifyTls, true)
  assert.equal(resolveConfig({ CTRL_IP: '::1' }, root).ctrl.target, 'https://[::1]:5000')
  assert.equal(resolveConfig({ PROXY_TIMEOUT_MS: String(MAX_PROXY_TIMEOUT_MS) }, root).proxyTimeoutMs, MAX_PROXY_TIMEOUT_MS)

  for (const env of [
    { WEB_PORT: 'abc' },
    { WEB_PORT: '70000' },
    { WEB_PORT: '-1' },
    { CTRL_PORT: 'x' },
    { ENABLE_SSL: 'yes' },
    { CTRL_SCHEME: 'ftp' },
    { CTRL_TLS_VERIFY: '1' },
    { PROXY_TIMEOUT_MS: '0' },
    { PROXY_TIMEOUT_MS: String(MAX_PROXY_TIMEOUT_MS + 1) },
    { PROXY_TIMEOUT_MS: 'Infinity' },
    { PROXY_TIMEOUT_MS: '1e9' },
    { PROXY_TIMEOUT_MS: 'abc' },
  ]) {
    assert.throws(() => resolveConfig(env, root), ConfigError, JSON.stringify(env))
  }
})

test('CTRL_IP 只接受裸 IP，且报错不回显原值', () => {
  const root = path.join('C:', 'fixture-root')
  for (const bad of ['localhost', 'https://ctrl.example', 'http://127.0.0.1:5000', 'user:secret@127.0.0.1', '127.0.0.1/path', '127.0.0.1?x=1']) {
    let message = ''
    assert.throws(
      () => resolveConfig({ CTRL_IP: bad }, root),
      (error) => {
        message = error.message
        return error instanceof ConfigError
      },
    )
    assert.ok(!message.includes(bad), `报错回显了原值：${message}`)
    assert.ok(!message.includes('secret'), `报错回显了凭据：${message}`)
  }
})

test('loadWebEnv 读取 root .env 且 shell 环境变量优先', async () => {
  const fixture = await makeFixture({ withCerts: false, withEnvFile: true })
  const snapshot = { ...process.env }
  try {
    process.env.FUXI_FIXTURE_FROM_FILE = 'shell'
    const info = loadWebEnv(fixture.root)
    assert.equal(info.loaded, true)
    assert.equal(process.env.FUXI_FIXTURE_FROM_FILE, 'shell')
    assert.equal(process.env.CTRL_PORT, '1')
    assert.equal(loadWebEnv(path.join(fixture.root, 'nope')).loaded, false)
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in snapshot)) delete process.env[key]
    Object.assign(process.env, snapshot)
    fixture.cleanup()
  }
})

test('gen-cert 缺则建、成对跳过、单个失败、WEB_IP 进 SAN', async () => {
  const { ensureCert, CertError } = await import('../gen-cert.mjs')
  const fixture = await makeFixture({ withCerts: false })
  const logs = []
  const log = (message) => logs.push(message)
  try {
    const created = await ensureCert({ root: fixture.root, env: { WEB_IP: '192.168.5.230' }, log, readEnvFile: false })
    assert.equal(created.created, true)
    assert.ok(fs.existsSync(fixture.certFile) && fs.existsSync(fixture.keyFile))
    const san = new X509Certificate(fs.readFileSync(fixture.certFile)).subjectAltName
    assert.match(san, /IP Address:192\.168\.5\.230/)
    assert.ok(logs.join('\n').includes('192.168.5.230'))

    const certBefore = fs.readFileSync(fixture.certFile)
    const again = await ensureCert({ root: fixture.root, env: { WEB_IP: '192.168.5.230' }, log, readEnvFile: false })
    assert.equal(again.created, false)
    assert.deepEqual(fs.readFileSync(fixture.certFile), certBefore)
    assert.equal(again.webIpCovered, true)

    const logs2 = []
    const missingIp = await ensureCert({ root: fixture.root, env: { WEB_IP: '10.0.0.9' }, log: (m) => logs2.push(m), readEnvFile: false })
    assert.equal(missingIp.created, false)
    assert.equal(missingIp.webIpCovered, false)
    assert.match(logs2.join('\n'), /保留原证书/)
    assert.deepEqual(fs.readFileSync(fixture.certFile), certBefore)

    fs.rmSync(fixture.keyFile)
    await assert.rejects(
      () => ensureCert({ root: fixture.root, env: {}, log, readEnvFile: false }),
      (error) => error instanceof CertError && /不成对/.test(error.message),
    )
    assert.deepEqual(fs.readFileSync(fixture.certFile), certBefore)
  } finally {
    fixture.cleanup()
  }
})

test('生产入口 loopback 集成：静态、代理、边界与错误', async (t) => {
  const fixture = await makeFixture()
  const mock = await makeMockCtrl({ certFile: fixture.certFile, keyFile: fixture.keyFile })
  const logs = []
  const entry = await startEntry({
    fixture,
    log: (message) => logs.push(message),
    env: {
      WEB_PORT: '0',
      WEB_HOST: '127.0.0.1',
      ENABLE_SSL: 'true',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.port),
      CTRL_SCHEME: 'https',
      PROXY_TIMEOUT_MS: '8000',
    },
  })
  const base = { port: entry.port }

  t.after(() => {
    entry.close()
    mock.close()
    fixture.cleanup()
  })

  await t.test('GET /api 透传 401 JSON、多个 Set-Cookie 与响应头', async () => {
    const res = await request({ ...base, path: '/api/users/me/permissions' })
    assert.equal(res.status, 401)
    assert.match(res.headers['content-type'], /application\/json/)
    assert.deepEqual(JSON.parse(res.body), { error: 'unauthorized' })
    assert.equal(res.headers['set-cookie'].length, 2)
    assert.equal(res.headers['x-ctrl-trace'], 'yes')
    assert.equal(res.headers['accept-ranges'], undefined)
    assert.equal(res.headers['x-powered-by'], undefined)
    assert.equal(mock.seen.at(-1).url, '/api/users/me/permissions')
  })

  await t.test('POST 保留方法、路径、query、请求体、Cookie', async () => {
    const res = await request({
      ...base,
      path: '/api/echo?a=1&b=2',
      method: 'POST',
      headers: { 'content-type': 'application/json', cookie: 'session=abc; theme=dark' },
      body: JSON.stringify({ hello: '世界' }),
    })
    assert.equal(res.status, 200)
    const payload = JSON.parse(res.body)
    assert.equal(payload.method, 'POST')
    assert.equal(payload.url, '/api/echo?a=1&b=2')
    assert.deepEqual(JSON.parse(payload.body), { hello: '世界' })
    assert.equal(payload.cookie, 'session=abc; theme=dark')
  })

  await t.test('大请求体逐字节保真', async () => {
    const big = 'x'.repeat(200 * 1024)
    const res = await request({
      ...base,
      path: '/api/echo',
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: big,
    })
    assert.equal(res.status, 200)
    assert.equal(JSON.parse(res.body).body, big)
  })

  await t.test('204 无响应体', async () => {
    const res = await request({ ...base, path: '/api/empty' })
    assert.equal(res.status, 204)
    assert.equal(res.body, '')
  })

  await t.test('上游 404 JSON 透传而不是入口页', async () => {
    const res = await request({ ...base, path: '/api/missing' })
    assert.equal(res.status, 404)
    assert.deepEqual(JSON.parse(res.body), { error: 'not_found' })
    assert.ok(!res.body.includes(FIXTURE_INDEX))
  })

  await t.test('响应分块流式转发（不整体缓冲）', async () => {
    let firstChunkSeen = false
    const chunks = []
    await new Promise((resolve, reject) => {
      const req = https.request(
        { host: '127.0.0.1', port: entry.port, path: '/api/stream', method: 'GET', agent: false, rejectUnauthorized: false },
        (res) => {
          assert.equal(res.statusCode, 200)
          res.on('data', (chunk) => {
            chunks.push(String(chunk))
            if (!firstChunkSeen) {
              firstChunkSeen = true
              assert.match(String(chunk), /first-chunk/)
              mock.releaseStream()
            }
          })
          res.on('end', resolve)
        },
      )
      req.on('error', reject)
      req.end()
    })
    assert.equal(firstChunkSeen, true)
    assert.match(chunks.join(''), /second-chunk/)
  })

  await t.test('/apix 不转发给 Ctrl，也不是 200 入口页', async () => {
    const before = mock.seen.length
    const res = await request({ ...base, path: '/apix/anything' })
    assert.notEqual(res.status, 200)
    assert.equal(mock.seen.length, before)
    assert.ok(!res.body.includes(FIXTURE_INDEX))
  })

  await t.test('缺失 .js 返回 404 非 HTML', async () => {
    const res = await request({ ...base, path: '/assets/app-missing.js' })
    assert.equal(res.status, 404)
    assert.ok(!res.body.includes(FIXTURE_INDEX))
    assert.ok(!/html/i.test(String(res.headers['content-type'] || '')))
  })

  await t.test('路径逃逸被阻断', async () => {
    const res = await request({ ...base, path: '/../package.json' })
    assert.ok(res.status >= 400, `unexpected ${res.status}`)
    assert.ok(!res.body.includes('"name": "fuxi-web"'))
  })

  await t.test('点号路径不泄漏内容', async () => {
    for (const target of ['/.env', '/%2Eenv', '/assets/../.env']) {
      const res = await request({ ...base, path: target })
      assert.ok(res.status >= 400, `${target} -> ${res.status}`)
      assert.ok(!res.body.includes(FIXTURE_DOTFILE_SECRET), target)
    }
  })

  await t.test('目录请求不列出清单', async () => {
    const res = await request({ ...base, path: '/assets/' })
    assert.ok(res.status >= 400, `unexpected ${res.status}`)
    assert.ok(!res.body.includes('app-abc123'))
  })

  await t.test('入口页与静态资源全部禁缓存', async () => {
    const index = await request({ ...base, path: '/' })
    assert.equal(index.status, 200)
    assert.match(index.body, new RegExp(FIXTURE_INDEX))
    assert.equal(index.headers['cache-control'], 'no-cache, no-store, must-revalidate')
    const asset = await request({ ...base, path: '/assets/app-abc123.js' })
    assert.equal(asset.status, 200)
    assert.equal(asset.headers['cache-control'], 'no-cache, no-store, must-revalidate')
  })

  await t.test('HEAD 静态可用且无 body', async () => {
    const res = await request({ ...base, path: '/', method: 'HEAD' })
    assert.equal(res.status, 200)
    assert.equal(res.body, '')
  })

  await t.test('正常请求结束后不残留代理超时定时器', async () => {
    await request({ ...base, path: '/api/missing' })
    const before = activeTimeoutCount()
    await request({ ...base, path: '/api/users/me/permissions' })
    let after = activeTimeoutCount()
    for (let i = 0; i < 10 && after > before; i += 1) {
      await delay(50)
      after = activeTimeoutCount()
    }
    assert.ok(after <= before, `成功请求后仍有未清理定时器：${before} -> ${after}`)
  })

  await t.test('客户端中断后进程仍可服务', async () => {
    await new Promise((resolve) => {
      const req = https.request(
        { host: '127.0.0.1', port: entry.port, path: '/api/slow', method: 'GET', agent: false, rejectUnauthorized: false },
        () => resolve(),
      )
      req.on('error', () => resolve())
      req.end()
      setTimeout(() => {
        req.destroy()
        resolve()
      }, 100)
    })
    await delay(200)
    const res = await request({ ...base, path: '/' })
    assert.equal(res.status, 200)
  })

  await t.test('上游建立连接后断开（http-proxy error 事件）返回 502 且进程继续可用', async () => {
    logs.length = 0
    const res = await request({ ...base, path: '/api/boom' })
    assert.equal(res.status, 502)
    assert.deepEqual(JSON.parse(res.body), { error: 'upstream_unavailable' })
    assert.ok(
      logs.some((line) => line.startsWith('Ctrl 代理失败：')),
      `502 未经由 proxy error 分支产生：${logs.join(' | ')}`,
    )
    const after = await request({ ...base, path: '/api/missing' })
    assert.equal(after.status, 404)
    assert.deepEqual(JSON.parse(after.body), { error: 'not_found' })
  })
})

test('上游超时返回 504 且不挂死', async (t) => {
  const fixture = await makeFixture()
  const mock = await makeMockCtrl({ certFile: fixture.certFile, keyFile: fixture.keyFile, slowMs: 1500 })
  const entry = await startEntry({
    fixture,
    env: {
      WEB_PORT: '0',
      WEB_HOST: '127.0.0.1',
      ENABLE_SSL: 'true',
      CTRL_PORT: String(mock.port),
      CTRL_SCHEME: 'https',
      PROXY_TIMEOUT_MS: '300',
    },
  })
  t.after(() => {
    entry.close()
    mock.close()
    fixture.cleanup()
  })
  const started = Date.now()
  const res = await request({ port: entry.port, path: '/api/slow' })
  assert.equal(res.status, 504)
  assert.deepEqual(JSON.parse(res.body), { error: 'upstream_timeout' })
  assert.ok(Date.now() - started < 1400)
})

test('上游不可达返回 502', async (t) => {
  const fixture = await makeFixture()
  const entry = await startEntry({
    fixture,
    env: {
      WEB_PORT: '0',
      WEB_HOST: '127.0.0.1',
      ENABLE_SSL: 'true',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: '1',
      CTRL_SCHEME: 'https',
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(() => {
    entry.close()
    fixture.cleanup()
  })
  const res = await request({ port: entry.port, path: '/api/x' })
  assert.equal(res.status, 502)
  assert.deepEqual(JSON.parse(res.body), { error: 'upstream_unavailable' })
})

test('上游 TLS 校验失败返回 502 且不泄漏证书路径或堆栈', async (t) => {
  const fixture = await makeFixture()
  const mock = await makeMockCtrl({ certFile: fixture.certFile, keyFile: fixture.keyFile })
  const entry = await startEntry({
    fixture,
    env: {
      WEB_PORT: '0',
      WEB_HOST: '127.0.0.1',
      ENABLE_SSL: 'true',
      CTRL_PORT: String(mock.port),
      CTRL_SCHEME: 'https',
      CTRL_TLS_VERIFY: 'true',
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(() => {
    entry.close()
    mock.close()
    fixture.cleanup()
  })
  const res = await request({ port: entry.port, path: '/api/users/me/permissions' })
  assert.equal(res.status, 502)
  assert.deepEqual(JSON.parse(res.body), { error: 'upstream_tls_untrusted' })
  assert.ok(!/\.pem|certs|BEGIN|at .*\(node:/.test(res.body), res.body)
})