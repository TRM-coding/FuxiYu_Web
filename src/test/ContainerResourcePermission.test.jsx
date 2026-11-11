import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/user_api', () => ({
  getUserPermissions: vi.fn(),
}));

import { getUserPermissions } from '../api/user_api';
import { PermissionProvider, usePermission } from '../contexts/PermissionContext';
import { canResetContainerCredentials } from '../utils/containerActions';

const Consumer = () => {
  const { loaded, containerResourceUnrestricted, refresh, clear } = usePermission();
  return (
    <div>
      <span data-testid="loaded">{String(loaded)}</span>
      <span data-testid="container-resource">{String(containerResourceUnrestricted)}</span>
      <button type="button" onClick={() => refresh()}>refresh</button>
      <button type="button" onClick={() => clear()}>clear</button>
    </div>
  );
};

const renderProvider = () => render(
  <MemoryRouter initialEntries={['/index']}>
    <PermissionProvider><Consumer /></PermissionProvider>
  </MemoryRouter>,
);

const accounts = [{ user_id: 1, username: 'root_user', role: 'ROOT' }];

describe('container resource permission', () => {
  beforeEach(() => {
    getUserPermissions.mockReset();
    vi.stubGlobal('fetch', vi.fn());
  });

  it('test_auth_container_resource_capability maps the derived flag, defaults false, refreshes and clears', async () => {
    getUserPermissions.mockResolvedValueOnce({
      entities: ['container:operation', 'container:manage'],
      containerResourceUnrestricted: true,
      userId: 1,
      userName: 'root_user',
    }).mockResolvedValueOnce({
      entities: ['container:operation', 'container:manage'],
      containerResourceUnrestricted: false,
      userId: 2,
      userName: 'other',
    });
    renderProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('container-resource').textContent).toBe('true');
    await act(async () => { screen.getByRole('button', { name: 'refresh' }).click(); });
    expect(screen.getByTestId('container-resource').textContent).toBe('false');
    await act(async () => { screen.getByRole('button', { name: 'clear' }).click(); });
    expect(screen.getByTestId('container-resource').textContent).toBe('false');
  });

  it('test_auth_container_resource_capability normalizes API field and defaults missing to false', async () => {
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: 1,
        entities: ['container:manage'],
        container_resource_unrestricted: true,
        user_id: 1,
        username: 'u',
      }),
    });
    const { getUserPermissions: actualGetUserPermissions } = await vi.importActual('../api/user_api');
    expect((await actualGetUserPermissions()).containerResourceUnrestricted).toBe(true);

    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: 1, entities: ['container:manage'], user_id: 1, username: 'u' }),
    });
    expect((await actualGetUserPermissions()).containerResourceUnrestricted).toBe(false);
  });

  it('test_auth_container_resource_capability requires method, ROOT/resource and online guard for reset', () => {
    const root = { accounts, userId: 1, userName: 'root_user', hasOperationPermission: true, containerResourceUnrestricted: false, containerStatus: 'online' };
    expect(canResetContainerCredentials(root).visible).toBe(true);
    expect(canResetContainerCredentials(root).enabled).toBe(true);

    const noMethod = { ...root, hasOperationPermission: false };
    expect(canResetContainerCredentials(noMethod).visible).toBe(false);

    const wildcard = { accounts: [], userId: 9, userName: 'ops', hasOperationPermission: true, containerResourceUnrestricted: true, containerStatus: 'online' };
    expect(canResetContainerCredentials(wildcard).visible).toBe(true);

    const admin = { accounts: [{ user_id: 2, username: 'admin', role: 'ADMIN' }], userId: 2, userName: 'admin', hasOperationPermission: true, containerResourceUnrestricted: false, containerStatus: 'online' };
    expect(canResetContainerCredentials(admin).visible).toBe(false);

    const offline = { ...root, containerStatus: 'offline' };
    expect(canResetContainerCredentials(offline).visible).toBe(true);
    expect(canResetContainerCredentials(offline).enabled).toBe(false);
  });
});
