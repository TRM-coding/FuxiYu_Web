import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import MachineDetailModal from '../components/MachineDetailModal';

const BASE_MACHINE = {
  machine_name: 'node-01',
  machine_ip: '10.0.0.7',
  machine_type: 'GPU',
  machine_status: 'online',
  cpu_core_number: 16,
  memory_size_gb: 128,
};

describe('MachineDetailModal 端口展示（Q15）', () => {
  it('显示机器记录里配置的实际端口', () => {
    render(<MachineDetailModal visible machine={{ ...BASE_MACHINE, port: 6789 }} onClose={vi.fn()} />);

    expect(screen.getByText('Node 端口')).toBeInTheDocument();
    expect(screen.getByText('6789')).toBeInTheDocument();
  });

  it('端口缺省时明确标注回落平台默认，不显示默认端口号', () => {
    render(<MachineDetailModal visible machine={{ ...BASE_MACHINE, port: null }} onClose={vi.fn()} />);

    expect(screen.getByText('未配置（平台默认）')).toBeInTheDocument();
    expect(screen.queryByText('5789')).not.toBeInTheDocument();
  });
});
