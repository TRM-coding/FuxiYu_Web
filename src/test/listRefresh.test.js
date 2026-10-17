import { describe, expect, it } from 'vitest';
import { containerListFingerprint, machineListFingerprint, userListFingerprint } from '../utils/listRefresh';

describe('list refresh fingerprints', () => {
  it('tracks container status and runtime frame changes', () => {
    const base = [{
      key: '1',
      effective_status: 'online',
      runtime_metrics: { collected_at: '2026-09-03T10:00:00' },
    }];

    expect(containerListFingerprint(base)).toBe(containerListFingerprint([...base]));
    expect(containerListFingerprint(base)).not.toBe(containerListFingerprint([{
      ...base[0],
      effective_status: 'failed',
      failed_reason: 'create_failed',
    }]));
    expect(containerListFingerprint(base)).not.toBe(containerListFingerprint([{
      ...base[0],
      runtime_metrics: { collected_at: '2026-09-03T10:00:05' },
    }]));
  });

  it('tracks machine status and runtime frame changes', () => {
    const base = [{
      key: '1',
      machine_status: 'online',
      is_maintenance: false,
      runtime_snapshot: { collected_at: '2026-09-03T10:00:00' },
    }];

    expect(machineListFingerprint(base)).toBe(machineListFingerprint([...base]));
    expect(machineListFingerprint(base)).not.toBe(machineListFingerprint([{ ...base[0], is_maintenance: true }]));
    expect(machineListFingerprint(base)).not.toBe(machineListFingerprint([{
      ...base[0],
      runtime_snapshot: { collected_at: '2026-09-03T10:00:05' },
    }]));
  });

  it('tracks user list count changes', () => {
    const base = [{ key: '7', username: 'u', amount_of_container: 1 }];

    expect(userListFingerprint(base)).toBe(userListFingerprint([...base]));
    expect(userListFingerprint(base)).not.toBe(userListFingerprint([{ ...base[0], amount_of_container: 2 }]));
  });

  it('covers container role, disk limit, operation gates and displayed fields without order noise', () => {
    const base = [{
      key: '1',
      container_id: 1,
      container_name: 'train-a',
      image_name: 'fuxi/image-1:tag',
      port: '1024',
      machine_id: '3',
      machine_ip: '10.0.0.8',
      effective_status: 'online',
      accounts: [
        { user_id: 1, username: 'root', role: 'ROOT' },
        { user_id: 2, username: 'u2', role: 'COLLABORATOR' },
      ],
      owners: ['root'],
      disk_total_gb: 10,
      disk_limit_gb: 100,
      long_term_container_can_enable: true,
      long_term_container_blocked_user_ids: [2],
      long_term_container_remaining_by_user: { 1: 1 },
    }];
    const before = containerListFingerprint(base);
    const withRow = patch => containerListFingerprint([{ ...base[0], ...patch }]);

    expect(withRow({})).toBe(before);
    // 角色变化必须刷新
    expect(withRow({
      accounts: [
        { user_id: 1, username: 'root', role: 'ROOT' },
        { user_id: 2, username: 'u2', role: 'ADMIN' },
      ],
    })).not.toBe(before);
    // 角色/成员集合只是换序：语义相同，不得触发刷新
    expect(withRow({ accounts: [base[0].accounts[1], base[0].accounts[0]] })).toBe(before);
    // 磁盘限额与展示
    expect(withRow({ disk_limit_gb: 200 })).not.toBe(before);
    expect(withRow({ disk_total_gb: 11 })).not.toBe(before);
    // 长期容器操作门禁与配额
    expect(withRow({ long_term_container_can_enable: false })).not.toBe(before);
    expect(withRow({ long_term_container_blocked_user_ids: [3] })).not.toBe(before);
    expect(withRow({ long_term_container_remaining_by_user: { 1: 0 } })).not.toBe(before);
    // 其它展示字段
    expect(withRow({ container_name: 'train-b' })).not.toBe(before);
    expect(withRow({ image_name: 'fuxi/image-2:tag' })).not.toBe(before);
    expect(withRow({ port: '2048' })).not.toBe(before);
    expect(withRow({ machine_ip: '10.0.0.9' })).not.toBe(before);
    expect(withRow({ owners: ['root', 'u2'] })).not.toBe(before);
  });

  it('covers machine display fields and live snapshot meters', () => {
    const base = [{
      key: '1',
      machine_id: 1,
      machine_name: 'gpu-a',
      machine_ip: '10.0.0.8',
      machine_type: 'GPU',
      machine_status: 'online',
      is_maintenance: false,
      runtime_snapshot: {
        collected_at: 't1',
        cpu: { usage_percent: 10 },
        memory: { usage_percent: 20 },
        gpu: [{ index: 0, utilization_gpu_percent: 30 }, { index: 1, utilization_gpu_percent: 50 }],
      },
    }];
    const before = machineListFingerprint(base);
    const withRow = patch => machineListFingerprint([{ ...base[0], ...patch }]);
    const snap = extra => ({ runtime_snapshot: { ...base[0].runtime_snapshot, ...extra } });

    expect(withRow({})).toBe(before);
    expect(withRow({ machine_name: 'gpu-b' })).not.toBe(before);
    expect(withRow({ machine_ip: '10.0.0.9' })).not.toBe(before);
    expect(withRow({ machine_type: 'CPU' })).not.toBe(before);
    expect(withRow({ machine_status: 'offline' })).not.toBe(before);
    expect(withRow({ is_maintenance: true })).not.toBe(before);
    // 实时仪表：CPU / 内存 / GPU 利用率
    expect(withRow(snap({ cpu: { usage_percent: 11 } }))).not.toBe(before);
    expect(withRow(snap({ memory: { usage_percent: 21 } }))).not.toBe(before);
    expect(withRow(snap({
      gpu: [{ index: 0, utilization_gpu_percent: 31 }, { index: 1, utilization_gpu_percent: 50 }],
    }))).not.toBe(before);
    // GPU 数组换序但各卡数值不变：语义一致，不得刷新
    expect(withRow(snap({ gpu: [base[0].runtime_snapshot.gpu[1], base[0].runtime_snapshot.gpu[0]] }))).toBe(before);
  });

  it('covers user profile fields shown in the user list', () => {
    const base = [{
      key: '7',
      username: 'u',
      email: 'a@x',
      graduation_year: 2020,
      amount_of_container: 1,
      amount_of_functional_container: 0,
      amount_of_managed_container: 0,
      amount_of_long_term_container: 0,
    }];
    const before = userListFingerprint(base);
    const withRow = patch => userListFingerprint([{ ...base[0], ...patch }]);

    expect(withRow({})).toBe(before);
    expect(withRow({ username: 'v' })).not.toBe(before);
    expect(withRow({ email: 'b@x' })).not.toBe(before);
    expect(withRow({ graduation_year: 2021 })).not.toBe(before);
    expect(withRow({ amount_of_managed_container: 2 })).not.toBe(before);
  });
});
