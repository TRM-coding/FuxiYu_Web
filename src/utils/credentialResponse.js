export const CREDENTIAL_ERROR_FALLBACK = '凭据响应异常，请稍后重试';

const SECRET_KEYS = new Set(['password', 'root_password', 'new_password', 'credentials']);

const collectSecrets = (value, out = [], key = '') => {
  if (value === null || value === undefined) return out;
  if (typeof value === 'string') {
    if (SECRET_KEYS.has(key) && value) out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach(item => collectSecrets(item, out, key));
    return out;
  }
  if (typeof value === 'object') {
    Object.entries(value).forEach(([childKey, childValue]) => {
      collectSecrets(childValue, out, childKey);
    });
  }
  return out;
};

const redact = (text, secrets) => {
  let result = String(text ?? '');
  secrets.filter(Boolean).forEach(secret => {
    if (secret) result = result.split(String(secret)).join('[redacted]');
  });
  return result.trim();
};

const safeMessage = (body, err, secrets) => {
  let raw = '';
  if (body && typeof body === 'object' && typeof body.message === 'string') {
    raw = body.message;
  } else if (body && Array.isArray(body.detail)) {
    const detailMessage = body.detail.find(item => typeof item?.msg === 'string')?.msg;
    if (detailMessage) raw = `请求参数不合法：${detailMessage}`;
  }
  if (!raw && typeof err?.message === 'string') raw = err.message;
  return redact(raw, secrets) || CREDENTIAL_ERROR_FALLBACK;
};

const makeError = (body, err = {}, fallback = CREDENTIAL_ERROR_FALLBACK) => {
  const secrets = collectSecrets(body);
  if (err?.credentials) collectSecrets(err.credentials, secrets, 'credentials');
  if (err?.password) secrets.push(err.password);
  if (err?.root_password) secrets.push(err.root_password);
  const result = new Error(safeMessage(body, err, secrets) || fallback);
  result.name = 'CredentialError';
  const status = Number(err?.status ?? body?.status);
  if (Number.isFinite(status)) result.status = status;
  const safeField = (value) => {
    if (typeof value !== 'string' || !value) return null;
    const cleaned = redact(value, secrets);
    if (!cleaned || cleaned.includes('[redacted]')) return null;
    return cleaned;
  };
  const route = safeField(err?.route || body?.route);
  if (route) result.route = route;
  const reason = safeField(body?.error_reason || err?.error_reason || body?.error);
  if (reason && /^[a-z0-9_:-]+$/i.test(reason)) result.error_reason = reason;
  else if (body && Array.isArray(body.detail)) result.error_reason = 'invalid_payload';
  const code = safeField(err?.code);
  if (code && /^[a-z0-9_:-]+$/i.test(code)) result.code = code;
  return result;
};

export const sanitizeCredentialError = (err, fallback = CREDENTIAL_ERROR_FALLBACK) => {
  const body = err && typeof err === 'object' ? err.body : null;
  return makeError(body, err || {}, fallback);
};

export const parseCredentialResponse = (body, options = {}) => {
  const { transferRoot, expectedCount, allowLegacyCreate = false } = options;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw makeError(null, {}, CREDENTIAL_ERROR_FALLBACK);
  }
  const hasCredentialEnvelope = Object.prototype.hasOwnProperty.call(body, 'accepted')
    || Object.prototype.hasOwnProperty.call(body, 'credentials');
  if (!hasCredentialEnvelope) {
    if (allowLegacyCreate && (body.success === 1 || body.success === true)) {
      return {
        ...body,
        accepted: false,
        credentials: [],
        message: typeof body.message === 'string' ? body.message : '',
      };
    }
    throw makeError(body);
  }
  if (body.accepted !== true) throw makeError(body);
  const credentials = body.credentials;
  if (!Array.isArray(credentials) || credentials.length === 0) throw makeError(body);
  const normalized = credentials.map(item => {
    const loginName = item?.login_name;
    const password = item?.password;
    if (typeof loginName !== 'string' || !loginName.trim()
      || typeof password !== 'string' || !password) {
      throw makeError(body);
    }
    return { ...item, login_name: loginName, password };
  });
  const countValid = transferRoot === true
    ? normalized.length >= 2
    : normalized.length === 1;
  if (!countValid || (expectedCount && normalized.length !== expectedCount)) {
    throw makeError(body);
  }
  return {
    ...body,
    accepted: true,
    credentials: normalized,
    message: typeof body.message === 'string' ? body.message : '',
  };
};

export default { parseCredentialResponse, sanitizeCredentialError, CREDENTIAL_ERROR_FALLBACK };
