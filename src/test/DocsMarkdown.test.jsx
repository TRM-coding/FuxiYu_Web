import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MarkdownGuide from '../components/docs/MarkdownGuide';
import { buildMarkdownToc, slugifyHeading } from '../utils/markdownToc';

const TOC_MARKDOWN = [
  '# 快速开始',
  '',
  '## 中文标题：使用 `npm` 与 GFM',
  '',
  '## 中文标题：使用 `npm` 与 GFM',
  '',
  '### 重复',
  '',
  '#### 更深',
  '',
  '```bash',
  '# 代码块假标题',
  'echo hi',
  '```',
  '',
  '## 收尾',
].join('\n');

const CODE_MARKDOWN = [
  '```bash',
  'ssh root@192.0.2.0 -p 24',
  '```',
].join('\n');

const installMatchMedia = ({ reduceMotion = false } = {}) => {
  window.matchMedia = vi.fn().mockImplementation((query) => ({
    matches: query.includes('prefers-reduced-motion') ? reduceMotion : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
};

const installClipboard = (writeText) => {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  });
};

const installExecCommand = (execCommand) => {
  Object.defineProperty(document, 'execCommand', {
    configurable: true,
    value: execCommand,
  });
};

const getDesktopToc = () => screen.getByRole('navigation', { name: '页内目录' });

beforeEach(() => {
  installMatchMedia();
  installExecCommand(undefined);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('Markdown 目录 AST', () => {
  it('按 H1-H3 建立层级、唯一中文 id，并忽略代码块假标题', () => {
    const toc = buildMarkdownToc(TOC_MARKDOWN);
    const flattenToc = (items) => items.flatMap((item) => [
      item,
      ...flattenToc(item.children),
    ]);

    expect(flattenToc(toc).map(({ depth, text }) => [depth, text])).toEqual([
      [1, '快速开始'],
      [2, '中文标题：使用 npm 与 GFM'],
      [2, '中文标题：使用 npm 与 GFM'],
      [3, '重复'],
      [2, '收尾'],
    ]);

    const ids = flattenToc(toc).map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith('docs-'))).toBe(true);
    expect(ids).toContain('docs-中文标题使用-npm-与-gfm');
    expect(ids).toContain('docs-中文标题使用-npm-与-gfm-2');
    expect(ids).not.toContain('docs-代码块假标题');

    expect(toc[0].children.map((item) => item.text)).toEqual([
      '中文标题：使用 npm 与 GFM',
      '中文标题：使用 npm 与 GFM',
      '收尾',
    ]);
    expect(toc[0].children[1].children.map((item) => item.text)).toEqual(['重复']);
  });

  it('清理标点并给空标题稳定回退', () => {
    expect(slugifyHeading('  中文：使用 code  ')).toBe('中文使用-code');
    expect(slugifyHeading('：！？')).toBe('section');
    expect(buildMarkdownToc('# ：！？\n\n# ：！？').map((item) => item.id)).toEqual([
      'docs-section',
      'docs-section-2',
    ]);
  });
});

describe('MarkdownGuide 交互与安全', () => {
  it('渲染真实目录按钮、唯一 docs- id，并跳过代码块假标题', () => {
    const { container } = render(<MarkdownGuide markdown={TOC_MARKDOWN} />);
    const nav = getDesktopToc();
    const buttons = within(nav).getAllByRole('button');

    expect(buttons.map((button) => button.textContent)).toEqual([
      '快速开始',
      '中文标题：使用 npm 与 GFM',
      '中文标题：使用 npm 与 GFM',
      '重复',
      '收尾',
    ]);
    expect(within(nav).queryAllByRole('link')).toHaveLength(0);
    expect(nav.querySelector('a')).toBeNull();

    const headings = [...container.querySelectorAll('h1[id], h2[id], h3[id], h4[id]')];
    expect(headings).toHaveLength(6);
    expect(headings.every((heading) => heading.id.startsWith('docs-'))).toBe(true);
    expect(new Set(headings.map((heading) => heading.id)).size).toBe(headings.length);
    expect(screen.queryByRole('heading', { name: '代码块假标题' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2, name: '中文标题：使用 npm 与 GFM' })).toHaveLength(2);
    expect(screen.getByRole('heading', { level: 4, name: '更深' })).toBeInTheDocument();
  });

  it('标题 id 使用 docs- 前缀，不与页面已有 DOM id 冲突', () => {
    render(
      <>
        <div id="快速开始">既有页面元素</div>
        <MarkdownGuide markdown={TOC_MARKDOWN} />
      </>,
    );

    expect(document.getElementById('快速开始').textContent).toBe('既有页面元素');
    expect(document.getElementById('docs-快速开始')).not.toBeNull();
  });

  it('点击目录按钮时聚焦标题、平滑滚动且不改 URL hash', () => {
    const { container } = render(<MarkdownGuide markdown={TOC_MARKDOWN} />);
    const nav = getDesktopToc();
    const button = within(nav).getByRole('button', { name: '重复' });
    const id = button.getAttribute('aria-controls');
    const target = container.querySelector(`[id="${id}"]`);
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    const hashBefore = window.location.hash;

    fireEvent.click(button);

    expect(target).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(window.location.hash).toBe(hashBefore);
    expect(window.location.hash).not.toBe(`#${id}`);
  });

  it('reduced-motion 时使用 auto 滚动', () => {
    installMatchMedia({ reduceMotion: true });
    render(<MarkdownGuide markdown={TOC_MARKDOWN} />);
    const nav = getDesktopToc();
    const button = within(nav).getByRole('button', { name: '快速开始' });
    const target = document.getElementById(button.getAttribute('aria-controls'));
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    fireEvent.click(button);

    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });

  it('外链补 rel、危险协议被默认安全转换拦下、原始 HTML 不可执行', () => {
    const markdown = [
      '[安全外链](https://example.com/help)',
      '',
      '[危险链接](javascript:alert(1))',
      '',
      '<script>window.__docsXss = true</script>',
    ].join('\n');
    const { container } = render(<MarkdownGuide markdown={markdown} />);

    const external = screen.getByRole('link', { name: '安全外链' });
    expect(external).toHaveAttribute('href', 'https://example.com/help');
    expect(external).toHaveAttribute('target', '_blank');
    expect(external).toHaveAttribute('rel', 'noopener noreferrer');

    const dangerous = screen.getByText('危险链接').closest('a');
    expect(dangerous).not.toBeNull();
    expect(dangerous.getAttribute('href') || '').not.toMatch(/javascript:/i);
    expect(container.querySelector('script')).toBeNull();
  });

  it('正文内部锚点聚焦目标并滚动，不改变 HashRouter 的 hash', () => {
    const markdown = [
      '## 安装',
      '',
      '[跳到安装](#docs-安装)',
      '',
      '[跳到不存在](#docs-missing)',
    ].join('\n');
    const { container } = render(<MarkdownGuide markdown={markdown} />);
    const target = container.querySelector('#docs-安装');
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;
    const hashBefore = window.location.hash;

    fireEvent.click(screen.getByRole('link', { name: '跳到安装' }));

    expect(target).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(window.location.hash).toBe(hashBefore);

    fireEvent.click(screen.getByRole('link', { name: '跳到不存在' }));
    expect(window.location.hash).toBe(hashBefore);
  });

  it('GFM 表格包在局部滚动容器，代码块有可复制结构', () => {
    const markdown = [
      '| 名称 | 示例 |',
      '| --- | --- |',
      '| SSH | `ssh root@host -p 24` |',
      '',
      '```js',
      'console.log(1)',
      '```',
    ].join('\n');
    render(<MarkdownGuide markdown={markdown} />);

    expect(screen.getByRole('table').closest('.docs-table-scroll')).not.toBeNull();
    const pre = screen.getByText('console.log(1)').closest('pre');
    expect(pre).toHaveClass('docs-code-pre');
    expect(pre.closest('.docs-code-block')).not.toBeNull();
    expect(screen.getByRole('button', { name: '复制代码' })).toBeInTheDocument();
  });

  it('Clipboard 成功时复制完整代码并显示“已复制”', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    installClipboard(writeText);
    render(<MarkdownGuide markdown={CODE_MARKDOWN} />);

    fireEvent.click(screen.getByRole('button', { name: '复制代码' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('ssh root@192.0.2.0 -p 24'));
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();
  });

  it('Clipboard 拒绝但 execCommand 回退成功时仍显示“已复制”', async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error('clipboard denied')));
    const execCommand = vi.fn().mockReturnValue(true);
    installExecCommand(execCommand);
    render(<MarkdownGuide markdown={CODE_MARKDOWN} />);

    fireEvent.click(screen.getByRole('button', { name: '复制代码' }));

    await waitFor(() => expect(execCommand).toHaveBeenCalledWith('copy'));
    expect(await screen.findByRole('button', { name: '已复制' })).toBeInTheDocument();
    expect(document.querySelector('textarea[data-docs-copy-fallback]')).toBeNull();
  });

  it('Clipboard 与 execCommand 都失败时显示“复制失败”且不崩溃', async () => {
    installClipboard(vi.fn().mockRejectedValue(new Error('clipboard denied')));
    installExecCommand(vi.fn().mockReturnValue(false));
    render(<MarkdownGuide markdown={CODE_MARKDOWN} />);

    fireEvent.click(screen.getByRole('button', { name: '复制代码' }));

    expect(await screen.findByRole('button', { name: '复制失败' })).toBeInTheDocument();
  });

  it('TOC、代码块与表格拦截触摸冒泡，正文空白仍可冒泡', () => {
    const markdown = [
      '# 快速开始',
      '',
      '正文段落。',
      '',
      '```bash',
      'echo hi',
      '```',
      '',
      '| 名称 | 值 |',
      '| --- | --- |',
      '| A | B |',
    ].join('\n');
    const onTouchStart = vi.fn();
    const onTouchEnd = vi.fn();
    const { container } = render(
      <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <MarkdownGuide markdown={markdown} />
      </div>,
    );

    for (const selector of ['.docs-toc-desktop', '.docs-toc-mobile', '.docs-code-block', '.docs-table-scroll']) {
      const element = container.querySelector(selector);
      fireEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 10, clientY: 100 }] });
    }

    expect(onTouchStart).not.toHaveBeenCalled();
    expect(onTouchEnd).not.toHaveBeenCalled();

    fireEvent.touchStart(container.querySelector('.docs-markdown p'), {
      touches: [{ clientX: 100, clientY: 100 }],
    });
    expect(onTouchStart).toHaveBeenCalledTimes(1);
  });

  it('同时提供桌面目录和默认折叠的移动目录', () => {
    const { container } = render(<MarkdownGuide markdown={TOC_MARKDOWN} />);
    expect(container.querySelector('.docs-toc-desktop')).not.toBeNull();
    const mobile = container.querySelector('details.docs-toc-mobile');
    expect(mobile).not.toBeNull();
    expect(mobile).not.toHaveAttribute('open');
    expect(within(mobile).getByText('本页目录')).toBeInTheDocument();
  });

  it('移动端选择目录项时先折叠，再在下一帧滚动', () => {
    const originalRaf = window.requestAnimationFrame;
    window.requestAnimationFrame = (callback) => {
      callback(0);
      return 1;
    };
    const { container } = render(<MarkdownGuide markdown={TOC_MARKDOWN} />);
    const details = container.querySelector('details.docs-toc-mobile');
    details.open = true;
    const mobileNav = within(details).getByRole('navigation', { name: '目录' });
    const button = within(mobileNav).getByRole('button', { name: '重复' });
    const target = document.getElementById(button.getAttribute('aria-controls'));
    const scrollIntoView = vi.fn();
    target.scrollIntoView = scrollIntoView;

    fireEvent.click(button);

    expect(details.open).toBe(false);
    expect(target).toHaveFocus();
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    window.requestAnimationFrame = originalRaf;
  });
});
