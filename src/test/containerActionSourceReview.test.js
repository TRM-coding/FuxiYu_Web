import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { describe, it, expect } from 'vitest';

const read = relative => fs.readFileSync(path.resolve(process.cwd(), relative), 'utf8');

const PAGES = [
  'src/pages/Home.jsx',
  'src/pages/ManageMachine.jsx',
  'src/pages/ManageUser.jsx',
  'src/pages/ManageUserInTable.jsx',
  'src/pages/ContainerDetailPage.jsx',
  'src/components/ContainerDetailModal.jsx',
];

const RESOLVER_CONSUMERS = [
  'src/pages/Home.jsx',
  'src/pages/ManageMachine.jsx',
  'src/pages/ManageUser.jsx',
  'src/pages/ContainerDetailPage.jsx',
];

describe('源码审查：只有一套容器动作规则', () => {
  it('四个动作页面只通过 resolveContainerActions 判定资格', () => {
    for (const file of RESOLVER_CONSUMERS) {
      const source = read(file);
      expect(source, file).toContain('resolveContainerActions');
      expect(source, file).not.toMatch(/getContainerActionState|getRoleActionSet|canSetLongTerm/);
      expect(source, file).not.toMatch(/long_term_eligibility|evaluated_at|disk_measured_at/);
    }
  });

  it('页面不再保留旧配额/磁盘长期门或重复角色表', () => {
    for (const file of PAGES) {
      const source = read(file);
      expect(source, file).not.toMatch(/isDiskOverLimit|DISK_OVER_LIMIT_MESSAGE/);
      expect(source, file).not.toMatch(/getContainerActionState|getRoleActionSet|canSetLongTerm/);
      expect(source, file).not.toMatch(/long_term_eligibility/);
      expect(source, file).not.toMatch(/long_term_container_can_enable\s*===\s*false/);
      expect(source, file).not.toMatch(/freeze_state\s*&&[^\n]*(long_term|delete|enabled|disabled)/);
    }
  });

  it('表格只消费父级 longTerm，不自行读旧字段或磁盘百分比', () => {
    const source = read('src/pages/ManageUserInTable.jsx');
    expect(source).toContain('containerRecord?.longTerm');
    expect(source).not.toMatch(/long_term_container_remaining|long_term_container_can_enable|disk_usage_percent|freeze_state|is_long_term/);
    expect(source).not.toMatch(/isDiskOverLimit|resolveContainerActions/);
    expect(source).not.toMatch(/deleteContainer|startContainer|stopContainer|unpauseContainer/);
  });

  it('详情弹窗不再用系统管理员标志/状态字符串另造删除、解冻或长期判据', () => {
    const source = read('src/components/ContainerDetailModal.jsx');
    expect(source).not.toMatch(/forceSystemAdmin|isRoot/);
    expect(source).not.toMatch(/long_term_enable|long_term_disable|long_term_container_can_enable/);
    expect(source).not.toMatch(/Checkbox/);
    expect(source).toContain('deleteAction?.visible');
    expect(source).toContain('unpauseAction?.visible');
  });

  it('ManageMachine 卡片不再挂旧详情弹窗，删除资格仍由共享动作工具给出', () => {
    const source = read('src/pages/ManageMachine.jsx');
    expect(source).not.toMatch(/ContainerDetailModal|openContainerDetail|returnToDetail|detailModalVisible/);
    expect(source).toContain('resolveContainerActions');
    expect(source).not.toMatch(/deleteContainer\(/);
    expect(source).not.toMatch(/openDeleteContainerConfirm|handleDeleteContainerConfirm/);
  });

  it('实际删除入口只在专用容器详情页', () => {
    const detailPage = read('src/pages/ContainerDetailPage.jsx');
    expect(detailPage).toContain('deleteContainer(');
    expect(detailPage).toContain('actions?.delete.visible');
    expect(detailPage).toContain("preflightDetailAction('delete')");

    for (const file of ['src/pages/ManageMachine.jsx', 'src/pages/ManageUser.jsx', 'src/pages/ManageUserInTable.jsx']) {
      expect(read(file), file).not.toMatch(/deleteContainer\(/);
    }
  });

  it('删除不推导解除关联，共享七动作不含 leave', () => {
    const source = read('src/utils/containerActions.js');
    expect(source).not.toMatch(/'leave'/);
    const modal = read('src/components/ContainerDetailModal.jsx');
    expect(modal).not.toMatch(/canLeave\s*=\s*[^;]*delete/);
    expect(modal).not.toMatch(/showLeave\s*=\s*[^;]*delete/);
  });

  it('Web 不消费 ready_identity 或 Node 动作字段推断成功/资格', () => {
    for (const file of [...PAGES, 'src/utils/containerActions.js']) {
      const source = read(file);
      expect(source, file).not.toMatch(/ready_identity|node_action|nodeAction|action_result/);
    }
  });
});
