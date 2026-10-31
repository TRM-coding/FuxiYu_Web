// 两份 Dockerfile 文本的逐行差异。
//
// 用在"恢复内容与删除前不同"那个弹窗里：两份文本后端都已经给了（snapshot / template），
// 前端直接比，不额外要接口。
//
// 刻意做**折叠**：渲染出来的 Dockerfile 里，平台注入段有十几行而两侧完全相同，
// 全列出来会把真正的改动淹没在一片"没变"里，也会撑出滚动条。折叠后只剩
// 「改动 + 前后各 CONTEXT 行」，一屏放得下。

const CONTEXT = 2;

const splitLines = (text) => {
  const normalized = String(text ?? '')
    .replace(/\r\n/g, '\n')
    // 末尾换行会切出一个空元素，它是排版产物不是一行内容
    .replace(/\n$/, '');
  // 空文本是**零行**，不是一个空行——否则两边都空时会被算成"有一行相同"
  return normalized === '' ? [] : normalized.split('\n');
};

/**
 * 逐行 LCS 差异。
 * @returns {{type: 'same'|'add'|'del', text: string}[]}
 *   add = 只在 after 里有，del = 只在 before 里有。
 */
export function diffLines(before, after) {
  const a = splitLines(before);
  const b = splitLines(after);

  // dp[i][j] = a[i..] 与 b[j..] 的最长公共子序列长度
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const ops = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      ops.push({ type: 'same', text: a[i] });
      i += 1;
      j += 1;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ type: 'del', text: a[i] });
      i += 1;
    } else {
      ops.push({ type: 'add', text: b[j] });
      j += 1;
    }
  }
  while (i < a.length) ops.push({ type: 'del', text: a[i++] });
  while (j < b.length) ops.push({ type: 'add', text: b[j++] });
  return ops;
}

/** 把连续未变动的行折成 { type: 'skip', count }，每处改动前后各留 CONTEXT 行上下文。 */
export function collapseUnchanged(ops, context = CONTEXT) {
  const keep = new Array(ops.length).fill(false);
  ops.forEach((op, idx) => {
    if (op.type === 'same') return;
    const from = Math.max(0, idx - context);
    const to = Math.min(ops.length - 1, idx + context);
    for (let k = from; k <= to; k += 1) keep[k] = true;
  });

  const out = [];
  let skipped = 0;
  ops.forEach((op, idx) => {
    if (keep[idx]) {
      if (skipped > 0) {
        out.push({ type: 'skip', count: skipped });
        skipped = 0;
      }
      out.push(op);
    } else {
      skipped += 1;
    }
  });
  if (skipped > 0) out.push({ type: 'skip', count: skipped });
  return out;
}

/** 差异统计，用于"共 +N 行 / -M 行"这类概述。 */
export function diffSummary(ops) {
  return ops.reduce(
    (acc, op) => {
      if (op.type === 'add') acc.added += 1;
      if (op.type === 'del') acc.removed += 1;
      return acc;
    },
    { added: 0, removed: 0 },
  );
}

/** 一步到位：给两份文本，拿折叠好的差异行。 */
export function dockerfileDiff(before, after) {
  const ops = diffLines(before, after);
  return { rows: collapseUnchanged(ops), ...diffSummary(ops) };
}
