import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { spawn } from 'node:child_process'

import { REPO_ROOT, delay, makeFixture, makeMockCtrl, request } from './support/harness.mjs'

const CLI_ENTRY = path.join(REPO_ROOT, 'scripts', 'tests', 'support', 'run-cli.mjs')
const LISTEN_RE = /监听地址：(https?:\/\/[^\s]+)/

function spawnProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    detached: process.platform !== 'win32',
    ...options,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk)
  })
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk)
  })
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })))
  return {
    child,
    get stdout() {
      return stdout
    },
    get stderr() {
      return stderr
    },
    exited,
    async waitFor(predicate, { timeout = 20000, interval = 100 } = {}) {
      const deadline = Date.now() + timeout
      for (;;) {
        const value = predicate()
        if (value) return value
        if (Date.now() > deadline) throw new Error(`等待超时：stdout=${stdout}\nstderr=${stderr}`)
        await delay(interval)
      }
    },
  }
}

function killTree(handle) {
  const { child } = handle
  if (!child.pid || child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  try {
    process.kill(-child.pid, 'SIGTERM')
  } catch {
    child.kill('SIGTERM')
  }
}

function spawnEntry({ root, env }) {
  return spawnProcess(process.execPath, [CLI_ENTRY], {
    env: { ...process.env, FUXI_START_TEST_JSON: JSON.stringify({ root, env }) },
  })
}

async function expectStartupFailure(t, { fixtureOptions, env, expect }) {
  const fixture = await makeFixture(fixtureOptions)
  const handle = spawnEntry({ root: fixture.root, env })
  t.after(async () => {
    killTree(handle)
    await handle.exited
    fixture.cleanup()
  })
  const { code } = await handle.exited
  assert.equal(code, 1, `期望退出码 1，实际 ${code}\nstdout=${handle.stdout}\nstderr=${handle.stderr}`)
  assert.match(handle.stderr, expect)
  return handle
}

test('缺少 dist/index.html 时启动失败退出', async (t) => {
  await expectStartupFailure(t, {
    fixtureOptions: { withIndex: false },
    env: { ENABLE_SSL: 'false', WEB_PORT: '0' },
    expect: /npm run build/,
  })
})

test('缺少证书时启动失败退出', async (t) => {
  await expectStartupFailure(t, {
    fixtureOptions: { withCerts: false },
    env: { ENABLE_SSL: 'true', WEB_PORT: '0' },
    expect: /gen-cert|证书/,
  })
})

test('只存在一半证书时启动失败退出', async (t) => {
  const fixture = await makeFixture()
  fs.rmSync(fixture.keyFile)
  const entry = spawnEntry({ root: fixture.root, env: { ENABLE_SSL: 'true', WEB_PORT: '0', WEB_HOST: '127.0.0.1' } })
  t.after(async () => {
    killTree(entry)
    await entry.exited
    fixture.cleanup()
  })
  const { code } = await entry.exited
  assert.equal(code, 1)
  assert.match(entry.stderr, /web-key\.pem/)
})

test('端口被占用时立即失败退出', async (t) => {
  const squatter = http.createServer(() => {})
  await new Promise((resolve) => squatter.listen(0, '127.0.0.1', resolve))
  const occupied = squatter.address().port
  const fixture = await makeFixture()
  const entry = spawnEntry({
    root: fixture.root,
    env: { ENABLE_SSL: 'false', WEB_HOST: '127.0.0.1', WEB_PORT: String(occupied) },
  })
  t.after(async () => {
    killTree(entry)
    await entry.exited
    squatter.close()
    fixture.cleanup()
  })
  const { code } = await entry.exited
  assert.equal(code, 1, `stdout=${entry.stdout}\nstderr=${entry.stderr}`)
  assert.match(entry.stderr, /已被占用/)
})

test('非法 WEB_PORT 启动失败退出', async (t) => {
  await expectStartupFailure(t, {
    fixtureOptions: {},
    env: { ENABLE_SSL: 'false', WEB_PORT: 'abc' },
    expect: /0-65535/,
  })
})

test('正常启动后服务静态与 /api，SIGINT 可退出', async (t) => {
  const fixture = await makeFixture()
  const mock = await makeMockCtrl({ certFile: fixture.certFile, keyFile: fixture.keyFile })
  const entry = spawnEntry({
    root: fixture.root,
    env: {
      ENABLE_SSL: 'true',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.port),
      CTRL_SCHEME: 'https',
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(async () => {
    killTree(entry)
    await entry.exited
    mock.close()
    fixture.cleanup()
  })

  const origin = await entry.waitFor(() => LISTEN_RE.exec(entry.stdout)?.[1])
  const port = Number(new URL(origin).port)
  assert.ok(port > 0)

  const index = await request({ port, path: '/', tls: true })
  assert.equal(index.status, 200)
  assert.match(index.body, /FUXI_FIXTURE_INDEX/)

  const api = await request({ port, path: '/api/users/me/permissions', tls: true })
  assert.equal(api.status, 401)
  assert.deepEqual(JSON.parse(api.body), { error: 'unauthorized' })
  assert.equal(api.headers['set-cookie'].length, 2)

  entry.child.kill('SIGINT')
  const { code } = await entry.exited
  if (process.platform !== 'win32') assert.equal(code, 0, `stderr=${entry.stderr}`)
  assert.doesNotMatch(entry.stderr, /启动失败/)
})

test('npm start（含 prestart + scripts.start 装配）真实冒烟', async (t) => {
  if (!fs.existsSync(path.join(REPO_ROOT, 'dist', 'index.html'))) {
    t.skip('仓库尚未构建 dist/index.html，跳过 npm start 冒烟（先执行 npm run build）')
    return
  }
  const mock = await makeMockCtrl()
  const npmCli = process.env.npm_execpath
  const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const args = npmCli ? [npmCli, 'run', 'start'] : ['run', 'start']
  const handle = spawnProcess(command, args, {
    cwd: REPO_ROOT,
    env: {
      ...process.env,
      ENABLE_SSL: 'false',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.port),
      CTRL_SCHEME: 'http',
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(async () => {
    killTree(handle)
    await handle.exited
    mock.close()
  })

  const origin = await handle.waitFor(() => LISTEN_RE.exec(handle.stdout)?.[1], { timeout: 60000 })
  const port = Number(new URL(origin).port)
  assert.match(handle.stdout, /\[gen-cert\]/, 'prestart 未执行 gen-cert')

  const index = await request({ port, path: '/', tls: false })
  assert.equal(index.status, 200)
  assert.equal(index.headers['cache-control'], 'no-cache, no-store, must-revalidate')

  const api = await request({ port, path: '/api/users/me/permissions', tls: false })
  assert.equal(api.status, 401)
  assert.equal(api.headers['set-cookie'].length, 2)
  assert.ok(api.body.includes('unauthorized'))
})