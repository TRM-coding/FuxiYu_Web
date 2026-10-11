/**
 * 子进程入口测试用的启动壳：调用与 npm start 完全相同的 main()，
 * 只把 root/env 显式传入，便于在临时目录、临时端口上验证启动失败与退出码。
 */
import { main, reportStartupFailure } from '../../start.mjs'

const payload = JSON.parse(process.env.FUXI_START_TEST_JSON || '{}')

main({ root: payload.root, env: payload.env || {}, readEnvFile: false }).catch((error) => {
  reportStartupFailure(error)
  process.exit(1)
})