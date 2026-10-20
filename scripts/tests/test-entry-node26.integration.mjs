import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { testEnvironment, WEBSTORAGE_FLAG } from './node-options.mjs'

test('test_q29_node26_entry_injects_flag', () => {
  const source = Object.freeze({ NODE_OPTIONS: '--trace-warnings', CUSTOM: 'kept' })
  const result = testEnvironment(source, new Set([WEBSTORAGE_FLAG]))
  assert.equal(result.NODE_OPTIONS, `--trace-warnings ${WEBSTORAGE_FLAG}`)
  assert.equal(result.CUSTOM, 'kept')
  assert.equal(source.NODE_OPTIONS, '--trace-warnings')
  assert.equal(testEnvironment(result, new Set([WEBSTORAGE_FLAG])).NODE_OPTIONS, result.NODE_OPTIONS)
})

test('test_q29_unsupported_node_no_injection', () => {
  assert.deepEqual(testEnvironment({ NODE_OPTIONS: '--trace-warnings' }, new Set()), {
    NODE_OPTIONS: '--trace-warnings',
  })
  assert.deepEqual(testEnvironment({}, {}), {})
})

test('test_q29_test_web_wrapper_injects_flag', () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
  // 实际启动直接入口并运行依赖 jsdom storage 的既有用例；不用调用方预设兼容 flag。
  const result = spawnSync(process.execPath, [
    'scripts/tests/run-vitest.mjs', 'run', 'src/test/authHelpers.test.js', '--maxWorkers=1',
  ], { cwd: root, env: { ...process.env, NODE_OPTIONS: '' }, encoding: 'utf8', timeout: 60000 })
  assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`)
  assert.match(result.stdout, /5 passed/)
})
