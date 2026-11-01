import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const hook = fileURLToPath(new URL('../../githooks/commit-msg', import.meta.url))
const gitPaths = process.platform === 'win32'
  ? spawnSync('where.exe', ['git'], { encoding: 'utf8' }).stdout?.trim().split(/\r?\n/).filter(Boolean) || []
  : []
const bash = process.platform === 'win32'
  ? [...gitPaths.map((git) => path.resolve(path.dirname(git), '..', 'bin', 'bash.exe')),
      ...[process.env.ProgramFiles, process.env['ProgramFiles(x86)']]
      .filter(Boolean)
      .map((root) => path.join(root, 'Git', 'bin', 'bash.exe'))]
      .find((candidate) => fs.existsSync(candidate)) || 'bash'
  : 'bash'

function withRepository(check) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'fuxi-commit-message-'))
  try {
    const init = spawnSync('git', ['init', '-q', root], { encoding: 'utf8' })
    assert.equal(init.status, 0, init.stderr || String(init.error))
    const run = (message) => {
      const messagePath = path.join(root, 'message.txt')
      fs.writeFileSync(messagePath, message, 'utf8')
      return spawnSync(bash, [hook.replaceAll('\\', '/'), messagePath.replaceAll('\\', '/')], {
        cwd: root, encoding: 'utf8', timeout: 10_000,
      })
    }
    check(run, root)
  } finally {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 })
  }
}

for (const keyword of ['NEW', 'AMEND', 'FIX', 'SPEC', 'TEST']) {
  test(`accepts ${keyword}`, () => withRepository((run) => {
    for (const ending of ['\n', '\r\n', '']) {
      const result = run(`- ${keyword} 提交分类说明${ending}`)
      assert.equal(result.status, 0, result.stderr || String(result.error))
    }
  }))
}

test('rejects unknown keywords and malformed entries', () => withRepository((run) => {
  for (const message of ['- DOCS 自造分类', '- DEBUG 自造分类', '- spec 小写分类', '-SPEC 缺少空格', '- TEST', '\n# 只有注释\n']) {
    const result = run(message)
    assert.equal(result.status, 1, message)
    assert.match(result.stderr, /不符合条目格式|至少需要一条实际变更/)
    assert.match(result.stderr, /SPEC/)
    assert.match(result.stderr, /TEST/)
  }
}))

test('mixed entries keep comments and attribution rules', () => withRepository((run) => {
  assert.equal(run('- SPEC 修改规格\n\n# 注释\n- TEST 补充测试\n').status, 0)
  for (const keyword of ['SPEC', 'TEST']) {
    const result = run(`- ${keyword} 提交分类说明\nCo-authored-by: tool <tool@example.com>\n`)
    assert.equal(result.status, 1)
    assert.match(result.stderr, /署名尾注/)
  }
}))

test('real merge state remains exempt', () => withRepository((run, root) => {
  assert.equal(run('Merge branch example').status, 1)
  fs.writeFileSync(path.join(root, '.git', 'MERGE_HEAD'), 'temporary merge marker\n')
  assert.equal(run('Merge branch example').status, 0)
}))
