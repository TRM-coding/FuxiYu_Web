import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect } from 'vitest';

const readCss = () => fs.readFileSync(
  path.resolve(process.cwd(), 'src/pages/NotFound.css'),
  'utf8',
);

const pageBlock = css => css.match(/\.notfound-page\s*\{([^}]*)\}/)?.[1] || '';
const mobileBlock = css => css.match(/@media\s*\(max-width:\s*768px\)\s*\{([\s\S]*)\}\s*$/)?.[1] || '';

describe('NotFound 完整视口高度', () => {
  it('test_q66_notfound_full_viewport', () => {
    const css = readCss();
    const block = pageBlock(css);
    expect(block).toMatch(/min-height:\s*100vh/);
    expect(block).not.toMatch(/calc\(\s*100vh\s*-\s*64px\s*\)/);
    expect(css).not.toMatch(/calc\(\s*100vh\s*-\s*64px\s*\)/);
    expect(css).not.toMatch(/calc\(\s*100vh\s*-\s*56px\s*\)/);
  });

  it('test_q66_notfound_mobile_no_gap', () => {
    const css = readCss();
    const mobile = mobileBlock(css);
    expect(mobile).not.toBe('');
    expect(mobile).toMatch(/min-height:\s*100(?:d|s)?vh/);
    expect(mobile).not.toMatch(/calc\(\s*100vh\s*-\s*56px\s*\)/);
    expect(mobile).not.toMatch(/calc\(\s*100vh\s*-\s*64px\s*\)/);
  });
});
