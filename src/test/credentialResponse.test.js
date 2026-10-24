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
  it('test_non_root_credentials_require_exactly_one_complete_item', () => {
    expect(parseCredentialResponse(body(), { expectedCount: 1 }).credentials).toEqual([
      { login_name: 'root', password: 'pw-root' },
    ]);
    expect(parseCredentialResponse(body({
      credentials: [{ login_name: 'alice', password: 'pw-a' }],
    }), { expectedCount: 1 }).credentials[0].login_name).toBe('alice');
    expect(() => parseCredentialResponse(body({ credentials: [] }), { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [
        { login_name: 'a', password: 'pw-a' },
        { login_name: 'b', password: 'pw-b' },
      ],
    }), { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: 'root', password: '' }],
    }), { expectedCount: 1 })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: '', password: 'pw' }],
    }), { expectedCount: 1 })).toThrow();
  });

  it('test_root_handover_accepts_two_or_more_distinct_complete_credentials', () => {
    const two = [
      { login_name: 'root_user', password: 'pw-owner' },
      { login_name: 'root', password: 'pw-root' },
    ];
    expect(parseCredentialResponse(body({ credentials: two }), { rootHandover: true }).credentials).toEqual(two);
    const three = [...two, { login_name: 'legacy_root', password: 'pw-legacy' }];
    expect(parseCredentialResponse(body({ credentials: three }), { rootHandover: true }).credentials).toEqual(three);
  });

  it('test_root_handover_rejects_short_duplicate_or_incomplete_credentials', () => {
    const owner = { login_name: 'root_user', password: 'pw-owner' };
    const root = { login_name: 'root', password: 'pw-root' };
    expect(() => parseCredentialResponse(body({
      credentials: [{ login_name: 'root', password: 'pw-root' }],
    }), { rootHandover: true })).toThrow();
    expect(() => parseCredentialResponse(body({ credentials: [] }), { rootHandover: true })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [owner, { ...root, login_name: 'root_user' }],
    }), { rootHandover: true })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [owner, { ...root, password: 'pw-owner' }],
    }), { rootHandover: true })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [owner, { ...root, password: '' }],
    }), { rootHandover: true })).toThrow();
    expect(() => parseCredentialResponse(body({
      credentials: [owner, { ...root, login_name: ' ' }],
    }), { rootHandover: true })).toThrow();
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
