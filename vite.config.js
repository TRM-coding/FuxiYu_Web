import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'

// Determine SSL flag: priority VITE_ENABLE_SSL -> ENABLE_SSL -> default true
const envViteEnable = process.env.VITE_ENABLE_SSL
const envEnable = process.env.ENABLE_SSL
const enableSsl = (envViteEnable !== undefined) ? (envViteEnable === 'true') : (envEnable !== undefined ? (envEnable === 'true') : true)
const projectRoot = path.resolve(__dirname)
// prefer certs placed under the front-end project (FuxiYu_Web/certs)
const frontendCertPath = path.resolve(projectRoot, 'certs', 'localhost.pem')
const frontendKeyPath = path.resolve(projectRoot, 'certs', 'localhost-key.pem')
// fallback to the certs generated under backend project
const backendCertPath = path.resolve(projectRoot, '..', 'FuxiYu_CtrKernel', 'certs', 'localhost.pem')
const backendKeyPath = path.resolve(projectRoot, '..', 'FuxiYu_CtrKernel', 'certs', 'localhost-key.pem')

const certPath = fs.existsSync(frontendCertPath) ? frontendCertPath : backendCertPath
const keyPath = fs.existsSync(frontendKeyPath) ? frontendKeyPath : backendKeyPath

export default defineConfig(({ mode }) => {
  // 三仓库统一网络键名（.env）：只填裸 IP 与端口。loadEnv 用空前缀，
  // 避免 VITE_ 命名习惯破坏三仓库键名一致性。
  const env = loadEnv(mode, process.cwd(), '')
  const ctrlIp = env.CTRL_IP || '127.0.0.1'
  const ctrlPort = env.CTRL_PORT || '5000'

  return {
    plugins: [react()],
    server: {
      host: '0.0.0.0', // 允许外网访问
      port: 5173,      // 可自定义端口
      proxy: {
        // Forward all backend blueprint routes to the Ctrl (Flask) server.
        // 默认 127.0.0.1:5000 —— WSL2 localhostForwarding 下 Windows 直连 WSL 里的 Ctrl。
        '/api': {
          target: `https://${ctrlIp}:${ctrlPort}`,
          changeOrigin: true,
          secure: false,
        },
      },
      https: (function () {
        if (!enableSsl) return false
        try {
          if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
            return {
              cert: fs.readFileSync(certPath),
              key: fs.readFileSync(keyPath),
            }
          }
        } catch (e) {
          // fall through to use default self-signed
        }
        // No cert files available: allow Vite to use a generated self-signed cert.
        return true
      })(),
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      globals: true,
    },
  }
})
