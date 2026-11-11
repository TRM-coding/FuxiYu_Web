/**
 * 生产入口集成测试夹具：临时 root/dist/certs + mock Ctrl + 真实 loopback 请求工具。
 * 只用于 scripts/tests 下的集成测试，不进入运行路径。
 */
import fs from 'node:fs'
import http from 'node:http'
import https from 'node:https'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildServer, listen } from '../../start.mjs'
import { resolveConfig } from '../../start-config.mjs'

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
const FIXTURE_INDEX = 'FUXI_FIXTURE_INDEX'
const FIXTURE_DOTFILE_SECRET = 'FUXI_FIXTURE_SECRET=leak'

export { FIXTURE_INDEX, FIXTURE_DOTFILE_SECRET, REPO_ROOT }

async function generateCertFiles(certDir) {
  const { default: selfsigned } = await import('selfsigned')
  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + 1)
  const pems = await selfsigned.generate([{ name: 'commonName', value: 'localhost' }], {
    keySize: 2048,
    notBeforeDate: new Date(),
    notAfterDate: notAfter,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      {
        name: 'subjectAltName',
        altNames: [
          { type: 2, value: 'localhost' },
          { type: 7, ip: '127.0.0.1' },
          { type: 7, ip: '::1' },
        ],
      },
    ],
  })
  fs.mkdirSync(certDir, { recursive: true })
  fs.writeFileSync(path.join(certDir, 'web.pem'), pems.cert)
  fs.writeFileSync(path.join(certDir, 'web-key.pem'), pems.private)
}

export async function makeFixture({ withIndex = true, withCerts = true, withEnvFile = false } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fuxi-entry-'))
  const distDir = path.join(root, 'dist')
  fs.mkdirSync(path.join(distDir, 'assets'), { recursive: true })
  if (withIndex) {
    fs.writeFileSync(path.join(distDir, 'index.html'), `<!doctype html><title>fuxi fixture</title>${FIXTURE_INDEX}`)
  }
  fs.writeFileSync(path.join(distDir, 'assets', 'app-abc123.js'), 'console.log("hashed")')
  fs.writeFileSync(path.join(distDir, 'notes.txt'), 'plain text')
  fs.writeFileSync(path.join(distDir, '.env'), FIXTURE_DOTFILE_SECRET)
  if (withCerts) await generateCertFiles(path.join(root, 'certs'))
  if (withEnvFile) fs.writeFileSync(path.join(root, '.env'), 'FUXI_FIXTURE_FROM_FILE=file\nCTRL_PORT=1\n')
  return {
    root,
    distDir,
    certFile: path.join(root, 'certs', 'web.pem'),
    keyFile: path.join(root, 'certs', 'web-key.pem'),
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  }
}

export async function makeMockCtrl({ certFile, keyFile, slowMs = 1500 } = {}) {
  const seen = []
  let releaseStream = () => {}
  const streamGate = new Promise((resolve) => {
    releaseStream = resolve
  })
  const tls = Boolean(certFile && keyFile)
  const handler = (req, res) => {
    const chunks = []
    req.on('data', (chunk) => chunks.push(chunk))
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8')
      seen.push({ method: req.method, url: req.url, headers: req.headers, body })
      const url = req.url || ''
      if (url.startsWith('/api/users/me/permissions')) {
        res.writeHead(401, {
          'content-type': 'application/json',
          'set-cookie': ['session=abc; Path=/; HttpOnly', 'theme=dark; Path=/'],
          'x-ctrl-trace': 'yes',
        })
        res.end(JSON.stringify({ error: 'unauthorized' }))
        return
      }
      if (url.startsWith('/api/echo')) {
        res.writeHead(200, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ method: req.method, url, body, cookie: req.headers.cookie || null }))
        return
      }
      if (url.startsWith('/api/empty')) {
        res.writeHead(204, { 'set-cookie': 'after=1; Path=/' })
        res.end()
        return
      }
      if (url.startsWith('/api/missing')) {
        res.writeHead(404, { 'content-type': 'application/json' })
        res.end(JSON.stringify({ error: 'not_found' }))
        return
      }
      if (url.startsWith('/api/slow')) {
        setTimeout(() => {
          if (res.writableEnded || res.destroyed) return
          res.writeHead(200, { 'content-type': 'application/json' })
          res.end('{"slow":true}')
        }, slowMs)
        return
      }
      if (url.startsWith('/api/stream')) {
        res.writeHead(200, { 'content-type': 'text/plain' })
        res.write('first-chunk\n')
        streamGate.then(() => {
          if (res.writableEnded || res.destroyed) return
          res.end('second-chunk\n')
        })
        return
      }
      if (url.startsWith('/api/boom')) {
        req.socket.destroy()
        return
      }
      res.writeHead(200, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ hit: url }))
    })
  }
  const server = tls
    ? https.createServer({ cert: fs.readFileSync(certFile), key: fs.readFileSync(keyFile) }, handler)
    : http.createServer(handler)
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    tls,
    port: server.address().port,
    seen,
    releaseStream: () => releaseStream(),
    close: () => {
      server.closeAllConnections?.()
      server.close()
    },
  }
}

export async function startEntry({ fixture, env = {}, log = () => {} }) {
  const config = resolveConfig({ ...env }, fixture.root)
  const { server, proxy } = buildServer(config, { log })
  const address = await listen(server, config, { log })
  return {
    config,
    server,
    proxy,
    port: address.port,
    close: () => {
      server.server.closeAllConnections?.()
      server.server.close()
    },
  }
}

export function request({ port, path: requestPath, method = 'GET', headers = {}, body, tls = true, keepAlive = false }) {
  return new Promise((resolve, reject) => {
    const transport = tls ? https : http
    const req = transport.request(
      {
        host: '127.0.0.1',
        port,
        path: requestPath,
        method,
        headers,
        agent: false,
        rejectUnauthorized: false,
        keepAlive,
      },
      (res) => {
        const chunks = []
        res.on('data', (chunk) => chunks.push(chunk))
        res.on('error', reject)
        res.on('end', () =>
          resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks).toString('utf8') }),
        )
      },
    )
    req.on('error', reject)
    if (body === undefined) req.end()
    else req.end(body)
  })
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function activeTimeoutCount() {
  try {
    return process.getActiveResourcesInfo().filter((resource) => resource === 'Timeout').length
  } catch {
    return -1
  }
}