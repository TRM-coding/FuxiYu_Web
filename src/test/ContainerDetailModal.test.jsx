import React from 'react';
import { render, screen } from '@testing-library/react';

import ContainerDetailModal from '../components/ContainerDetailModal';

describe('ContainerDetailModal', () => {
  it('展示详情接口已有的运行态、诊断、磁盘和清退信息', () => {
    render(
      <ContainerDetailModal
        visible
        onClose={() => {}}
        currentUserId={1}
        container={{
          key: 9,
          container_id: 9,
          container_name: 'train-a',
          container_image: 'fuxi/image-1:20260829',
          machine_ip: '127.0.0.1',
          effective_status: 'failed',
          failed_reason: 'create_failed',
          failed_detail: 'could not select device driver nvidia',
          cpu_number: 2,
          gpu_number: 1,
          memory_gb: 4,
          shared_gb: 1,
          port: 1024,
          last_ssh_login_time: '2026-08-29T17:20:54',
          seconds_until_cleanup: 7200,
          disk_usage: {
            total_gb: 12.5,
            limit_gb: 100,
            usage_percent: 12.5,
          },
          runtime_metrics: {
            cpu_usage_percent: 18.5,
            memory_usage_percent: 40,
            memory_usage_mb: 409.6,
            memory_limit_mb: 1024,
            network_rx_mb: 2,
            network_tx_mb: 3,
            block_read_mb: 4,
            block_write_mb: 5,
            gpu: {
              devices: [{
                vendor: 'nvidia',
                index: 0,
                name: 'RTX 4060',
                utilization_gpu_percent: 39,
                memory_used_mb: 586,
                memory_total_mb: 8188,
              }],
            },
          },
          freeze_state: {
            is_frozen: true,
            days_frozen: 2,
            grace_until: '2026-08-31T00:00:00',
          },
          accounts: [
            { user_id: 1, username: 'root_user', role: 'ROOT' },
            { user_id: 2, username: 'admin_user', role: 'ADMIN' },
            { user_id: 3, username: 'collab_user', role: 'COLLABORATOR' },
          ],
        }}
        onEdit={() => {}}
        usersList={[
          { id: 1, name: 'root_user', username: 'root_user' },
          { id: 2, name: 'admin_user', username: 'admin_user' },
          { id: 3, name: 'collab_user', username: 'collab_user' },
        ]}
      />
    );

    expect(screen.getByText('人员管理 (3人)')).toBeInTheDocument();
    expect(screen.getByText('超级管理员')).toBeInTheDocument();
    expect(screen.getByText('管理员')).toBeInTheDocument();
    expect(screen.getByText('协作者')).toBeInTheDocument();
    expect(screen.getByText('@root_user')).toBeInTheDocument();
    expect(screen.getByText('ID 1')).toBeInTheDocument();
    expect(screen.getByText('端口管理')).toBeInTheDocument();
    expect(screen.getByText('失败诊断')).toBeInTheDocument();
    expect(screen.getByText('create_failed')).toBeInTheDocument();
    expect(screen.getByText(/could not select device driver nvidia/)).toBeInTheDocument();
    expect(screen.getByText('运行摘要')).toBeInTheDocument();
    expect(screen.getByText('清理与磁盘')).toBeInTheDocument();
    expect(screen.getByText('GPU 运行情况')).toBeInTheDocument();
    expect(screen.getByText('RTX 4060')).toBeInTheDocument();
    expect(screen.getByText('读 4 MB / 写 5 MB')).toBeInTheDocument();
    expect(screen.getByText('冻结 2 天')).toBeInTheDocument();
  });

  it('在线容器的 ROOT 用户可以从人员管理区域进入编辑', () => {
    render(
      <ContainerDetailModal
        visible
        onClose={() => {}}
        currentUserId={1}
        onEdit={() => {}}
        container={{
          key: 10,
          container_id: 10,
          container_name: 'train-b',
          container_image: 'fuxi/image-1:20260829',
          machine_ip: '127.0.0.1',
          effective_status: 'online',
          port: 1025,
          accounts: [
            { user_id: 1, username: 'root_user', role: 'ROOT' },
          ],
        }}
        usersList={[
          { id: 1, name: 'root_user', username: 'root_user' },
        ]}
      />
    );

    expect(screen.getByText('人员管理 (1人)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /管理人员/ })).toBeInTheDocument();
  });
});
