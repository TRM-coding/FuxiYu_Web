import { describe, it, expect } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useContainerSnapshots } from '../utils/containerSnapshots';

describe('useContainerSnapshots', () => {
  it('登记最新列表行并按 key/container_id 读取', () => {
    const { result } = renderHook(() => useContainerSnapshots());
    act(() => {
      result.current.remember({ key: '1', effective_status: 'online' }, 'list');
      result.current.remember({ container_id: 2, effective_status: 'offline' }, 'detail');
    });
    expect(result.current.get('1')).toMatchObject({ effective_status: 'online' });
    expect(result.current.get(2)).toMatchObject({ effective_status: 'offline' });
    expect(result.current.get('404')).toBe(null);
  });

  it('后登记的快照覆盖旧快照，不反过来用点击时旧值', () => {
    const { result } = renderHook(() => useContainerSnapshots());
    act(() => {
      result.current.remember({ key: '1', effective_status: 'online' });
      result.current.remember({ key: '1', effective_status: 'failed' }, 'detail');
    });
    expect(result.current.get('1').effective_status).toBe('failed');
  });

  it('同一上下文的新列表缺少旧行时登记墓碑，旧快照不再可提交', () => {
    const { result } = renderHook(() => useContainerSnapshots());
    act(() => {
      result.current.rememberList([{ key: '1' }, { key: '2' }], 'home');
    });
    act(() => {
      result.current.rememberList([{ key: '2', effective_status: 'offline' }], 'home');
    });
    expect(result.current.get('1')).toBe(null);
    expect(result.current.get('2')).toMatchObject({ effective_status: 'offline' });
  });

  it('详情缺失/非法 id 安全失败关闭', () => {
    const { result } = renderHook(() => useContainerSnapshots());
    act(() => {
      result.current.remember({ key: '1', effective_status: 'online' });
      result.current.markUnavailable('1');
      result.current.markUnavailable(undefined);
      result.current.remember(null);
    });
    expect(result.current.get('1')).toBe(null);
    expect(result.current.get(undefined)).toBe(null);
  });
});
