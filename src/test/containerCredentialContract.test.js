import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const res = (body, { status = 200, url = 'http://localhost/api/test' } = {}) => ({
  ok: status >= 200 && status < 300,
  status,
  statusText: 'status',
  url,
  json: async () => body,
  text: async () => JSON.stringify(body),
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

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('container credential contract', () => {
  it('test_audit_reuse_no_duplicate_logs never puts passwords in requests and uses no-store', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [{ login_name: 'root', password: 'pw' }] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [{ login_name: 'alice', password: 'pw-a' }] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [{ login_name: 'alice', password: 'pw-b' }] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [
        { login_name: 'oldroot', password: 'pw-c' },
        { login_name: 'root', password: 'pw-root' },
      ] }))
      .mockResolvedValueOnce(res({ success: 1, accepted: true, credentials: [{ login_name: 'root', password: 'pw-d' }] }));
    vi.stubGlobal('fetch', fetchMock);
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await createContainer({ container: { NAME: 'c1' } });
    await addCollaborator({ user_id: 2, container_id: 12, role: 'ADMIN' });
    await resetContainerPassword({ container_id: 12, user_id: 2 });
    await updateRole({ container_id: 12, user_id: 2, updated_role: 'ROOT', transfer_root: true });
    await resurrectDeletedContainer(7);

    fetchMock.mock.calls.forEach(([, options]) => {
      const body = JSON.parse(options.body || '{}');
      expect(body).not.toHaveProperty('password');
      expect(body).not.toHaveProperty('root_password');
      expect(body).not.toHaveProperty('credentials');
      expect(body).not.toHaveProperty('login_name');
      expect(options.cache).toBe('no-store');
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('test_credential_unified_entrances wires all container credential surfaces to the shared modal', () => {
    const read = (file) => fs.readFileSync(path.resolve(process.cwd(), 'src', file), 'utf8');
    expect(read('pages/CreateContainer.jsx')).toContain('CredentialModal');
    expect(read('pages/ContainerDetailPage.jsx')).toContain('CredentialModal');
    expect(read('pages/Home.jsx')).toContain('CredentialModal');
    expect(read('pages/DeletedContainers.jsx')).toContain('CredentialModal');
    expect(read('components/EditUserModal.jsx')).toContain('onCredentialAccepted');
    expect(read('components/EditUserModal.jsx')).toContain('transfer_root: true');
    expect(read('pages/ContainerDetailPage.jsx')).toContain('transfer_root: false');
    expect(read('pages/ManageUser.jsx')).not.toContain('CredentialModal');
  });
});
