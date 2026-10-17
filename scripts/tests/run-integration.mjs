#!/usr/bin/env node
/**
 * 用 Node 内置 test runner 跑 scripts/tests 下的 *.integration.mjs。
 * 显式传入文件列表，避免依赖 shell 展开 glob（Windows cmd 不展开）。
 */
import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const dir = path.dirname(fileURLToPath(import.meta.url))
const files = fs
  .readdirSync(dir)
  .filter((name) => name.endsWith('.integration.mjs'))
  .sort()
  .map((name) => path.join(dir, name))

if (files.length === 0) {
  process.stderr.write('[test:server] 未找到 *.integration.mjs 集成测试\n')
  process.exit(1)
}

process.stdout.write(`[test:server] node --test ${files.map((file) => path.relative(dir, file)).join(' ')}\n`)
const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' })
process.exit(result.status === null ? 1 : result.status)