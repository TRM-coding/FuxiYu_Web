/**
 * 本地开发 HTTPS 证书兜底生成。
 *
 * 铁律：只"缺则建"，绝不覆盖 ——
 *   想换受信任证书（mkcert / 正式签发）时，直接替换 certs/ 下同名文件即可，
 *   本脚本会永远让位，互不干扰。
 *
 * mkcert 口岸：
 *   mkcert -cert-file certs/localhost.pem -key-file certs/localhost-key.pem localhost 127.0.0.1
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const certDir = path.join(root, 'certs')
const certPath = path.join(certDir, 'localhost.pem')
const keyPath = path.join(certDir, 'localhost-key.pem')

// 已存在（用户自备或 mkcert 产物）→ 什么都不做，直接让位
if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log('[gen-cert] 证书已存在，跳过（保留现有证书）')
  process.exit(0)
}

// 仅在证书缺失时才解析 selfsigned：
// WSL 下 /mnt/e 的 node_modules 解析走 9P 桥极慢（实测 ~15s），
// 静态导入会让"证书已存在"的日常路径也白付这笔成本。
const { default: selfsigned } = await import('selfsigned')

const attrs = [
  { name: 'commonName', value: 'localhost' },
  { name: 'organizationName', value: 'Fuxi Dev' },
]
const notAfter = new Date()
notAfter.setFullYear(notAfter.getFullYear() + 10)

const opts = {
  keySize: 2048,
  notBeforeDate: new Date(),
  notAfterDate: notAfter,
  algorithm: 'sha256',
  extensions: [
    { name: 'basicConstraints', cA: false },
    {
      name: 'subjectAltName',
      altNames: [
        { type: 2, value: 'localhost' }, // DNS
        { type: 7, ip: '127.0.0.1' },   // IPv4
        { type: 7, ip: '::1' },         // IPv6
      ],
    },
  ],
}

fs.mkdirSync(certDir, { recursive: true })
const pems = await selfsigned.generate(attrs, opts)
fs.writeFileSync(certPath, pems.cert)
fs.writeFileSync(keyPath, pems.private)
console.log('[gen-cert] 已生成自签名证书 certs/localhost.pem + certs/localhost-key.pem')
console.log('[gen-cert] 首次访问浏览器会提示不受信任 —— 本地开发常态。换正式证书直接覆盖这两个文件即可。')
