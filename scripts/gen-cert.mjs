/**
 * 本地/内网 HTTPS 证书兜底：缺则建，绝不覆盖已有证书。
 * 生成的是自签证书，客户端首次访问需要人工信任。
 * 行为契约见 openspec/specs/frontend--production-server/spec.md。
 */
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { X509Certificate } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { PROJECT_ROOT, loadWebEnv } from './start-config.mjs'

export class CertError extends Error {
  constructor(message) {
    super(message)
    this.name = 'CertError'
  }
}

function defaultLog(message) {
  process.stdout.write(`[gen-cert] ${message}\n`)
}

function readWebIp(env) {
  const raw = env.WEB_IP
  return raw === undefined || raw === null ? '' : String(raw).trim()
}

function canonicalIpv6(value) {
  try {
    return new URL(`http://[${value}]/`).hostname.slice(1, -1)
  } catch {
    return value
  }
}

function sanCovers(san, value) {
  const entries = String(san || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (net.isIP(value) === 6) {
    return entries.some(
      (entry) => entry.startsWith('IP Address:') && canonicalIpv6(entry.slice('IP Address:'.length)) === canonicalIpv6(value),
    )
  }
  if (net.isIP(value) !== 0) return entries.includes(`IP Address:${value}`)
  return entries.includes(`DNS:${value}`)
}

function buildAltNames(webIp) {
  const altNames = [
    { type: 2, value: 'localhost' },
    { type: 7, ip: '127.0.0.1' },
    { type: 7, ip: '::1' },
  ]
  if (webIp) altNames.push(net.isIP(webIp) ? { type: 7, ip: webIp } : { type: 2, value: webIp })
  return altNames
}

async function loadSelfsigned() {
  try {
    const module = await import('selfsigned')
    return module.default || module
  } catch {
    throw new CertError(
      '缺少生成自签证书所需的 selfsigned（devDependency）：请先 npm ci 全量安装依赖，或自备证书放到 certs/web.pem 与 certs/web-key.pem',
    )
  }
}

export async function ensureCert({ root = PROJECT_ROOT, env = process.env, log = defaultLog, readEnvFile = true } = {}) {
  if (readEnvFile && env === process.env) loadWebEnv(root)
  const certDir = path.join(root, 'certs')
  const certPath = path.join(certDir, 'web.pem')
  const keyPath = path.join(certDir, 'web-key.pem')
  const webIp = readWebIp(env)

  const hasCert = fs.existsSync(certPath)
  const hasKey = fs.existsSync(keyPath)

  if (hasCert && hasKey) {
    log('证书已存在，跳过（保留现有证书）')
    if (webIp) {
      let san = ''
      try {
        san = new X509Certificate(fs.readFileSync(certPath)).subjectAltName || ''
      } catch {
        log('无法解析现有证书的 SAN，跳过 WEB_IP 检查')
        return { created: false, certPath, keyPath, webIpCovered: null }
      }
      if (!sanCovers(san, webIp)) {
        log(
          `提示：现有证书 SAN 不含 WEB_IP=${webIp}（当前 SAN：${san}）。已保留原证书；` +
            '如需该地址可被客户端信任，请先备份 certs/web.pem 与 certs/web-key.pem，删除后重新执行 npm run gen-cert，或自备包含该地址的证书',
        )
        return { created: false, certPath, keyPath, webIpCovered: false }
      }
      return { created: false, certPath, keyPath, webIpCovered: true }
    }
    return { created: false, certPath, keyPath, webIpCovered: null }
  }

  if (hasCert || hasKey) {
    const present = hasCert ? certPath : keyPath
    throw new CertError(
      `证书文件不成对：只找到 ${present}。为避免覆盖现有文件，请先备份并删除 ${certDir} 下的 web.pem 与 web-key.pem，` +
        '再重新执行 npm run gen-cert；或自备一对证书放到这两个路径',
    )
  }

  const selfsigned = await loadSelfsigned()
  const notAfter = new Date()
  notAfter.setFullYear(notAfter.getFullYear() + 10)
  const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'Fuxi Dev' },
  ]
  const pems = await selfsigned.generate(attrs, {
    keySize: 2048,
    notBeforeDate: new Date(),
    notAfterDate: notAfter,
    algorithm: 'sha256',
    extensions: [
      { name: 'basicConstraints', cA: false },
      { name: 'subjectAltName', altNames: buildAltNames(webIp) },
    ],
  })

  fs.mkdirSync(certDir, { recursive: true })
  fs.writeFileSync(certPath, pems.cert)
  fs.writeFileSync(keyPath, pems.private)
  log('已生成自签名证书 certs/web.pem + certs/web-key.pem')
  log(webIp ? `证书 SAN 已包含 WEB_IP=${webIp}` : '未设置 WEB_IP：SAN 只含 localhost / 127.0.0.1 / ::1，用其它 IP 直连请先设置 WEB_IP 再重新生成')
  log('这是自签证书：客户端首次访问需人工信任，且必须用 https:// 访问 HTTPS 端口（协议写错不是证书信任问题）')
  return { created: true, certPath, keyPath, webIpCovered: webIp ? true : null }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : ''
if (invokedPath === fileURLToPath(import.meta.url)) {
  ensureCert().catch((error) => {
    const message = error instanceof CertError ? error.message : `证书处理失败：${error && error.code ? error.code : 'unknown'}`
    process.stderr.write(`[gen-cert] ${message}\n`)
    process.exit(1)
  })
}