import { describe, it, expect, vi, beforeEach } from 'vitest';

const res = (body, { status = 200, url = 'http://localhost/api/test' } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status',
  url,
  json: async () => body,
  text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
});

vi.mock('../configs/backend_config', () => ({
  BACKEND_ORIGIN: 'http://localhost',
  REQUEST_TIMEOUT: 45000,
  MOUNT_USAGE_TIMEOUT: 10000,
  CREDENTIALS: 'include',
  API_ROUTES: {
    CONTAINERS_CREATE: '/api/containers/create_container',
    CONTAINERS_ADD_COLLABORATOR: '/api/containers/add_collaborator',
    CONTAINERS_RESET_PASSWORD: '/api/containers/reset_container_password',
    CONTAINERS_UPDATE_ROLE: '/api/containers/update_role',
    CONTAINERS_RESURRECT_DELETED: '/api/containers/resurrect_container',
  },
}));

import {
  createContainer,
  addCollaborator,
  resetContainerPassword,
  updateRole,
  resurrectDeletedContainer,
} from '../api/container_api';

const credential = (name = 'root', password = 'pw') => ({ login_name: name, password });

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('container credential API boundary', () => {
  it('test_guard_rejection_and_unknown_result parses accepted credentials, applies no-store and keeps safe errors', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res({ success: 1, accepted: true, message: 'sent', credentials: [credential()] }))
      .mockResolvedValueOnce(res({
        success: 0,
        error_reason: 'invalid_config',
        message: 'Requested shared_memory 8GB cannot exceed memory 4GB',
        credentials: [credential('root', 'secret-pw')],
      }, { status: 400 }))
      .mockResolvedValueOnce(res({ success: 0, error_reason: 'container_offline', message: 'offline' }, { status: 409 }));
    vi.stubGlobal('fetch', fetchMock);

    const created = await createContainer({ container: { NAME: 'c1' } });
    expect(created.credentials).toEqual([credential()]);
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');

    try {
      await createContainer({});
      throw new Error('expected failure');
    } catch (err) {
      expect(err).toMatchObject({ status: 400, error_reason: 'invalid_config' });
      expect(err.message).toContain('8GB');
      expect(JSON.stringify(err)).not.toContain('secret-pw');
      expect(err.body).toBeUndefined();
    }

    await expect(createContainer({})).rejects.toMatchObject({ status: 409, error_reason: 'container_offline' });
  });

  it('test_audit_reuse_no_duplicate_logs sends add/reset requests without passwords and parses one credential', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('alice')] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }));
    vi.stubGlobal('fetch', fetchMock);

    const added = await addCollaborator({ user_id: 2, container_id: 9, role: 'ADMIN' });
    expect(added.credentials[0].login_name).toBe('alice');
    const addBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(addBody).toEqual({ user_id: 2, container_id: 9, role: 'ADMIN' });
    expect(fetchMock.mock.calls[0][1].cache).toBe('no-store');

    const reset = await resetContainerPassword({ container_id: 9, user_id: 2 });
    expect(reset.credentials[0].login_name).toBe('root');
    const resetBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(resetBody).toEqual({ container_id: 9, user_id: 2 });
    expect(fetchMock.mock.calls[1][1].cache).toBe('no-store');
  });

  it('test_credential_shape_and_counts handles transfer_root false/true and non-root role changes', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('old'), credential('root')] }))
      .mockResolvedValueOnce(res({ success: 1, message: 'Role updated successfully' }));
    vi.stubGlobal('fetch', fetchMock);

    const detail = await updateRole({ container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: false });
    expect(detail.credentials).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).transfer_root).toBe(false);

    const home = await updateRole({ container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: true });
    expect(home.credentials).toHaveLength(2);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).transfer_root).toBe(true);

    const ordinary = await updateRole({ container_id: 9, user_id: 2, updated_role: 'ADMIN' });
    expect(ordinary.credentials).toBeUndefined();
    expect(JSON.parse(fetchMock.mock.calls[2][1].body).transfer_root).toBeUndefined();
  });

  it('test_add_and_role_requests_use_web_contract_without_secrets', async () => {
    const accepted = () => res({ success: 1, accepted: true, credentials: [credential('x')] });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(accepted())
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('old'), credential('root')] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }));
    vi.stubGlobal('fetch', fetchMock);

    await addCollaborator({ user_id: 2, container_id: 9 });
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      user_id: 2, container_id: 9, role: 'COLLABORATOR',
    });
    await addCollaborator({ user_id: 2, container_id: 9, role: 'ADMIN' });
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).toEqual({
      user_id: 2, container_id: 9, role: 'ADMIN',
    });
    await updateRole({ container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: false });
    expect(JSON.parse(fetchMock.mock.calls[2][1].body)).toEqual({
      container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: false,
    });
    await updateRole({ container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: true });
    expect(JSON.parse(fetchMock.mock.calls[3][1].body)).toEqual({
      container_id: 9, user_id: 2, updated_role: 'ROOT', transfer_root: true,
    });
    await resetContainerPassword({ container_id: 9, user_id: 2 });
    expect(JSON.parse(fetchMock.mock.calls[4][1].body)).toEqual({ container_id: 9, user_id: 2 });
    await createContainer({ container: { NAME: 'c1' }, user_id: 2 });
    expect(JSON.parse(fetchMock.mock.calls[5][1].body)).not.toHaveProperty('root_password');
  });

  it('test_422_detail_failure_is_safe_and_understandable', async () => {
    const secret = 'COLLABORATOR';
    const fetchMock = vi.fn().mockResolvedValue(res({
      detail: [{
        type: 'literal_error',
        loc: ['body', 'config', 'role'],
        msg: "Input should be 'admin' or 'collaborator'",
        input: secret,
        ctx: { expected: "'admin' or 'collaborator'" },
      }],
    }, { status: 422 }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await addCollaborator({ user_id: 2, container_id: 9, role: 'COLLABORATOR' });
      throw new Error('expected 422 failure');
    } catch (err) {
      expect(err).toMatchObject({ status: 422, error_reason: 'invalid_payload' });
      expect(err.message).toContain('请求参数不合法');
      expect(err.message).toContain('admin');
      expect(err.message).toContain('collaborator');
      const serialized = JSON.stringify(err);
      expect(serialized).not.toContain('COLLABORATOR');
      expect(serialized).not.toContain('literal_error');
      expect(serialized).not.toContain('"loc"');
      expect(serialized).not.toContain('"input"');
      expect(serialized).not.toContain('detail');
      expect(err.body).toBeUndefined();
      expect(err.credentials).toBeUndefined();
    }
  });

  it('test_deleted_restore_root_credential bypasses requires_choice and parses accepted root credential', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res({ success: 1, requires_choice: true, snapshot: {}, template: {} }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [credential('root')] }));
    vi.stubGlobal('fetch', fetchMock);

    const choice = await resurrectDeletedContainer(3);
    expect(choice.requires_choice).toBe(true);
    expect(choice.credentials).toBeUndefined();

    const restored = await resurrectDeletedContainer(3);
    expect(restored.credentials).toEqual([credential('root')]);
    expect(fetchMock.mock.calls[1][1].cache).toBe('no-store');
  });
});
