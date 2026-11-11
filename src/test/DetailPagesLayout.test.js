import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const css = readFileSync(path.resolve(process.cwd(), 'src/pages/DetailPages.css'), 'utf8');

const block = (selector) => {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = css.match(new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`));
  return match ? match[1] : '';
};

describe('ContainerDetailPage 窄屏布局契约', () => {
  it('tc_container_css_01_390_title_path', () => {
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(460px,\s*100%\),\s*1fr\)\)/);
    expect(block('.detail-card')).toMatch(/min-width:\s*0/);
    expect(block('.detail-title h1')).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block('.bind-mount-path-value .bind-mount-path-chip.fuxi-copy-chip')).toMatch(/white-space:\s*normal/);
  });

  it('tc_container_css_02_320_metrics', () => {
    expect(block('.detail-metric')).toMatch(/min-width:\s*0/);
    expect(block('.detail-metric-value')).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block('.detail-metric-extra')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('tc_container_css_03_768_desktop', () => {
    expect(css).toMatch(/\.machine-detail-layout,\s*\.container-detail-layout\s*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(460px,\s*100%\),\s*1fr\)\)/s);
    expect(css).toMatch(/\.detail-runtime-item\s*\{[^}]*min-width:\s*0/s);
  });
});

describe('MachineDetailPage 窄屏布局契约', () => {
  it('tc_machine_css_01_390', () => {
    expect(css).toMatch(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(460px,\s*100%\),\s*1fr\)\)/);
    expect(block('.detail-title h1')).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block('.detail-metric-extra')).toMatch(/overflow-wrap:\s*anywhere/);
  });

  it('tc_machine_css_02_320', () => {
    expect(css).toMatch(/@media\s*\(max-width:\s*980px\)\s*\{[\s\S]*?\.machine-limit-row\s*\{[^}]*flex-direction:\s*column/s);
    expect(block('.machine-gpu-pick span')).toMatch(/max-width:\s*140px/);
    expect(block('.detail-card')).toMatch(/min-width:\s*0/);
  });

  it('tc_machine_css_03_768_desktop', () => {
    expect(css).toMatch(/\.machine-detail-layout[^{]*\{[^}]*grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(460px,\s*100%\),\s*1fr\)\)/s);
    expect(block('.detail-metric')).toMatch(/min-width:\s*0/);
  });

  it('tc_machine_css_04_optional_metrics', () => {
    expect(block('.detail-metric-value')).toMatch(/overflow-wrap:\s*anywhere/);
    expect(block('.detail-runtime-item')).toMatch(/min-width:\s*0/);
    expect(block('.detail-runtime-item span')).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
