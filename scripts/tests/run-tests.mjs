#!/usr/bin/env node
/**
 * npm test 入口：先跑 Vitest 前端测试，再跑生产入口集成测试（两者都跑，便于一次看全失败）。
 * Node 26 的实验 Web Storage 会与 jsdom 冲突，这里按 Node 支持情况自动补 NODE_OPTIONS。
 */
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const WEBSTORAGE_FLAG = '--no-experimental-webstorage'

function nodeOptionsForVitest() {
  const env = { ...process.env }
  const supported = typeof process.allowedNodeEnvironmentFlags?.has === 'function' && process.allowedNodeEnvironmentFlags.has(WEBSTORAGE_FLAG)
  const current = env.NODE_OPTIONS || ''
  if (supported && !current.includes(WEBSTORAGE_FLAG)) {
    env.NODE_OPTIONS = `${current} ${WEBSTORAGE_FLAG}`.trim()
    process.stdout.write(`[test] 已为 Vitest 追加 NODE_OPTIONS=${WEBSTORAGE_FLAG}\n`)
  }
  return env
}

function runNpmScript(script, env) {
  const npmCli = process.env.npm_execpath
  const command = npmCli ? process.execPath : process.platform === 'win32' ? 'npm.cmd' : 'npm'
  const args = npmCli ? [npmCli, 'run', script] : ['run', script]
  const result = spawnSync(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    env,
    shell: !npmCli && process.platform === 'win32',
  })
  return result.status === null ? 1 : result.status
}

const webCode = runNpmScript('test:web', nodeOptionsForVitest())
const serverCode = runNpmScript('test:server', process.env)

process.exit(webCode !== 0 ? webCode : serverCode)