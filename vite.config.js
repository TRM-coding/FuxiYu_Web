import { defineConfig } from 'vite'
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

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // 允许外网访问
    port: 5173,      // 可自定义端口
    proxy: {
      // Forward all backend blueprint routes to local Flask server.
      '/api': {
        target: 'https://192.168.5.230:5000',
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
})
