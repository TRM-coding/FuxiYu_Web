#!/usr/bin/env node
/**
 * npm test 入口：先跑 Vitest 前端测试，再跑生产入口集成测试（两者都跑，便于一次看全失败）。
 * Node 26 的实验 Web Storage 会与 jsdom 冲突，这里按 Node 支持情况自动补 NODE_OPTIONS。
 */
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { testEnvironment } from './node-options.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

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

const webCode = runNpmScript('test:web', testEnvironment())
const serverCode = runNpmScript('test:server', testEnvironment())

process.exit(webCode !== 0 ? webCode : serverCode)
