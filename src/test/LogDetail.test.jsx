import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LogDetail } from '../pages/AdminLogs';

describe('LogDetail 详情展开', () => {
  it('renders grouped batch failures with counts and individual reasons', () => {
    const messages = [
      { recipient: 'first@example.test', subject: 'Notice', error_reason: 'refused' },
      { recipient: 'second@example.test', subject: 'Notice', error_reason: 'timeout' },
    ];
    render(<LogDetail record={{
      success: false, error_reason: 'mail_batch_failed',
      detail: { batch_total: 4, message_count: 2, messages },
    }} />);
    expect(screen.getByText('批次邮件总数')).toBeInTheDocument();
    expect(screen.getByText('本组邮件数')).toBeInTheDocument();
    expect(screen.getByText('邮件明细')).toBeInTheDocument();
    expect(screen.getByText(JSON.stringify(messages))).toBeInTheDocument();
    expect(screen.getByText(/error_reason: mail_batch_failed/)).toBeInTheDocument();
  });
  it('rejected settings show raw input without an applied diff', () => {
    const { container } = render(<LogDetail record={{
      success: false,
      detail: {
        before: { 'container.disk_check_enabled': false },
        requested: { 'container.disk_check_enabled': 'maybe' },
        setting_keys: ['container.disk_check_enabled'],
      },
      error_reason: 'must be boolean',
    }} />);
    expect(screen.getByText('请求值（未生效）')).toBeInTheDocument();
    expect(screen.getByText('{"container.disk_check_enabled":"maybe"}')).toBeInTheDocument();
    expect(container.querySelector('.admin-logs-diff')).toBeNull();
    expect(screen.getByText(/error_reason: must be boolean/)).toBeInTheDocument();
  });

  it('successful settings preserve multiline before and after values', () => {
    render(<LogDetail record={{
      success: true,
      detail: {
        before: { 'image.platform_injection_content': 'USER root\nRUN echo before' },
        after: { 'image.platform_injection_content': 'USER root\nRUN echo after' },
      },
    }} />);
    expect(screen.getByText('USER root RUN echo before')).toBeInTheDocument();
    expect(screen.getByText('USER root RUN echo after')).toBeInTheDocument();
    expect(screen.getByText('→')).toBeInTheDocument();
  });
  it('before/after 存在时渲染前→后对比（状态值翻译）', () => {
    render(<LogDetail record={{
      detail: { before: { machine_status: 'online' }, after: { machine_status: 'maintenance' } },
      error_reason: null,
    }} />);

    expect(screen.getByText('机器状态')).toBeInTheDocument();
    expect(screen.getByText('运行中')).toBeInTheDocument();  // before 翻译
    expect(screen.getByText('维护中')).toBeInTheDocument();  // after 翻译
    expect(screen.getByText('→')).toBeInTheDocument();
  });

  it('平铺 detail 渲染结构化键值（字段名翻译）', () => {
    render(<LogDetail record={{
      detail: { reason: 'disk_hard_limit', usage: '80.0GB/100.0GB' },
      error_reason: null,
    }} />);

    expect(screen.getByText('原因')).toBeInTheDocument();
    expect(screen.getByText('disk_hard_limit')).toBeInTheDocument();
    expect(screen.getByText('用量')).toBeInTheDocument();
  });

  it('error_reason 附加展示', () => {
    render(<LogDetail record={{
      detail: { reason: 'disk_hard_limit' },
      error_reason: 'pause_failed',
    }} />);

    expect(screen.getByText(/error_reason: pause_failed/)).toBeInTheDocument();
  });

  it('可切换到原始 JSON 视图', async () => {
    render(<LogDetail record={{
      detail: { before: { machine_status: 'online' }, after: { machine_status: 'maintenance' } },
      error_reason: null,
    }} />);

    await userEvent.click(screen.getByText('原始 JSON'));
    // 原始视图：完整 JSON 不截断
    expect(screen.getByText(/"machine_status": "online"/)).toBeInTheDocument();
  });
});
