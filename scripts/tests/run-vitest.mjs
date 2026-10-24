#!/usr/bin/env node
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { testEnvironment } from './node-options.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const result = spawnSync(process.execPath, [
  path.join(root, 'node_modules', 'vitest', 'vitest.mjs'),
  ...process.argv.slice(2),
], { cwd: root, stdio: 'inherit', env: testEnvironment() })
process.exit(result.status ?? 1)
