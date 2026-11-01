import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import http from 'node:http'
import https from 'node:https'
import { spawn, spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { createHash, X509Certificate } from 'node:crypto'
import { PassThrough } from 'node:stream'
import React, { act } from 'react'
import { createRoot } from 'react-dom/client'
import { renderToPipeableStream } from 'react-dom/server'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { JSDOM } from 'jsdom'
import { build, createLogger, createServer, resolveConfig } from 'vite'

import { ensureCert } from '../gen-cert.mjs'
import { main } from '../start.mjs'
import { PROJECT_ROOT } from '../start-config.mjs'
import {
  delay,
  makeFixture,
  makeMockCtrl,
  request,
  startEntry,
} from './support/harness.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const VITE_CONFIG = path.join(REPO_ROOT, 'vite.config.js')
const HOOK_DIR = path.join(REPO_ROOT, 'githooks')
const CHECK_PR = path.join(REPO_ROOT, 'scripts', 'ci', 'check_pr.py')

function findExecutable(name) {
  const command = process.platform === 'win32' ? 'where.exe' : 'which'
  const result = spawnSync(command, [name], { encoding: 'utf8' })
  const first = String(result.stdout || '').split(/\r?\n/).map((line) => line.trim()).find(Boolean)
  return first || null
}

const GIT = findExecutable('git')
if (!GIT) throw new Error('git executable not found')

let cachedBash
function gitBash() {
  if (cachedBash) return cachedBash
  if (process.platform !== 'win32') {
    cachedBash = 'bash'
    return cachedBash
  }
  const candidates = []
  const where = spawnSync('where.exe', ['git'], { encoding: 'utf8' })
  for (const git of String(where.stdout || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean)) {
    candidates.push(path.resolve(path.dirname(git), '..', 'bin', 'bash.exe'))
  }
  for (const root of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) {
    if (root) candidates.push(path.join(root, 'Git', 'bin', 'bash.exe'))
  }
  const found = candidates.find((candidate) => fs.existsSync(candidate))
  if (!found) throw new Error('Git Bash not found next to the actual git.exe or under Program Files\\Git')
  cachedBash = found
  return cachedBash
}

function tempDir(prefix) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix))
}

function removeDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
}

function runGit(args, { cwd = REPO_ROOT, env = {}, input } = {}) {
  return spawnSync(GIT, args, {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    input,
    timeout: 20_000,
  })
}

function gitOk(args, options = {}) {
  const result = runGit(args, options)
  assert.equal(result.status, 0, `${args.join(' ')}\n${result.stderr || result.stdout}`)
  return result.stdout.trim()
}

function runHook(hookName, args, { cwd, env = {} } = {}) {
  return spawnSync(gitBash(), [path.join(HOOK_DIR, hookName), ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
    timeout: 20_000,
  })
}

function withTempGitRepo(check) {
  const root = tempDir('fuxi-anvil-git-')
  try {
    gitOk(['init', '-q'], { cwd: root })
    check(root)
  } finally {
    removeDir(root)
  }
}

function writeMessage(root, message) {
  const messagePath = path.join(root, 'message.txt')
  fs.writeFileSync(messagePath, message, 'utf8')
  return messagePath
}

function startHttpServer(handler, tls = null) {
  return new Promise((resolve, reject) => {
    const server = tls
      ? https.createServer({ cert: fs.readFileSync(tls.certFile), key: fs.readFileSync(tls.keyFile) }, handler)
      : http.createServer(handler)
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => resolve(server))
  })
}

function closeServer(server) {
  server.closeAllConnections?.()
  server.close()
}

function closeEntry(entry) {
  entry.server.server.closeAllConnections?.()
  entry.server.server.close()
}

function runProcess(command, args, options = {}) {
  const child = spawn(command, args, {
    stdio: ['ignore', 'pipe', 'pipe'],
    ...options,
  })
  let stdout = ''
  let stderr = ''
  child.stdout.on('data', (chunk) => { stdout += String(chunk) })
  child.stderr.on('data', (chunk) => { stderr += String(chunk) })
  const exited = new Promise((resolve) => child.on('exit', (code, signal) => resolve({ code, signal })))
  return {
    child,
    get stdout() { return stdout },
    get stderr() { return stderr },
    exited,
    async waitFor(predicate, timeout = 20_000) {
      const deadline = Date.now() + timeout
      for (;;) {
        const value = predicate()
        if (value) return value
        if (Date.now() > deadline) throw new Error(`wait timeout\nstdout=${stdout}\nstderr=${stderr}`)
        await delay(50)
      }
    },
  }
}

function killProcess(handle) {
  if (!handle.child.pid || handle.child.exitCode !== null) return
  if (process.platform === 'win32') {
    spawn('taskkill', ['/pid', String(handle.child.pid), '/T', '/F'], { stdio: 'ignore' })
    return
  }
  handle.child.kill('SIGTERM')
}

let productionBuildPromise
async function getProductionBuild() {
  if (!productionBuildPromise) {
    productionBuildPromise = (async () => {
      const warnings = []
      const logger = createLogger('info')
      logger.warn = (message) => { warnings.push(String(message)) }
      logger.error = (message) => { warnings.push(String(message)) }
      const moduleInfo = []
      const result = await build({
        root: REPO_ROOT,
        configFile: VITE_CONFIG,
        mode: 'production',
        logLevel: 'info',
        customLogger: logger,
        plugins: [{
          name: 'anvil-collect-module-info',
          moduleParsed(info) {
            if (/requestManager\.jsx$|validateCmdArg\.jsx$/.test(info.id)) {
              moduleInfo.push({
                id: info.id,
                importers: info.importers || [],
                dynamicImporters: info.dynamicImporters || [],
              })
            }
          },
        }],
        build: { write: false, emptyOutDir: false },
      })
      const output = Array.isArray(result) ? result[0] : result
      const chunks = output.output.filter((item) => item.type === 'chunk')
      return { warnings, moduleInfo, chunks }
    })()
  }
  return productionBuildPromise
}

function chunkByName(chunks, name) {
  return chunks.find((chunk) => chunk.name === name)
}

function moduleIds(chunk) {
  return Object.keys(chunk.modules || {})
}

async function withViteServer(config = {}) {
  return createServer({
    root: REPO_ROOT,
    configFile: VITE_CONFIG,
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    logLevel: 'error',
    ...config,
  })
}

function renderStream(element) {
  return new Promise((resolve, reject) => {
    const chunks = []
    const stream = new PassThrough()
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    stream.on('error', reject)
    let settled = false
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true
        reject(new Error('renderToPipeableStream timeout'))
      }
    }, 20_000)
    timer.unref()
    const { pipe, abort } = renderToPipeableStream(element, {
      onShellReady() {
        pipe(stream)
      },
      onShellError(error) {
        settled = true
        clearTimeout(timer)
        reject(error)
      },
      onError(error) {
        if (!settled && /Suspense|abort/i.test(String(error?.message))) return
      },
    })
    stream.on('end', () => {
      settled = true
      clearTimeout(timer)
    })
    setImmediate(() => {
      if (!settled) {
        // Keep the stream alive; lazy imports resolve through Vite SSR.
      }
    })
    void abort
  })
}

function installDom() {
  const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost/',
    pretendToBeVisual: true,
  })
  const { window } = dom
  const setGlobal = (key, value) => {
    Object.defineProperty(globalThis, key, {
      value,
      configurable: true,
      writable: true,
      enumerable: true,
    })
  }
  setGlobal('window', window)
  setGlobal('document', window.document)
  setGlobal('navigator', window.navigator)
  setGlobal('self', window)
  setGlobal('HTMLElement', window.HTMLElement)
  setGlobal('HTMLCanvasElement', window.HTMLCanvasElement)
  setGlobal('Node', window.Node)
  setGlobal('MutationObserver', window.MutationObserver)
  setGlobal('getComputedStyle', window.getComputedStyle.bind(window))
  setGlobal('requestAnimationFrame', window.requestAnimationFrame.bind(window))
  setGlobal('cancelAnimationFrame', window.cancelAnimationFrame.bind(window))
  setGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  return dom
}

test('test_anvil_build_warning_policy', async (t) => {
  const resolved = await resolveConfig(
    { configFile: VITE_CONFIG, mode: 'production' },
    'build',
    'production',
  )
  assert.equal(resolved.build.chunkSizeWarningLimit, 500)
  assert.notEqual(resolved.build.minify, false)
  assert.notEqual(resolved.logLevel, 'silent')

  const root = tempDir('fuxi-anvil-big-chunk-')
  t.after(() => removeDir(root))
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><body><script type="module" src="/src/main.js"></script></body>')
  const big = Array.from({ length: 80_000 }, (_, index) => `${index.toString(36)}-${Math.random().toString(36).slice(2)}`).join('|')
  fs.writeFileSync(path.join(root, 'src', 'large.js'), `export const large = ${JSON.stringify(big)}\n`)
  fs.writeFileSync(path.join(root, 'src', 'main.js'), "import { large } from './large.js'\ndocument.body.dataset.large = large\n")

  const warnings = []
  const logger = createLogger('info')
  logger.warn = (message) => { warnings.push(String(message)) }
  logger.error = (message) => { warnings.push(String(message)) }
  await build({
    root,
    configFile: VITE_CONFIG,
    mode: 'production',
    logLevel: 'info',
    customLogger: logger,
    build: { outDir: path.join(root, 'out'), emptyOutDir: true },
  })
  assert.ok(
    warnings.some((warning) => /500/.test(warning) && /(chunk|larger)/i.test(warning)),
    `expected default chunk-size warning, got:\n${warnings.join('\n')}`,
  )
})

test('test_anvil_build_import_warnings', async (t) => {
  const root = tempDir('fuxi-anvil-mixed-import-')
  t.after(() => removeDir(root))
  fs.mkdirSync(path.join(root, 'src'), { recursive: true })
  fs.writeFileSync(path.join(root, 'index.html'), '<!doctype html><body><script type="module" src="/src/main.js"></script></body>')
  fs.writeFileSync(path.join(root, 'src', 'shared.js'), 'export const shared = 1\n')
  fs.writeFileSync(
    path.join(root, 'src', 'main.js'),
    "import { shared } from './shared.js'\nimport('./shared.js')\nconsole.log(shared)\n",
  )

  const warnings = []
  await build({
    root,
    configFile: false,
    mode: 'production',
    logLevel: 'silent',
    customLogger: {
      info() {},
      warn(message) { warnings.push(String(message)) },
      warnOnce(message) { warnings.push(String(message)) },
      error(message) { warnings.push(String(message)) },
      clearScreen() {},
      hasErrorLogged() { return false },
      hasWarned: false,
    },
    build: {
      write: false,
      rollupOptions: {
        onwarn(warning) { warnings.push(String(warning.message || warning)) },
      },
    },
  })
  assert.ok(
    warnings.some((warning) => /dynamically imported/i.test(warning) && /statically imported/i.test(warning)),
    `expected mixed static/dynamic import warning, got:\n${warnings.join('\n')}`,
  )

  const production = await getProductionBuild()
  const relevant = production.warnings.filter((warning) => /requestManager|validateCmdArg/.test(warning))
  assert.deepEqual(relevant, [])
  for (const moduleName of ['requestManager.jsx', 'validateCmdArg.jsx']) {
    const info = production.moduleInfo.find((item) => item.id.endsWith(moduleName))
    assert.ok(info, `production build did not parse ${moduleName}`)
    assert.ok(info.importers.length > 0, `${moduleName} has no static importer`)
    assert.equal(info.dynamicImporters.length, 0, `${moduleName} is dynamically imported`)
  }
})

test('test_anvil_model_viewer_failure_isolation', async () => {
  const dom = installDom()
  const roots = []
  const servers = []
  const originalConsoleError = console.error
  try {
    console.error = () => {}
    const server = await withViteServer()
    servers.push(server)
    const { default: ModelViewer } = await server.ssrLoadModule('/src/components/ModelViewer.jsx')
    const container = document.getElementById('root')
    const root = createRoot(container)
    roots.push(root)
    await act(async () => {
      root.render(React.createElement(ModelViewer, { modelPath: '/missing.glb' }))
    })
    assert.match(container.textContent, /3D 预览当前不可用/)

    const { default: LoginLayout } = await server.ssrLoadModule('/src/layouts/LoginLayout.jsx')
    const loadingContainer = document.createElement('div')
    document.body.appendChild(loadingContainer)
    const loadingRoot = createRoot(loadingContainer)
    roots.push(loadingRoot)
    act(() => {
      loadingRoot.render(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/'] },
          React.createElement(
            Routes,
            null,
            React.createElement(
              Route,
              { path: '/', element: React.createElement(LoginLayout) },
              React.createElement(Route, { index: true, element: React.createElement('input', { placeholder: 'left-form' }) }),
            ),
          ),
        ),
      )
    })
    const loadingStage = loadingContainer.querySelector('[data-testid="model-stage-loading"]')
    assert.ok(loadingStage, 'actual LoginLayout did not render a Suspense loading stage')
    assert.equal(loadingStage.childElementCount, 0)
    assert.equal(loadingStage.hasAttribute('role'), false)
    assert.equal(loadingStage.hasAttribute('aria-live'), false)
    await act(async () => { await delay(300) })

    const throwServer = await withViteServer({
      plugins: [{
        name: 'anvil-export-model-stage-boundary',
        enforce: 'pre',
        transform(code, id) {
          if (id.endsWith('LoginLayout.jsx')) return `${code}\nexport { ModelStageBoundary }\n`
          return null
        },
      }],
    })
    servers.push(throwServer)
    const { ModelStageBoundary } = await throwServer.ssrLoadModule('/src/layouts/LoginLayout.jsx')
    function ThrowingChild() {
      throw new Error('injected render failure')
    }
    const throwContainer = document.createElement('div')
    document.body.appendChild(throwContainer)
    const failureRoot = createRoot(throwContainer)
    roots.push(failureRoot)
    await act(async () => {
      failureRoot.render(
        React.createElement(
          'div',
          null,
          React.createElement('input', { placeholder: 'left-form' }),
          React.createElement(
            ModelStageBoundary,
            null,
            React.createElement(ThrowingChild),
          ),
        ),
      )
    })
    const unavailable = throwContainer.querySelector('[data-testid="model-stage-unavailable"]')
    assert.ok(unavailable, 'render failure was not isolated to the model stage')
    assert.equal(unavailable.childElementCount, 0)
    assert.ok(throwContainer.querySelector('input[placeholder="left-form"]'), 'left form was removed by viewer failure')
  } finally {
    console.error = originalConsoleError
    for (const root of roots.reverse()) {
      try {
        await act(async () => { root.unmount() })
      } catch { /* already unmounted */ }
    }
    await delay(100)
    for (const server of servers) await server.close()
    dom.window.close()
    for (const key of [
      'window', 'document', 'navigator', 'self', 'HTMLElement', 'HTMLCanvasElement',
      'Node', 'MutationObserver', 'getComputedStyle', 'requestAnimationFrame',
      'cancelAnimationFrame', 'IS_REACT_ACT_ENVIRONMENT',
    ]) {
      delete globalThis[key]
    }
  }
})

test('test_anvil_route_suspense_fallback', async () => {
  const server = await withViteServer()
  try {
    const { default: AppRoutes } = await server.ssrLoadModule('/src/routes/index.jsx')
    const { PermissionProvider } = await server.ssrLoadModule('/src/contexts/PermissionProvider.jsx')
    const html = await renderStream(
      React.createElement(
        MemoryRouter,
        { initialEntries: ['/'] },
        React.createElement(PermissionProvider, null, React.createElement(AppRoutes)),
      ),
    )
    assert.match(html, /页面加载中…/)
  } finally {
    await server.close()
  }
})

test('test_anvil_manual_chunks_artifact', async () => {
  const { chunks } = await getProductionBuild()
  const react = chunkByName(chunks, 'vendor-react')
  const addons = chunkByName(chunks, 'vendor-three-addons')
  const webgl = chunkByName(chunks, 'vendor-three-webgl')
  const core = chunkByName(chunks, 'vendor-three-core')
  assert.ok(react && addons && webgl && core, 'expected vendor chunks are missing')
  const reactIds = moduleIds(react).join('\n')
  for (const token of ['react', 'react-dom', 'react-router', 'scheduler']) {
    assert.match(reactIds, new RegExp(`node_modules[\\\\/](?:@?[^\\\\/]+[\\\\/])?${token}[\\\\/]`))
  }
  const addonIds = moduleIds(addons).join('\n')
  assert.match(addonIds, /node_modules[\\/]three[\\/]examples[\\/]/)
  const webglIds = moduleIds(webgl).join('\n')
  assert.match(webglIds, /node_modules[\\/]three[\\/]build[\\/]three\.module\.js/)
  const coreIds = moduleIds(core).join('\n')
  assert.match(coreIds, /node_modules[\\/]three[\\/]/)
  assert.doesNotMatch(coreIds, /three[\\/](examples|build[\\/]three\.module\.js)/)

  const entry = chunks.find((chunk) => chunk.isEntry)
  assert.ok(entry, 'entry chunk missing')
  assert.ok(entry.imports.some((file) => file.includes('vendor-react')), 'entry does not import vendor-react')

  const autoChunkHasNodeModules = chunks
    .filter((chunk) => !chunk.name.startsWith('vendor-'))
    .some((chunk) => moduleIds(chunk).some((id) => /node_modules[\\/]antd[\\/]/.test(id)))
  assert.equal(autoChunkHasNodeModules, true, 'expected a non-three node_modules module in an automatic chunk')
})

test('test_anvil_manual_chunks_query_suffix', async () => {
  const resolved = await resolveConfig(
    { configFile: VITE_CONFIG, mode: 'production' },
    'build',
    'production',
  )
  const output = resolved.build.rollupOptions.output
  const outputOptions = Array.isArray(output) ? output[0] : output
  const manualChunks = outputOptions.manualChunks
  assert.equal(typeof manualChunks, 'function')
  assert.equal(
    manualChunks('/repo/node_modules/three/build/three.module.js?commonjs-proxy'),
    'vendor-three-webgl',
  )
  assert.equal(
    manualChunks('/repo/node_modules/three/build/three.module.js?query=1'),
    'vendor-three-webgl',
  )
  assert.equal(
    manualChunks('/repo/node_modules/three/src/Three.js?query=1'),
    'vendor-three-core',
  )
  assert.equal(
    manualChunks('/repo/node_modules/three/examples/jsm/loaders/GLTFLoader.js?query=1'),
    'vendor-three-addons',
  )
})

test('test_anvil_chunk_dependency_edges_are_artifact_backed', async () => {
  const { chunks } = await getProductionBuild()
  const fileNames = new Set(chunks.map((chunk) => chunk.fileName))
  for (const chunk of chunks) {
    for (const imported of chunk.imports) {
      assert.ok(fileNames.has(imported), `${chunk.fileName} imports missing chunk ${imported}`)
    }
  }
})

test('test_anvil_node_engines_and_ci', () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, 'package.json'), 'utf8'))
  assert.equal(packageJson.engines.node, '^20.19.0 || >=22.12.0')
  const workflow = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'web-tests.yml'), 'utf8')
  assert.match(workflow, /node:\s*\[[^\]]*["']20\.19\.0["'][^\]]*["']22["'][^\]]*["']26["']/s)
  assert.match(workflow, /run:\s*npm run test/)
})

test('test_anvil_start_from_foreign_cwd', async (t) => {
  assert.equal(PROJECT_ROOT, REPO_ROOT)
  const cwd = tempDir('fuxi-anvil-foreign-cwd-')
  const mock = await makeMockCtrl()
  t.after(() => {
    removeDir(cwd)
    mock.close()
  })
  const handle = runProcess(process.execPath, [path.join(REPO_ROOT, 'scripts', 'tests', 'support', 'run-cli.mjs')], {
    cwd,
    env: {
      ...process.env,
      FUXI_START_TEST_JSON: JSON.stringify({
        env: {
          ENABLE_SSL: 'false',
          WEB_HOST: '127.0.0.1',
          WEB_PORT: '0',
          CTRL_SCHEME: 'http',
          CTRL_IP: '127.0.0.1',
          CTRL_PORT: String(mock.port),
          PROXY_TIMEOUT_MS: '5000',
        },
      }),
    },
  })
  try {
    const match = await handle.waitFor(() => /监听地址：(http:\/\/[^\s]+)/.exec(handle.stdout))
    const port = Number(new URL(match[1]).port)
    assert.ok(
      handle.stdout.includes(path.join(REPO_ROOT, 'dist')),
      `main did not use default PROJECT_ROOT/dist:\n${handle.stdout}\n${handle.stderr}`,
    )
    const staticResponse = await request({ port, path: '/', tls: false })
    assert.equal(staticResponse.status, 200)
    assert.match(staticResponse.body, /<div id="root">/)
    const apiResponse = await request({ port, path: '/api/users/me/permissions', tls: false })
    assert.equal(apiResponse.status, 401)
    assert.deepEqual(JSON.parse(apiResponse.body), { error: 'unauthorized' })
    assert.ok(
      mock.seen.some((entry) => entry.url === '/api/users/me/permissions'),
      `mock Ctrl did not receive the API request: ${JSON.stringify(mock.seen)}`,
    )
  } finally {
    killProcess(handle)
    await handle.exited
  }
})

test('test_anvil_cert_san_lifecycle', async (t) => {
  const ipFixture = await makeFixture({ withCerts: false })
  const domainFixture = await makeFixture({ withCerts: false })
  t.after(() => {
    ipFixture.cleanup()
    domainFixture.cleanup()
  })
  const ipLogs = []
  const created = await ensureCert({
    root: ipFixture.root,
    env: { WEB_IP: '192.168.5.230' },
    log: (line) => ipLogs.push(line),
    readEnvFile: false,
  })
  assert.equal(created.created, true)
  const san = new X509Certificate(fs.readFileSync(ipFixture.certFile)).subjectAltName
  assert.match(san, /DNS:localhost/)
  assert.match(san, /IP Address:127\.0\.0\.1/)
  assert.match(san, /(IP Address:::1|IP Address:0:0:0:0:0:0:0:1)/)
  assert.match(san, /IP Address:192\.168\.5\.230/)

  const before = fs.readFileSync(ipFixture.certFile)
  const missing = await ensureCert({
    root: ipFixture.root,
    env: { WEB_IP: '10.0.0.9' },
    log: (line) => ipLogs.push(line),
    readEnvFile: false,
  })
  assert.equal(missing.created, false)
  assert.equal(missing.webIpCovered, false)
  assert.deepEqual(fs.readFileSync(ipFixture.certFile), before)
  assert.ok(ipLogs.some((line) => /保留原证书/.test(line)))
  assert.ok(ipLogs.some((line) => /备份/.test(line)))

  const domain = await ensureCert({
    root: domainFixture.root,
    env: { WEB_IP: 'example.test' },
    log: () => {},
    readEnvFile: false,
  })
  assert.equal(domain.created, true)
  const domainSan = new X509Certificate(fs.readFileSync(domainFixture.certFile)).subjectAltName
  assert.match(domainSan, /DNS:example\.test/)
})

test('test_anvil_proxy_failure_keeps_service_and_stream_close', async (t) => {
  const fixture = await makeFixture()
  const mock = await startHttpServer((req, res) => {
    if (String(req.url).startsWith('/api/stream-fail')) {
      res.writeHead(200, { 'content-type': 'text/plain' })
      res.write('partial-response')
      setTimeout(() => res.destroy(), 20)
      return
    }
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
  })
  const entry = await startEntry({
    fixture,
    env: {
      ENABLE_SSL: 'false',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_SCHEME: 'http',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.address().port),
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  const tlsFixture = await makeFixture()
  const tlsMock = await makeMockCtrl({ certFile: tlsFixture.certFile, keyFile: tlsFixture.keyFile })
  const tlsEntry = await startEntry({
    fixture: tlsFixture,
    env: {
      ENABLE_SSL: 'true',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_SCHEME: 'https',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(tlsMock.port),
      CTRL_TLS_VERIFY: 'true',
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(() => {
    closeEntry(entry)
    closeServer(mock)
    closeEntry(tlsEntry)
    tlsMock.close()
    fixture.cleanup()
    tlsFixture.cleanup()
  })

  const streamResult = await new Promise((resolve) => {
    const req = http.request({ host: '127.0.0.1', port: entry.port, path: '/api/stream-fail', method: 'GET' }, (res) => {
      let body = ''
      res.on('data', (chunk) => { body += String(chunk) })
      res.on('end', () => resolve({ status: res.statusCode, body }))
      res.on('error', (error) => resolve({ status: res.statusCode, body, error }))
      res.on('aborted', () => resolve({ status: res.statusCode, body, aborted: true }))
    })
    req.on('error', (error) => resolve({ error }))
    req.end()
  })
  assert.equal(streamResult.status, 200)
  assert.ok(String(streamResult.body).includes('partial-response'))
  assert.doesNotMatch(String(streamResult.body), /upstream_(timeout|unavailable)/)

  const staticAfterStream = await request({ port: entry.port, path: '/', tls: false })
  assert.equal(staticAfterStream.status, 200)

  const tlsResponse = await request({ port: tlsEntry.port, path: '/api/users/me/permissions' })
  assert.equal(tlsResponse.status, 502)
  assert.deepEqual(JSON.parse(tlsResponse.body), { error: 'upstream_tls_untrusted' })
  const staticAfterTls = await request({ port: tlsEntry.port, path: '/' })
  assert.equal(staticAfterTls.status, 200)
})

test('test_anvil_client_abort_releases_upstream', async (t) => {
  const fixture = await makeFixture()
  let upstreamClosedResolve
  const upstreamClosed = new Promise((resolve) => { upstreamClosedResolve = resolve })
  const mock = await startHttpServer((req, res) => {
    if (String(req.url).startsWith('/api/slow')) {
      req.on('close', () => upstreamClosedResolve())
      res.on('close', () => upstreamClosedResolve())
      return
    }
    res.writeHead(200, { 'content-type': 'text/plain' })
    res.end('ok')
  })
  const entry = await startEntry({
    fixture,
    env: {
      ENABLE_SSL: 'false',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_SCHEME: 'http',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.address().port),
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(() => {
    closeEntry(entry)
    closeServer(mock)
    fixture.cleanup()
  })

  const client = http.request({ host: '127.0.0.1', port: entry.port, path: '/api/slow', method: 'GET' })
  client.on('error', () => {})
  client.end()
  await delay(120)
  client.destroy()
  const closed = await Promise.race([
    upstreamClosed.then(() => true),
    delay(2000).then(() => false),
  ])
  assert.equal(closed, true, 'upstream request was not closed after client abort')
  const after = await request({ port: entry.port, path: '/', tls: false })
  assert.equal(after.status, 200)
})

test('test_anvil_startup_and_request_logs', async (t) => {
  const fixture = await makeFixture()
  const mock = await makeMockCtrl()
  const logs = []
  const started = await main({
    root: fixture.root,
    readEnvFile: false,
    log: (line) => logs.push(String(line)),
    env: {
      ENABLE_SSL: 'false',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
      CTRL_SCHEME: 'http',
      CTRL_IP: '127.0.0.1',
      CTRL_PORT: String(mock.port),
      PROXY_TIMEOUT_MS: '5000',
    },
  })
  t.after(() => {
    started.server.server.closeAllConnections?.()
    started.server.server.close()
    mock.close()
    fixture.cleanup()
  })
  const port = started.address.port
  const response = await request({
    port,
    path: '/api/echo%0d%0a',
    method: 'POST',
    tls: false,
    headers: {
      cookie: 'session=secret-cookie',
      authorization: 'Bearer secret-token',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ password: 'secret-password' }),
  })
  assert.equal(response.status, 200)
  assert.ok(logs.some((line) => line.includes('监听地址：')))
  assert.ok(logs.some((line) => line.includes('Ctrl 上游：')))
  assert.ok(logs.some((line) => line.includes('代理超时：')))
  assert.ok(logs.some((line) => line.includes('TLS：已关闭')))
  const requestLog = logs.find((line) => line.startsWith('POST /api/echo'))
  assert.ok(requestLog, `missing request log: ${logs.join('\n')}`)
  for (const line of logs) {
    assert.doesNotMatch(line, /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/)
    assert.doesNotMatch(line, /secret-cookie|secret-token|secret-password/)
  }
  assert.match(requestLog, /^POST \/api\/echo%0d%0a 200 \d+ms$/)
})

test('test_anvil_serves_updated_dist_per_request', async (t) => {
  const fixture = await makeFixture()
  const entry = await startEntry({
    fixture,
    env: {
      ENABLE_SSL: 'false',
      WEB_HOST: '127.0.0.1',
      WEB_PORT: '0',
    },
  })
  t.after(() => {
    closeEntry(entry)
    fixture.cleanup()
  })
  const first = await request({ port: entry.port, path: '/', tls: false })
  assert.equal(first.status, 200)
  assert.match(first.body, /FUXI_FIXTURE_INDEX/)
  fs.writeFileSync(path.join(fixture.distDir, 'index.html'), '<!doctype html><body>UPDATED_DIST_MARKER</body>')
  const second = await request({ port: entry.port, path: '/', tls: false })
  assert.equal(second.status, 200)
  assert.match(second.body, /UPDATED_DIST_MARKER/)
})

test('test_anvil_commit_msg_new_fix_combo_and_attribution', () => {
  withTempGitRepo((root) => {
    const run = (message) => runHook('commit-msg', [writeMessage(root, message)], { cwd: root })
    const combo = run('- NEW 新增测试映射\n- FIX 修复提交分类\n')
    assert.equal(combo.status, 0, combo.stderr || String(combo.error))
    for (const message of [
      '- FIX 修复提交分类\n\nGenerated with tool\n',
      '- FIX 修复提交分类\n\n🤖\n',
    ]) {
      const result = run(message)
      assert.equal(result.status, 1, message)
      assert.match(result.stderr, /署名尾注/)
    }
  })
})

function stageBlob(cwd, content, env = {}) {
  const blob = runGit(['hash-object', '-w', '--stdin'], { cwd, input: content, env })
  assert.equal(blob.status, 0, blob.stderr)
  return blob.stdout.trim()
}

function stagePath(cwd, blob, target, env = {}, add = true) {
  const args = ['update-index']
  if (add) args.push('--add')
  args.push('--cacheinfo', `100644,${blob},${target}`)
  const result = runGit(args, { cwd, env })
  assert.equal(result.status, 0, result.stderr || result.stdout)
}

test('test_anvil_pre_commit_capability_prefix', () => {
  const withRepo = (check) => withTempGitRepo((root) => {
    check(root)
  })

  withRepo((root) => {
    const page = stageBlob(root, 'page spec')
    stagePath(root, page, 'openspec/specs/frontend--page-calendar/spec.md')
    assert.equal(runHook('pre-commit', [], { cwd: root }).status, 0)
  })

  withRepo((root) => {
    const stacked = stageBlob(root, 'stacked spec')
    stagePath(root, stacked, 'openspec/specs/frontend--backend--example/spec.md')
    const rejected = runHook('pre-commit', [], { cwd: root })
    assert.equal(rejected.status, 1)
    assert.match(rejected.stderr, /不得叠加门类前缀/)
  })

  withRepo((root) => {
    const archive = stageBlob(root, 'archive spec')
    stagePath(root, archive, 'openspec/changes/archive/2020-01-01-old/specs/frontend--legacy/spec.md')
    assert.equal(runHook('pre-commit', [], { cwd: root }).status, 0)
  })

  withRepo((root) => {
    const unicode = stageBlob(root, 'unicode spec')
    stagePath(root, unicode, 'openspec/specs/frontend--page-日历 视图/spec.md')
    assert.equal(runHook('pre-commit', [], { cwd: root }).status, 0)
  })

  const realHead = gitOk(['rev-parse', 'HEAD:README.md'], { cwd: REPO_ROOT })
  const mainBlob = gitOk(['rev-parse', 'HEAD:openspec/specs/frontend--build/spec.md'], { cwd: REPO_ROOT })

  const modifiedDir = tempDir('fuxi-anvil-real-index-')
  try {
    const index = path.join(modifiedDir, 'index')
    const env = { GIT_INDEX_FILE: index }
    gitOk(['read-tree', 'HEAD'], { cwd: REPO_ROOT, env })
    stagePath(REPO_ROOT, realHead, 'openspec/specs/frontend--build/spec.md', env, false)
    assert.equal(runHook('pre-commit', [], { cwd: REPO_ROOT, env }).status, 0)
  } finally {
    removeDir(modifiedDir)
  }

  const renameDir = tempDir('fuxi-anvil-rename-index-')
  try {
    const index = path.join(renameDir, 'index')
    const env = { GIT_INDEX_FILE: index }
    gitOk(['read-tree', 'HEAD'], { cwd: REPO_ROOT, env })
    gitOk(['update-index', '--force-remove', 'openspec/specs/frontend--build/spec.md'], { cwd: REPO_ROOT, env })
    stagePath(REPO_ROOT, mainBlob, 'openspec/specs/frontend--renamed/spec.md', env)
    assert.equal(runHook('pre-commit', [], { cwd: REPO_ROOT, env }).status, 0)
  } finally {
    removeDir(renameDir)
  }

  const deltaDir = tempDir('fuxi-anvil-delta-index-')
  try {
    const index = path.join(deltaDir, 'index')
    const env = { GIT_INDEX_FILE: index }
    gitOk(['read-tree', 'HEAD'], { cwd: REPO_ROOT, env })
    stagePath(REPO_ROOT, realHead, 'openspec/changes/fixture-change/specs/frontend--build/spec.md', env)
    assert.equal(runHook('pre-commit', [], { cwd: REPO_ROOT, env }).status, 0)
  } finally {
    removeDir(deltaDir)
  }
})

test('test_anvil_openspec_layout', () => {
  assert.equal(fs.existsSync(path.join(REPO_ROOT, 'README.md')), true)
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const target = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(target)
      else assert.notEqual(entry.name.toLowerCase(), 'readme.md', `unexpected README under openspec: ${target}`)
    }
  }
  walk(path.join(REPO_ROOT, 'openspec'))
})

test('test_anvil_pr_body_checker_data_and_title', (t) => {
  const root = tempDir('fuxi-anvil-pr-check-')
  t.after(() => removeDir(root))
  const marker = path.join(root, 'injected-marker')
  const run = (body, title = '自然语言标题') => {
    const eventPath = path.join(root, 'event.json')
    fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { number: 1, title, body } }), 'utf8')
    return spawnSync(process.env.PYTHON || 'python', [CHECK_PR, '--event', eventPath], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      timeout: 20_000,
    })
  }
  const valid = run([
    '### 优化工作 | Enhancements & Patches',
    '- 完成映射计划',
    '### 下一步计划 | Coming Up',
    '- 后续项',
    '',
  ].join('\n'))
  assert.equal(valid.status, 0, valid.stderr)

  const emptyColumn = run([
    '### 新增内容 | WHAT\'S NEW',
    '- 无',
    '### 优化工作 | Enhancements & Patches',
    '- 真实交付项',
    '',
  ].join('\n'))
  assert.equal(emptyColumn.status, 0, emptyColumn.stderr)

  const injected = run([
    '### 漏洞修复 | Bug Fixes',
    `- 修复 $(touch ${marker}) 与 __import__("os").system("touch ${marker}") 的展示`,
    '',
  ].join('\n'))
  assert.equal(injected.status, 0, injected.stderr)
  assert.equal(fs.existsSync(marker), false, 'PR body was evaluated as shell/Python')
})

test('test_anvil_pr_workflow_policy', () => {
  const workflow = fs.readFileSync(path.join(REPO_ROOT, '.github', 'workflows', 'pr-format.yml'), 'utf8')
  assert.match(workflow, /types:\s*\[[^\]]*edited/)
  assert.match(workflow, /ref:\s*\$\{\{\s*github\.event\.pull_request\.base\.sha\s*\}\}/)
  assert.match(workflow, /reviewed\/scripts\/ci\/check_pr\.py/)
  assert.match(workflow, /proposed\/scripts\/ci\/check_pr\.py/)
  assert.match(workflow, /sha256sum --check --status/)
  const hash = createHash('sha256').update(fs.readFileSync(CHECK_PR)).digest('hex')
  assert.match(workflow, new RegExp(hash))
})
