import React, { useState } from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const permissionState = vi.hoisted(() => ({ userId: 1, userName: 'root_user' }));

vi.mock('antd', async (importOriginal) => {
  const antd = await importOriginal();
  return { ...antd, message: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } };
});
vi.mock('../contexts/PermissionContext', () => ({
  usePermission: () => permissionState,
}));
vi.mock('../utils/showErrorModal', () => ({ default: vi.fn() }));
vi.mock('../api/container_api', () => ({
  addCollaborator: vi.fn(),
  removeCollaborator: vi.fn(),
  updateRole: vi.fn(),
}));

import { addCollaborator, updateRole } from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import { message } from 'antd';
import EditUserModal from '../components/EditUserModal';
import CredentialModal from '../components/CredentialModal';

const container = {
  key: 12,
  container_id: 12,
  container_name: 'train-a',
  accounts: [
    { user_id: 1, username: 'root_user', role: 'ROOT' },
    { user_id: 2, username: 'alice', role: 'COLLABORATOR' },
  ],
};
const usersList = [
  { id: 1, username: 'root_user', name: 'Root' },
  { id: 2, username: 'alice', name: 'Alice' },
  { id: 3, username: 'bob', name: 'Bob' },
];

const renderModal = (props = {}) => render(
  <EditUserModal
    visible
    container={container}
    usersList={usersList}
    onClose={vi.fn()}
    onBack={vi.fn()}
    {...props}
  />,
);

const HomeCredentialHarness = ({ onAccepted = vi.fn() }) => {
  const [editVisible, setEditVisible] = useState(true);
  const [credentialModal, setCredentialModal] = useState({ open: false, credentials: [] });
  const handleAccepted = (credentials) => {
    onAccepted(credentials);
    setCredentialModal({ open: true, credentials });
  };
  return (
    <>
      <EditUserModal
        visible={editVisible}
        container={container}
        usersList={usersList}
        onClose={() => setEditVisible(false)}
        onBack={() => setEditVisible(false)}
        onCredentialAccepted={handleAccepted}
      />
      <CredentialModal
        open={credentialModal.open}
        credentials={credentialModal.credentials}
        onClose={() => setCredentialModal({ open: false, credentials: [] })}
      />
    </>
  );
};

const selectAddUser = async () => {
  await screen.findByRole('dialog');
  fireEvent.mouseDown(document.querySelector('.eum-add-card .ant-select-selector'));
  await userEvent.click(await screen.findByText('Bob (@bob)'));
};

const clickOption = async (text) => {
  await waitFor(() => {
    expect([...document.querySelectorAll('.ant-select-item-option')].some(el => el.textContent.includes(text))).toBe(true);
  });
  const option = [...document.querySelectorAll('.ant-select-item-option')].find(el => el.textContent.includes(text));
  await userEvent.click(option);
};

beforeEach(() => {
  vi.clearAllMocks();
  addCollaborator.mockResolvedValue({ accepted: true, credentials: [{ login_name: 'bob', password: 'pw-bob' }] });
  updateRole.mockResolvedValue({
    accepted: true,
    credentials: [
      { login_name: 'root_user', password: 'pw-old' },
      { login_name: 'root', password: 'pw-root' },
    ],
  });
});

describe('Home/EditUserModal credential flows', () => {
  it('test_home_add_collaborator_credentials emits one credential for ADMIN/COLLABORATOR and does not insert optimistically', async () => {
    const onCredentialAccepted = vi.fn();
    renderModal({ onCredentialAccepted });
    await selectAddUser();
    await userEvent.click(screen.getByRole('button', { name: /添加用户/ }));
    await waitFor(() => expect(addCollaborator).toHaveBeenCalledWith({ user_id: 3, container_id: 12, role: 'COLLABORATOR' }));
    expect(onCredentialAccepted).toHaveBeenCalledWith([{ login_name: 'bob', password: 'pw-bob' }]);
    expect(message.success).toHaveBeenCalledWith('新增协作者请求已受理');
    expect(message.success).not.toHaveBeenCalledWith('用户已添加');
  });

  it('test_home_root_handover_sends_one_request_without_flag_and_receives_two_credentials', async () => {
    const onCredentialAccepted = vi.fn();
    renderModal({ onCredentialAccepted });
    await screen.findByRole('dialog');
    const combos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
    const combo = combos[combos.length - 1];
    fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
    await clickOption('超级管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
    expect(updateRole).toHaveBeenCalledWith({
      container_id: 12,
      user_id: 2,
      updated_role: 'ROOT',
    });
    expect(updateRole.mock.calls[0][0]).not.toHaveProperty('transfer_root');
    expect(updateRole).not.toHaveBeenCalledWith(expect.objectContaining({ updated_role: 'ADMIN' }));
    expect(onCredentialAccepted).toHaveBeenCalledWith([
      { login_name: 'root_user', password: 'pw-old' },
      { login_name: 'root', password: 'pw-root' },
    ]);
    expect(updateRole).toHaveBeenCalledTimes(1);
  });

  it('test_home_root_handover_preserves_n_plus_one_and_normal_role_swaps_password_free', async () => {
    const onCredentialAccepted = vi.fn();
    updateRole.mockResolvedValueOnce({
      accepted: true,
      credentials: [
        { login_name: 'root_user', password: 'pw-old' },
        { login_name: 'legacy_root', password: 'pw-legacy' },
        { login_name: 'root', password: 'pw-root' },
      ],
    });
    const { unmount } = renderModal({ onCredentialAccepted });
    await screen.findByRole('dialog');
    const combos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
    const combo = combos[combos.length - 1];
    fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
    await clickOption('超级管理员');
    await waitFor(() => expect(onCredentialAccepted).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ login_name: 'legacy_root' }),
    ])));
    expect(onCredentialAccepted.mock.calls[0][0]).toHaveLength(3);
    const aliceRow = screen.getByText('@alice').closest('.eum-list-item');
    expect(within(aliceRow).getAllByText('协作者').length).toBeGreaterThan(0);
    expect(within(aliceRow).queryByText('超级管理员')).toBeNull();
    unmount();

    updateRole.mockResolvedValueOnce({ success: 1, message: 'Role updated successfully' });
    renderModal({ onCredentialAccepted });
    await screen.findByRole('dialog');
    const normalCombos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
    const normalCombo = normalCombos[normalCombos.length - 1];
    fireEvent.mouseDown(normalCombo.closest('.ant-select')?.querySelector('.ant-select-selector') || normalCombo);
    await clickOption('管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledWith({ container_id: 12, user_id: 2, updated_role: 'ADMIN' }));
    expect(message.success).toHaveBeenCalledWith('角色已更新');
  });

  it('test_home_root_handover_modal_shows_owner_and_root_then_close_clears_passwords', async () => {
    localStorage.clear();
    sessionStorage.clear();
    const onAccepted = vi.fn();
    render(<HomeCredentialHarness onAccepted={onAccepted} />);
    await screen.findByRole('dialog');
    const combos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
    const combo = combos[combos.length - 1];
    fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
    await clickOption('超级管理员');
    await waitFor(() => expect(updateRole).toHaveBeenCalledTimes(1));
    expect(updateRole.mock.calls[0][0]).not.toHaveProperty('transfer_root');

    expect(await screen.findByText('重置后root_user的密码：')).toBeInTheDocument();
    expect(await screen.findByText('重置后root的密码：')).toBeInTheDocument();
    expect(onAccepted).toHaveBeenCalledWith([
      { login_name: 'root_user', password: 'pw-old' },
      { login_name: 'root', password: 'pw-root' },
    ]);

    await userEvent.click(screen.getByRole('button', { name: /关\s*闭/ }));
    expect(screen.queryByText('重置后root_user的密码：')).not.toBeInTheDocument();
    expect(screen.queryByText('重置后root的密码：')).not.toBeInTheDocument();
    expect(document.body.textContent).not.toContain('pw-old');
    expect(document.body.textContent).not.toContain('pw-root');
    expect(localStorage.length).toBe(0);
    expect(sessionStorage.length).toBe(0);
  });

  it('test_home_root_handover_failure_reports_without_pretending_success', async () => {
    updateRole.mockRejectedValueOnce(Object.assign(new Error('更新失败'), { status: 409 }));
    const onCredentialAccepted = vi.fn();
    renderModal({ onCredentialAccepted });
    await screen.findByRole('dialog');
    const combos = [...document.querySelectorAll('.eum-modal [role="combobox"]')].filter(el => !el.disabled);
    const combo = combos[combos.length - 1];
    fireEvent.mouseDown(combo.closest('.ant-select')?.querySelector('.ant-select-selector') || combo);
    await clickOption('超级管理员');
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(onCredentialAccepted).not.toHaveBeenCalled();
    expect(message.success).not.toHaveBeenCalledWith('ROOT 交接请求已受理');
  });

  it('test_home_add_collaborator_credentials reports add failure without credential callback', async () => {
    addCollaborator.mockRejectedValueOnce(Object.assign(new Error('添加失败'), { status: 400 }));
    const onCredentialAccepted = vi.fn();
    renderModal({ onCredentialAccepted });
    await selectAddUser();
    await userEvent.click(screen.getByRole('button', { name: /添加用户/ }));
    await waitFor(() => expect(showErrorModal).toHaveBeenCalled());
    expect(onCredentialAccepted).not.toHaveBeenCalled();
  });
});
