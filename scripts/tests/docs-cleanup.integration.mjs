import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const REMOVED_DOCS_FILES = [
  'src/pages/Docs.css',
  'src/components/docs/Guides.jsx',
  'src/assets/docs-apply.svg',
  'src/assets/docs-apply-mobile.svg',
  'src/assets/docs-home.svg',
  'src/assets/docs-home-mobile.svg',
]

const SCAN_ROOTS = ['src', 'public'].map((relative) => path.join(ROOT, relative))
const SCAN_FILES = ['index.html', 'vite.config.js', 'package.json'].map((relative) => path.join(ROOT, relative))

const collectFiles = (target) => {
  if (!fs.existsSync(target)) return []
  const stat = fs.statSync(target)
  if (stat.isFile()) return [target]
  return fs.readdirSync(target, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') return []
    return collectFiles(path.join(target, entry.name))
  })
}

const scanFiles = () => [
  ...SCAN_ROOTS.flatMap(collectFiles),
  ...SCAN_FILES.filter((file) => fs.existsSync(file)),
]

const findReferences = (token) => {
  const hits = []
  for (const file of scanFiles()) {
    const source = fs.readFileSync(file, 'utf8')
    if (source.includes(token)) hits.push(path.relative(ROOT, file))
  }
  return hits
}

const assertRemovable = (token) => {
  const hits = findReferences(token)
  assert.deepEqual(hits, [], `${token} 仍被引用：${hits.join(', ')}`)
}

test('test_q36_docs_zero_ref_removed', () => {
  for (const relative of REMOVED_DOCS_FILES) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, `${relative} 应已删除`)
    assertRemovable(path.basename(relative))
  }
})

test('test_q36_docs_keeps_referenced_status_display', () => {
  const statusDisplay = path.join(ROOT, 'src/utils/statusDisplay.js')
  assert.equal(fs.existsSync(statusDisplay), true, 'statusDisplay 仍被引用，不得删除')

  const docs = fs.readFileSync(path.join(ROOT, 'src/pages/Docs.jsx'), 'utf8')
  assert.match(docs, /utils\/statusDisplay/, 'Docs 仍应导入共享状态展示')
  assert.match(docs, /CONTAINER_STATUS_DISPLAY/)
  assert.match(docs, /MACHINE_STATUS_DISPLAY/)
})

test('test_q36_docs_referenced_file_guard', () => {
  assert.throws(
    () => assertRemovable('DocsJourney.css'),
    /仍被引用/,
    '仍有引用的资源必须被守护检查拦下',
  )

  const journey = path.join(ROOT, 'src/pages/DocsJourney.css')
  assert.equal(fs.existsSync(journey), true, '被 Docs.jsx 引用的 DocsJourney.css 不得删除')
  assert.match(fs.readFileSync(path.join(ROOT, 'src/pages/Docs.jsx'), 'utf8'), /DocsJourney\.css/)
})
