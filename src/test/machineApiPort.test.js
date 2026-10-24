import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { getDetailInformation, normalizeMachineDetail, normalizeMachinePort } from '../api/machine_api';

/**
 * Q15 回归锁：机器详情的 port 必须原样带出真实配置。
 * 后端契约里 port 是机器记录上的显式端口；null/缺失 = 未配置、回落平台默认。
 * 前端不得把缺失值填成某个默认端口号——那会把「默认」伪装成真实配置。
 */

const stubDetail = (detail) => {
  fetch.mockResolvedValue({
    ok: true,
    status: 200,
    statusText: 'OK',
    url: 'https://ctrl/api/machines/get_detail_information',
    json: async () => detail,
  });
};

describe('machine_api 机器详情端口映射（Q15）', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('保留后端返回的真实端口', async () => {
    stubDetail({ machine_name: 'node', machine_ip: '10.0.0.7', port: 6789 });

    await expect(getDetailInformation(7)).resolves.toMatchObject({ port: 6789 });
  });

  it('null 端口保持 null，不填任何默认端口号', async () => {
    stubDetail({ machine_name: 'node', machine_ip: '10.0.0.7', port: null });

    const detail = await getDetailInformation(7);

    expect(detail.port).toBeNull();
  });

  it('缺失端口映射为显式 null（缺值语义明确），不臆造默认值', async () => {
    stubDetail({ machine_name: 'node', machine_ip: '10.0.0.7' });

    const detail = await getDetailInformation(7);

    expect('port' in detail).toBe(true);
    expect(detail.port).toBeNull();
  });

  it('字符串端口收敛为整数，越界/非法值收敛为 null', () => {
    expect(normalizeMachinePort('6789')).toBe(6789);
    expect(normalizeMachinePort(1)).toBe(1);
    expect(normalizeMachinePort(65535)).toBe(65535);
    expect(normalizeMachinePort(0)).toBeNull();
    expect(normalizeMachinePort(65536)).toBeNull();
    expect(normalizeMachinePort('abc')).toBeNull();
    expect(normalizeMachinePort(undefined)).toBeNull();
    expect(normalizeMachinePort('')).toBeNull();
  });

  it('normalizeMachineDetail 只规范化 port，不改动其它字段', () => {
    expect(normalizeMachineDetail({ machine_name: 'n', port: '6789', cpu_core_number: 4 })).toEqual({
      machine_name: 'n',
      port: 6789,
      cpu_core_number: 4,
    });
  });
});
