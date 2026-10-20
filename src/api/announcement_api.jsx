import { BACKEND_ORIGIN, REQUEST_TIMEOUT, CREDENTIALS, API_ROUTES } from '../configs/backend_config';
// abortAll 与 createController/unregisterController 同源，统一静态导入：
// 同一模块既静态又动态导入会让 Rollup 无法把它拆进独立 chunk（混合导入警告）。
// 语义：只有 401 发 'auth:expired' 信号，由 App 级监听器统一处置；403 是一般权限拒绝，
// 不清身份、不中断其它在途请求。
import { createController, unregisterController, abortAll } from '../utils/requestManager';

const createTimeoutController = (timeout) => {
  const controller = createController();
  const timer = setTimeout(() => {
    try { controller.abort(); } catch { /* 超时中止失败不改变请求错误路径 */ }
  }, timeout || REQUEST_TIMEOUT);
  return { controller, timer };
};

const ensureOk = async (res, action) => {
  if (!res.ok) {
    let body = null;
    try { body = await res.json(); } catch { body = await res.text().catch(() => null); }
    const text = body && typeof body === 'string' ? body : (body ? JSON.stringify(body) : null);
    const err = new Error(`${action} failed: ${res.status} ${text || res.statusText}`);
    err.status = res.status;
    err.route = res.url;
    err.body = body;
    if (res.status === 401) {
      try { abortAll('auth'); } catch { /* 广播失败不覆盖原始 401 */ }
      // 401 只发信号（abortAll → 'auth:expired'），统一由 App 级监听器处置：
      // 不碰 localStorage（本地身份已废除）/ cookie（HttpOnly，删不掉）/ 硬跳转（会打风暴）。
      // 403 是一般权限拒绝：不清身份、不中断其它请求，交给调用方展示拒绝原因。
    }
    throw err;
  }
  return res.json();
};

// ── 模板 CRUD ─────────────────────────────────────────────────────────

export const listTemplates = async ({ category, limit, offset } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_TEMPLATES, BACKEND_ORIGIN);
    if (category) url.searchParams.set('category', category);
    if (limit) url.searchParams.set('limit', String(limit));
    if (offset !== undefined && offset !== null) url.searchParams.set('offset', String(offset));
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List templates');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('List templates request timed out');
    throw err;
  }
};

export const createTemplate = async (data = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_TEMPLATES, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json'},
      body: JSON.stringify(data),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Create template');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Create template request timed out');
    throw err;
  }
};

export const getTemplate = async (templateId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_TEMPLATES}/${templateId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get template');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Get template request timed out');
    throw err;
  }
};

export const updateTemplate = async (templateId, data = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_TEMPLATES}/${templateId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Update template');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Update template request timed out');
    throw err;
  }
};

export const deleteTemplate = async (templateId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_TEMPLATES}/${templateId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'DELETE',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Delete template');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Delete template request timed out');
    throw err;
  }
};

// ── 目标解析 ──────────────────────────────────────────────────────────

export const resolveTargets = async (targets = [], timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_RESOLVE_TARGETS, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targets }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Resolve targets');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Resolve targets request timed out');
    throw err;
  }
};

// ── 公告（已发送）查询与操作 ──────────────────────────────────────────

export const listAnnouncements = async ({ status, limit, offset } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_LIST, BACKEND_ORIGIN);
    if (status && status.length) status.forEach(s => url.searchParams.append('status', s));
    if (limit) url.searchParams.set('limit', String(limit));
    if (offset) url.searchParams.set('offset', String(offset));
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List announcements');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('List announcements request timed out');
    throw err;
  }
};

/**
 * 按 id 查公告进度（批量发送/重发的前端轮询用）。
 *
 * 刻意不用 listAnnouncements：那要拉列表再本地过滤（只覆盖前 N 条、还会把正文一起
 * 拖下来）。进度轮询只认自己那一批 id，后端也回轻量出参（2026-09）。
 */
export const getAnnouncementsStatus = async (announcementIds = [], timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_STATUS, BACKEND_ORIGIN);
    url.searchParams.set('ids', announcementIds.join(','));
    const res = await fetch(url.toString(), {
      method: 'GET',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get announcements status');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Get announcements status request timed out');
    throw err;
  }
};

export const getAnnouncement = async (announcementId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/${announcementId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'GET',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get announcement');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Get announcement request timed out');
    throw err;
  }
};

export const resendAnnouncement = async (announcementId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/${announcementId}/resend`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Resend announcement');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Resend announcement request timed out');
    throw err;
  }
};

export const copyAnnouncementAsDraft = async (announcementId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/${announcementId}/copy-as-draft`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Copy as draft');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Copy as draft request timed out');
    throw err;
  }
};

export const convertToTemplate = async (announcementId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/${announcementId}/convert-to-template`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Convert to template');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Convert to template request timed out');
    throw err;
  }
};

export const deleteAnnouncement = async (announcementId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/${announcementId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'DELETE',
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Delete announcement');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Delete announcement request timed out');
    throw err;
  }
};

export const batchDeleteAnnouncements = async ({ announcement_ids } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_BASE}/batch-delete`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ announcement_ids }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Batch delete announcements');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Batch delete announcements request timed out');
    throw err;
  }
};

// ── 草稿 CRUD ─────────────────────────────────────────────────────────

export const listDrafts = async ({ limit, offset } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_DRAFTS, BACKEND_ORIGIN);
    if (limit) url.searchParams.set('limit', String(limit));
    if (offset) url.searchParams.set('offset', String(offset));
    const res = await fetch(url.toString(), {
      method: 'GET',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'List drafts');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('List drafts request timed out');
    throw err;
  }
};

export const saveDraft = async (data = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  // 草稿与模板没有持久关联（Q06/Q07）：模板选择只是编辑器侧复制初值。这里在调用契约上
  // 再兜一层——即使某个调用方仍带着 template_id，也不会被送进保存请求。
  const payload = { ...data };
  delete payload.template_id;
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_DRAFTS_SAVE, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Save draft');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Save draft request timed out');
    throw err;
  }
};

export const getDraft = async (draftId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_DRAFTS}/${draftId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'GET',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Get draft');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Get draft request timed out');
    throw err;
  }
};

export const deleteDraft = async (draftId, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(`${API_ROUTES.ANNOUNCEMENTS_DRAFTS}/${draftId}`, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'DELETE',

      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Delete draft');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Delete draft request timed out');
    throw err;
  }
};

export const batchSendDrafts = async ({ draft_ids, targets } = {}, timeout = null) => {
  const { controller, timer } = createTimeoutController(timeout);
  try {
    const url = new URL(API_ROUTES.ANNOUNCEMENTS_DRAFTS_BATCH_SEND, BACKEND_ORIGIN).toString();
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft_ids, targets }),
      signal: controller.signal,
      credentials: CREDENTIALS,
    });
    clearTimeout(timer);
    const result = await ensureOk(res, 'Batch send drafts');
    unregisterController(controller);
    return result;
  } catch (err) {
    clearTimeout(timer);
    try { unregisterController(controller); } catch { /* 控制器可能已由 abort 清理，重复注销失败可忽略 */ }
    if (err.name === 'AbortError') throw new Error('Batch send drafts request timed out');
    throw err;
  }
};
