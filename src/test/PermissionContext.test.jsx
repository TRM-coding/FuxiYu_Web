import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { PermissionProvider, usePermission } from '../contexts/PermissionContext';
import * as userApi from '../api/user_api';

// mock 数据链的源头:getUserPermissions
vi.spyOn(userApi, 'getUserPermissions');

const Consumer = () => {
  const { entities, loaded, hasPermission } = usePermission();
  return (
    <div>
      <span data-testid="loaded">{String(loaded)}</span>
      <span data-testid="machine-manage">{String(hasPermission('machine:manage'))}</span>
      <span data-testid="container-view">{String(hasPermission('container:view'))}</span>
      <span data-testid="entities">{entities.join(',')}</span>
    </div>
  );
};

const renderWithProvider = () =>
  render(
    <MemoryRouter>
      <PermissionProvider>
        <Consumer />
      </PermissionProvider>
    </MemoryRouter>
  );

describe('PermissionContext 数据链(API → Provider → hasPermission)', () => {
  beforeEach(() => {
    userApi.getUserPermissions.mockReset();
  });

  it('加载完成前 loaded=false(不误判无权限)', () => {
    userApi.getUserPermissions.mockImplementation(() => new Promise(() => {})); // 永不返回
    renderWithProvider();
    expect(screen.getByTestId('loaded').textContent).toBe('false');
    expect(screen.getByTestId('machine-manage').textContent).toBe('false');
  });

  it('API 返回权限集后 hasPermission 正确且 loaded=true', async () => {
    userApi.getUserPermissions.mockResolvedValue(['machine:view', 'container:operation', 'machine:manage']);
    renderWithProvider();
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('machine-manage').textContent).toBe('true');
    expect(screen.getByTestId('container-view').textContent).toBe('false');
    expect(screen.getByTestId('entities').textContent).toBe('machine:view,container:operation,machine:manage');
  });
});
