import { describe, expect, it } from 'vitest';

import { dockerfileDiff, diffLines, collapseUnchanged } from '../utils/dockerfileDiff';

describe('dockerfileDiff', () => {
  it('标出两侧各自独有的行', () => {
    const { rows, added, removed } = dockerfileDiff(
      'FROM ubuntu:22.04\nRUN echo old\n',
      'FROM ubuntu:24.04\nRUN echo new\n',
    );

    expect(added).toBe(2);
    expect(removed).toBe(2);
    expect(rows.filter(r => r.type === 'del').map(r => r.text)).toEqual([
      'FROM ubuntu:22.04',
      'RUN echo old',
    ]);
    expect(rows.filter(r => r.type === 'add').map(r => r.text)).toEqual([
      'FROM ubuntu:24.04',
      'RUN echo new',
    ]);
  });

  it('相同的行不算改动', () => {
    const text = 'FROM ubuntu:24.04\nRUN echo same\n';
    const { added, removed, rows } = dockerfileDiff(text, text);

    expect(added).toBe(0);
    expect(removed).toBe(0);
    // 一行差异都没有 → 整段折成一条"N 行未变"，不铺一屏没变的内容
    expect(rows).toEqual([{ type: 'skip', count: 2 }]);
  });

  it('中间一大段没变时折叠掉，只留改动前后各两行', () => {
    // 模拟真实形状：FROM + 十几行平台注入（两侧完全相同）+ 业务片段
    const injection = Array.from({ length: 13 }, (_, i) => `RUN injection_${i}`);
    const before = ['FROM ubuntu:22.04', ...injection, 'RUN echo old'].join('\n');
    const after = ['FROM ubuntu:24.04', ...injection, 'RUN echo new'].join('\n');

    const { rows } = dockerfileDiff(before, after);

    const skipped = rows.filter(r => r.type === 'skip');
    expect(skipped).toHaveLength(1);
    // 13 行注入里，改动附近各留 2 行 → 折掉 9 行
    expect(skipped[0].count).toBe(9);
    // 折叠后一屏放得下——这正是"隐藏 Scroller"的前提
    expect(rows.length).toBeLessThan(12);
    expect(rows.some(r => r.type === 'del' && r.text === 'FROM ubuntu:22.04')).toBe(true);
    expect(rows.some(r => r.type === 'add' && r.text === 'RUN echo new')).toBe(true);
  });

  it('末尾换行不产生幻觉行', () => {
    expect(diffLines('FROM a\n', 'FROM a\n')).toEqual([{ type: 'same', text: 'FROM a' }]);
    // 一侧没有末尾换行、另一侧有，也不该算成一行差异
    expect(diffLines('FROM a', 'FROM a\n')).toEqual([{ type: 'same', text: 'FROM a' }]);
  });

  it('空文本不炸', () => {
    expect(dockerfileDiff('', '').rows).toEqual([]);
    expect(dockerfileDiff(undefined, 'FROM a\n').added).toBe(1);
  });

  it('改动集中在首尾时不折叠', () => {
    const ops = diffLines('a\nb\n', 'a\nc\n');
    expect(collapseUnchanged(ops).map(r => r.type)).toEqual(['same', 'del', 'add']);
  });
});
