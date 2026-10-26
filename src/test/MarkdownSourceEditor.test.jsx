import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { forceParsing } from '@codemirror/language';
import MarkdownSourceEditor from '../components/MarkdownSourceEditor';
import { findEditorView, replaceEditorText } from './editorTestUtils';

const renderEditor = (value = '', onChange = () => {}) => {
  render(<MarkdownSourceEditor value={value} onChange={onChange} />);
  const content = screen.getByRole('textbox', { name: '公告正文' });
  return { content, view: findEditorView(content) };
};

const MARKDOWN = [
  '# 标题',
  '',
  '**粗体**',
  '',
  '[链接](https://example.com)',
  '',
  '- 列表项',
  '',
  '`行内代码`',
  '',
  '```js',
  'const answer = 42;',
  '```',
].join('\n');

describe('MarkdownSourceEditor', () => {
  it('源码标记按类别着色且保持原文', async () => {
    const { content, view } = renderEditor(MARKDOWN);
    forceParsing(view, view.state.doc.length, 1000);

    expect(view.state.doc.toString()).toBe(MARKDOWN);
    await waitFor(() => {
      expect(content.querySelector('.cm-md-heading')).not.toBeNull();
      expect(content.querySelector('.cm-md-strong')).not.toBeNull();
      expect(content.querySelector('.cm-md-link')).not.toBeNull();
      expect(content.querySelector('.cm-md-mark')).not.toBeNull();
      expect(content.querySelector('.cm-md-code')).not.toBeNull();
    });
    expect(content.textContent).toContain('# 标题');
    expect(content.textContent).toContain('**粗体**');
    expect(content.textContent).toContain('[链接](https://example.com)');
    expect(content.textContent).toContain('- 列表项');
    expect(content.textContent).toContain('`行内代码`');
    expect(content.textContent).toContain('```js');
  });

  it('HTML 与 Markdown 只显示源码不生成预览节点', async () => {
    const raw = '<b>原文</b> &amp;\n\n# 标题\n\n[链接](https://example.com)';
    const { content, view } = renderEditor(raw);

    expect(view.state.doc.toString()).toBe(raw);
    expect(content.textContent).toContain('<b>原文</b> &amp;');
    expect(content.querySelector('h1, h2, a, b, pre, p')).toBeNull();
    await waitFor(() => expect(content.querySelector('.cm-md-heading')).not.toBeNull());
  });

  it('键盘撤销与重做同步受控正文', async () => {
    function Harness() {
      const [value, setValue] = useState('初始正文');
      return (
        <>
          <MarkdownSourceEditor value={value} onChange={setValue} />
          <output data-testid="controlled-value">{value}</output>
        </>
      );
    }

    render(<Harness />);
    const content = screen.getByRole('textbox', { name: '公告正文' });
    const view = findEditorView(content);
    const controlled = screen.getByTestId('controlled-value');

    view.focus();
    replaceEditorText(view, '初始正文 + 用户修改');
    await waitFor(() => expect(controlled.textContent).toBe('初始正文 + 用户修改'));

    fireEvent.keyDown(content, {
      key: 'z',
      code: 'KeyZ',
      keyCode: 90,
      ctrlKey: true,
    });
    await waitFor(() => expect(view.state.doc.toString()).toBe('初始正文'));
    expect(controlled.textContent).toBe('初始正文');

    fireEvent.keyDown(content, {
      key: 'y',
      code: 'KeyY',
      keyCode: 89,
      ctrlKey: true,
    });
    await waitFor(() => expect(view.state.doc.toString()).toBe('初始正文 + 用户修改'));
    expect(controlled.textContent).toBe('初始正文 + 用户修改');
  });

  it('正文编辑器可通过键盘聚焦并允许 Tab 离开', async () => {
    const user = userEvent.setup();
    render(
      <>
        <MarkdownSourceEditor value="正文" onChange={() => {}} />
        <button type="button">编辑区之后</button>
      </>,
    );

    const content = screen.getByRole('textbox', { name: '公告正文' });
    const after = screen.getByRole('button', { name: '编辑区之后' });
    expect(content.getAttribute('contenteditable')).toBe('true');
    expect(content.getAttribute('aria-multiline')).toBe('true');

    content.focus();
    expect(document.activeElement).toBe(content);
    await user.tab();
    expect(document.activeElement).toBe(after);
  });
});
