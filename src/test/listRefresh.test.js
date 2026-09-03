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
});
