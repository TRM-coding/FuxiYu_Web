import { describe, it, expect } from 'vitest';
import { parseCredentialResponse, sanitizeCredentialError } from '../utils/credentialResponse';

const body = (overrides = {}) => ({
  success: 1,
  accepted: true,
  message: 'ok',
  credentials: [{ login_name: 'root', password: 'pw-root' }],
  ...overrides,
});

describe('credentialResponse', () => {
  it('test_credential_shape_and_counts accepts 1 for create/add/reset and 1 root for transfer_root false', () => {
    expect(parseCredentialResponse(body(), { expectedCount: 1 }).credentials).toEqual([
      { login_name: 'root', password: 'pw-root' },
    ]);
    expect(parseCredentialResponse(body({
      credentials: [{ login_name: 'alice', password: 'pw-a' }],
    }), { expectedCount: 1 }).credentials[0].login_name).toBe('alice');
    expect(parseCredentialResponse(body(), { transferRoot: false }).credentials).toHaveLength(1);
    expect(parseCredentialResponse(body({
      credentials: [
        { login_name: 'oldroot', password: 'pw-old' },
        { login_name: 'root', password: 'pw-new' },
      ],
    }), { transferRoot: true }).credentials).toHaveLength(2);
    expect(parseCredentialResponse(body({
      credentials: [
        { login_name: 'old1', password: 'pw-1' },
        { login_name: 'old2', password: 'pw-2' },
        { login_name: 'root', password: 'pw-3' },
      ],
    }), { transferRoot: true }).credentials).toHaveLength(3);
  });

  it('test_credential_shape_and_counts rejects wrong counts and missing fields', () => {
    expect(() => parseCredentialResponse(body({ credentials: [] }), { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [
        { login_name: 'root', password: 'pw' },
        { login_name: 'other', password: 'pw2' },
      ],
    }), { transferRoot: false })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: 'root', password: 'pw' }],
    }), { transferRoot: true })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: 'root', password: '' }],
    }), { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: '', password: 'pw' }],
    }), { expectedCount: 1 })).toThrow();
  });

  it('test_credential_legacy_and_empty keeps legacy create and rejects missing acceptance for new flows', () => {
    const legacy = parseCredentialResponse({ success: 1, message: 'sent' }, { allowLegacyCreate: true });
    expect(legacy).toMatchObject({ accepted: false, credentials: [], message: 'sent' });
    expect(() => parseCredentialResponse({ success: 1, message: 'sent' })).toThrow();
  });

  it('test_credential_error_sanitization preserves safe message and strips secret/body', () => {
    const err = {
      status: 400,
      route: '/api/containers/create_container',
      body: {
        success: 0,
        error_reason: 'invalid_config',
        message: 'Requested shared_memory 8GB cannot exceed memory 4GB',
        credentials: [{ login_name: 'root', password: 'pw-secret' }],
        root_password: 'pw-root',
      },
    };
    const safe = sanitizeCredentialError(err);
    expect(safe.status).toBe(400);
    expect(safe.route).toBe('/api/containers/create_container');
    expect(safe.error_reason).toBe('invalid_config');
    expect(safe.message).toContain('8GB');
    expect(safe.message).toContain('4GB');
    expect(safe.message).not.toContain('pw-secret');
    expect(safe.message).not.toContain('pw-root');
    expect(safe.body).toBeUndefined();
    expect(safe.credentials).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain('pw-secret');
  });

  it('test_credential_error_sanitization redacts secret values copied into error_reason, code or route', () => {
    const secret = 'pw-top-secret';
    const safe = sanitizeCredentialError({
      status: 400,
      route: `/api/containers/create_container?token=${secret}`,
      code: secret,
      body: {
        success: 0,
        error_reason: secret,
        credentials: [{ login_name: 'root', password: secret }],
      },
    });
    expect(safe.error_reason).toBeUndefined();
    expect(safe.code).toBeUndefined();
    expect(safe.route).toBeUndefined();
    expect(JSON.stringify(safe)).not.toContain(secret);
  });
});
