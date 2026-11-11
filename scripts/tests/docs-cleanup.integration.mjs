import test from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const GUIDE_REL = 'src/content/USER_GUIDE_v1.md'
const GUIDE_SHA256 = 'B0F3730F6A288B0DC54B332A35C033603CBD2370D56C3A5225BDB98855BD4839'
const GUIDE_BYTES = 6055

const REMOVED_DOCS_FILES = [
  'src/pages/Docs.css',
  'src/pages/DocsJourney.css',
  'src/components/docs/Guides.jsx',
  'src/assets/docs-apply.svg',
  'src/assets/docs-apply-mobile.svg',
  'src/assets/docs-home.svg',
  'src/assets/docs-home-mobile.svg',
]

const NEW_DOCS_FILES = [
  'src/components/docs/MarkdownGuide.jsx',
  'src/components/docs/MarkdownGuide.css',
  'src/utils/markdownToc.js',
]

const SCAN_ROOTS = ['src', 'public'].map((relative) => path.join(ROOT, relative))
const SCAN_FILES = ['index.html', 'vite.config.js', 'package.json'].map((relative) => path.join(ROOT, relative))

const toPosix = (value) => value.split(path.sep).join('/')
const readText = (relative) => fs.readFileSync(path.join(ROOT, relative), 'utf8')

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
    if (source.includes(token)) hits.push(toPosix(path.relative(ROOT, file)))
  }
  return hits
}

const assertRemovable = (token) => {
  const hits = findReferences(token)
  assert.deepEqual(hits, [], `${token} 仍被引用：${hits.join(', ')}`)
}

test('test_q36_docs_guide_bytes_are_source_faithful', () => {
  const guidePath = path.join(ROOT, GUIDE_REL)
  assert.equal(fs.existsSync(guidePath), true, `${GUIDE_REL} 必须存在`)

  const bytes = fs.readFileSync(guidePath)
  const hash = createHash('sha256').update(bytes).digest('hex').toUpperCase()
  let crlf = 0
  let lf = 0
  for (let i = 0; i < bytes.length; i += 1) {
    if (bytes[i] === 0x0a) {
      lf += 1
      if (i > 0 && bytes[i - 1] === 0x0d) crlf += 1
    }
  }

  assert.equal(bytes.length, GUIDE_BYTES, '指南须与已确认版本的字节长度一致')
  assert.equal(hash, GUIDE_SHA256, '指南须与已确认版本的 SHA256 一致')
  assert.equal(crlf, lf, '指南不得出现孤立 LF，须保持 CRLF')
  assert.ok(crlf > 0, '指南必须保留 CRLF 换行')
})

test('test_q36_docs_gitattributes_preserve_guide_bytes', () => {
  const attributes = readText('.gitattributes')
  const escaped = GUIDE_REL.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  assert.match(
    attributes,
    new RegExp(`^${escaped}\\s+-text\\s*$`, 'm'),
    '.gitattributes 必须仅对该内容文件设置 -text',
  )

  const result = spawnSync('git', ['check-attr', 'text', '--', GUIDE_REL], {
    cwd: ROOT,
    encoding: 'utf8',
  })
  assert.equal(result.status, 0, `git check-attr 执行失败：${result.stderr}`)
  assert.match(result.stdout, /text:\s+unset/, '该内容文件在 Git 中必须显示 text: unset')
})

test('test_q36_docs_no_global_repository_dependency', () => {
  for (const token of ['FuxiYu_Global', '../Global', 'E:/AI/Fuxi/FuxiYu_Global']) {
    assert.deepEqual(findReferences(token), [], `Web 源码/构建配置不得引用 Global：${token}`)
  }

  const docs = readText('src/pages/Docs.jsx')
  assert.match(docs, /from\s+['"]\.\.\/content\/USER_GUIDE_v1\.md\?raw['"]/, 'Docs 必须通过 ?raw 导入已提交副本')
  assert.match(docs, /components\/docs\/MarkdownGuide/, 'Docs 必须装配 Markdown 帮助组件')
})

test('test_q36_docs_zero_ref_removed', () => {
  for (const relative of REMOVED_DOCS_FILES) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), false, `${relative} 应已删除`)
    assertRemovable(path.basename(relative))
  }
})

test('test_q36_docs_old_hardcoded_body_removed', () => {
  const docs = readText('src/pages/Docs.jsx')
  const componentFiles = collectFiles(path.join(ROOT, 'src/components/docs'))
    .filter((file) => /\.(jsx?|css)$/.test(file))
  const corpus = [docs, ...componentFiles.map((file) => fs.readFileSync(file, 'utf8'))].join('\n')

  for (const token of ['TOC_ITEMS', 'JOURNEYS', 'FAQ_ROWS', '概念卡 · 状态标签', 'jd-journey', 'DocsJourney.css']) {
    assert.equal(corpus.includes(token), false, `旧硬编码正文/样式残留：${token}`)
  }

  assert.match(docs, /export default function Docs/, 'Docs.jsx 仍应导出页面组件')
  assert.equal(fs.existsSync(path.join(ROOT, NEW_DOCS_FILES[0])), true, '新的 Markdown 组件必须存在')
})

test('test_q36_docs_keeps_shared_status_display', () => {
  const statusDisplay = path.join(ROOT, 'src/utils/statusDisplay.js')
  assert.equal(fs.existsSync(statusDisplay), true, 'statusDisplay 是共享工具，不得删除')

  const hits = findReferences('utils/statusDisplay')
  assert.ok(hits.includes('src/pages/ContainerDetailPage.jsx'), '容器详情页仍须引用 statusDisplay')
  assert.ok(hits.includes('src/pages/MachineDetailPage.jsx'), '机器详情页仍须引用 statusDisplay')
})

test('test_q36_docs_referenced_file_guard', () => {
  for (const relative of NEW_DOCS_FILES) {
    assert.equal(fs.existsSync(path.join(ROOT, relative)), true, `${relative} 必须存在`)
  }

  assert.throws(
    () => assertRemovable('MarkdownGuide.css'),
    /仍被引用/,
    '仍被 Docs 引用的 MarkdownGuide.css 不得被删除',
  )
})

test('test_q36_docs_responsive_local_scroll_contract', () => {
  const css = readText('src/components/docs/MarkdownGuide.css')

  assert.match(css, /\.docs-page\s*\{[^}]*display:\s*grid/s, '桌面阅读区应使用两栏网格')
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+224px/s, '桌面正文在左、目录在右')
  assert.match(css, /\.docs-page[^{]*\{[^}]*box-sizing:\s*border-box/s, 'Docs 局部应统一 border-box')
  assert.doesNotMatch(css, /overflow-x:\s*hidden/, '不得用横向裁切掩盖溢出')
  assert.match(css, /\.docs-toc-desktop\s*\{[^}]*position:\s*sticky/s, '桌面目录应粘性定位')
  assert.match(css, /\.docs-toc-mobile\s*\{[^}]*display:\s*none/s, '桌面不得显示移动折叠目录')
  assert.match(css, /\.docs-table-scroll\s*\{[^}]*overflow-x:\s*auto/s, '宽表格只允许局部横向滚动')
  assert.match(css, /\.docs-code-pre\s*\{[^}]*overflow-x:\s*auto/s, '长代码只允许代码区横向滚动')
  assert.match(css, /@media\s*\(max-width:\s*1024px\)/, '窄屏应在 1024px 切换单栏折叠目录')
  assert.match(css, /scroll-margin-top:\s*72px/, '移动端标题需为 56px 顶栏预留定位偏移')
})
