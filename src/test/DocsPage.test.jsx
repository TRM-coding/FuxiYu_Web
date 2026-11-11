import React from 'react';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Docs from '../pages/Docs';

describe('Docs Markdown 使用说明页', () => {
  it('从已复制指南渲染正文与 15 项目录，不渲染旧硬编码章节', () => {
    const { container } = render(<Docs />);

    expect(screen.getByRole('heading', { level: 1, name: '快速开始' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: '多人共用容器' })).toBeInTheDocument();
    expect(screen.getByText('点击边栏内的“创建容器”选项卡。')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: '防止容器被删除' })).toBeInTheDocument();

    const toc = screen.getByRole('navigation', { name: '页内目录' });
    expect(within(toc).getAllByRole('button')).toHaveLength(15);
    expect(within(toc).queryAllByRole('link')).toHaveLength(0);
    expect(screen.queryByText('概念卡 · 状态标签')).not.toBeInTheDocument();
    expect(container.querySelector('script')).toBeNull();
  });
});
