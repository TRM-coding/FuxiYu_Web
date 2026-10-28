import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { act, waitFor } from '@testing-library/react';
import showErrorModal, { routeErrorMap } from '../utils/showErrorModal';
import { toErrorModalInput } from '../utils/errorModalInput';

/** 后端会实际发出的 error_reason 全集（与 Ctrl 代码枚举对齐，改动后端需同步此表） */
const BACKEND_ERROR_REASONS = [
  // 鉴权/通用
  'invalid_token', 'insufficient_permission', 'invalid_payload', 'invalid_config',
  'missing_fields', 'missing_field', 'missing_email', 'invalid_fields',
  'unexpected_response', 'NODE_error', 'not_found', 'internal_error',
  // 用户
  'username_exists', 'email_exists', 'no_none_ascii', 'invalid_username',
  'user_not_found', 'password_incorrect', 'old_password_incorrect',
  'wild_container', 'missing_user_id', 'list_failed',
  // 注册与验证码
  'registration_code_required', 'registration_code_invalid',
  'mail_send_failed', 'email_domain_not_allowed', 'code_creation_failed',
  // 机器
  'duplicate_entry', 'create_failed', 'remove_failed', 'update_failed',
  'machine_not_found', 'machine_maintenance', 'machine_offline',
  // 有效状态机族（动作类先撞的是这一族，不是 machine_*）
  'container_host_maintenance', 'container_host_offline',
  'machine_permission_denied', 'node_endpoint_not_found',
  // 容器
  'container_exists', 'container_not_found', 'container_offline',
  'container_paused', 'container_failed', 'container_busy', 'container_status_unknown',
  'container_permission_denied', 'long_term_limit_reached',
  'delete_failed', 'start_failed', 'stop_failed', 'restart_failed',
  'add_collaborator_failed', 'remove_collaborator_failed', 'update_role_failed',
  'unpause_failed', 'get_detail_failed',
  // 恢复（复活软删容器）
  'data_not_recoverable',
  // 公告
  'empty_targets', 'cannot_delete_system_template',
  // 设置
  'invalid_setting',
  // 镜像
  'image_not_found', 'invalid_status', 'invalid_valid_range',
  'set_valid_range_failed', 'not_custom_range', 'unknown_user',
  'set_visible_users_failed',
];

/**
 * Q37 定向规格表：Route/error_reason → 中文。
 * 四张表合并后逐行参数化核对，页面只使用 Ctrl 现有 reason，不新增协议。
 */
const SPEC_ROUTE_REASON_TABLE = [
  // Register：/register 8 项
  { route: '/register', reason: 'username_exists', text: '用户名已存在' },
  { route: '/register', reason: 'email_exists', text: '邮箱已存在' },
  { route: '/register', reason: 'invalid_username', text: '用户名仅允许英文、数字和下划线' },
  { route: '/register', reason: 'no_none_ascii', text: '禁止非ASCII字符（请勿输入中文）' },
  { route: '/register', reason: 'registration_code_required', text: '请填写注册验证码' },
  { route: '/register', reason: 'registration_code_invalid', text: '注册验证码无效或已过期' },
  { route: '/register', reason: 'mail_send_failed', text: '验证邮件发送失败' },
  { route: '/register', reason: 'email_domain_not_allowed', text: '该邮箱域名不允许注册' },
  // Register：/request_register_code 4 项
  { route: '/request_register_code', reason: 'missing_email', text: '请输入邮箱' },
  { route: '/request_register_code', reason: 'email_domain_not_allowed', text: '该邮箱域名不允许注册' },
  { route: '/request_register_code', reason: 'mail_send_failed', text: '验证邮件发送失败' },
  { route: '/request_register_code', reason: 'code_creation_failed', text: '验证码生成失败，请稍后重试' },
  // Settings：2 项
  { route: '/settings', reason: 'invalid_setting', text: '设置项不合法' },
  { route: '/settings', reason: 'update_failed', text: '保存设置失败' },
  // TemplateManager：4 项
  { route: '/announcements/templates', reason: 'duplicate_entry', text: '模板名称已存在' },
  { route: '/announcements/templates', reason: 'missing_field', text: '缺少模板必填字段' },
  { route: '/announcements/templates', reason: 'not_found', text: '模板不存在' },
  { route: '/announcements/templates', reason: 'cannot_delete_system_template', text: '系统模板不可删除' },
  // CreateImage：15 项
  { route: '/images/create_image', reason: 'duplicate_entry', text: '镜像名称已存在' },
  { route: '/images/create_image', reason: 'invalid_status', text: '镜像状态不合法' },
  { route: '/images/create_image', reason: 'create_failed', text: '创建镜像失败' },
  { route: '/images/update_image', reason: 'duplicate_entry', text: '镜像名称已存在' },
  { route: '/images/update_image', reason: 'invalid_status', text: '镜像状态不合法' },
  { route: '/images/update_image', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/update_image', reason: 'update_failed', text: '更新镜像失败' },
  { route: '/images/delete_image', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_valid_range', reason: 'invalid_valid_range', text: '镜像可见范围不合法' },
  { route: '/images/set_image_valid_range', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_valid_range', reason: 'set_valid_range_failed', text: '设置镜像可见范围失败' },
  { route: '/images/set_image_visible_users', reason: 'not_custom_range', text: '只有自定义可见范围才能设置用户名单' },
  { route: '/images/set_image_visible_users', reason: 'unknown_user', text: '用户名单中存在不存在的用户' },
  { route: '/images/set_image_visible_users', reason: 'image_not_found', text: '镜像不存在' },
  { route: '/images/set_image_visible_users', reason: 'set_visible_users_failed', text: '保存镜像可见用户失败' },
];

/** 汇总 routeErrorMap 里所有映射过的 error_reason */
function collectMappedReasons() {
  const seen = new Set();
  for (const key of Object.keys(routeErrorMap)) {
    const map = routeErrorMap[key] || {};
    for (const reason of Object.keys(map)) seen.add(reason);
  }
  return seen;
}

describe('showErrorModal 错误映射守护', () => {
  it('后端 error_reason 全集都有中文映射（防止裸英文漏给用户）', () => {
    const mapped = collectMappedReasons();
    const missing = BACKEND_ERROR_REASONS.filter(r => !mapped.has(r));
    expect(missing).toEqual([]);
  });
});

describe('Q37 规格 route/error_reason 全表', () => {
  it.each(SPEC_ROUTE_REASON_TABLE)('$route → $reason 显示「$text」', ({ route, reason, text }) => {
    expect(routeErrorMap[route]?.[reason]).toBe(text);
  });

  it('表内每个 route 都真实存在，不靠跨路由兜底借文案', () => {
    const missingRoutes = [...new Set(SPEC_ROUTE_REASON_TABLE.map(row => row.route))]
      .filter(route => !routeErrorMap[route]);
    expect(missingRoutes).toEqual([]);
  });
});

// 表值存在不等于弹窗真的命中；每条 route 取一个代表原因走真实 showErrorModal。
const Q37_POPUP_SAMPLES = [
  { route: '/register', reason: 'registration_code_invalid', text: '注册验证码无效或已过期' },
  { route: '/request_register_code', reason: 'code_creation_failed', text: '验证码生成失败，请稍后重试' },
  { route: '/settings', reason: 'invalid_setting', text: '设置项不合法' },
  { route: '/announcements/templates', reason: 'duplicate_entry', text: '模板名称已存在' },
  { route: '/images/create_image', reason: 'duplicate_entry', text: '镜像名称已存在' },
];

const UPSTREAM_POPUP_SAMPLES = [
  { reason: 'upstream_unavailable', status: 502, text: '后端服务暂时无法连接，请稍后重试。' },
  { reason: 'upstream_timeout', status: 504, text: '后端响应超时，请稍后重试。' },
  { reason: 'upstream_tls_untrusted', status: 502, text: '后端安全连接验证失败，请联系管理员。' },
  { reason: 'upstream_error', status: 502, text: '后端代理请求失败，请稍后重试。' },
].flatMap(sample => ['/login', '/containers/get_container_detail_information'].map(route => ({ ...sample, route })));

describe('Q37 真实弹窗按 route/reason 显示中文', () => {
  const originalGetComputedStyle = window.getComputedStyle;

  const visibleDialogs = () => Array.from(document.querySelectorAll('.ant-modal'))
    .filter(el => el.style.display !== 'none');

  const dialogText = () => {
    const dialogs = visibleDialogs();
    if (!dialogs.length) throw new Error('当前没有可见的错误弹窗');
    return dialogs[dialogs.length - 1].textContent || '';
  };

  const closeDialogs = async () => {
    for (let i = 0; i < 5; i += 1) {
      const buttons = Array.from(document.querySelectorAll('.ant-modal button'))
        .filter(btn => (btn.textContent || '').replace(/\s/g, '') === '好的');
      if (!buttons.length) break;
      await act(async () => {
        buttons[buttons.length - 1].click();
      });
    }
    await waitFor(() => expect(visibleDialogs()).toHaveLength(0));
  };

  beforeAll(() => {
    window.getComputedStyle = (el) => originalGetComputedStyle.call(window, el);
  });

  afterAll(() => {
    window.getComputedStyle = originalGetComputedStyle;
  });

  afterEach(closeDialogs);

  it.each(Q37_POPUP_SAMPLES)('$route → $reason', async ({ route, reason, text }) => {
    const before = visibleDialogs().length;
    await act(async () => {
      showErrorModal({
        message: { success: 0, error_reason: reason },
        status: 400,
        route: `https://ctrl/api${route}`,
      });
    });
    await waitFor(() => expect(visibleDialogs().length).toBeGreaterThan(before));
    expect(dialogText()).toContain(text);
    expect(dialogText()).not.toContain('未收录的错误原因');
  });

  it.each(UPSTREAM_POPUP_SAMPLES)('代理 $route → $reason 显示中文', async ({ route, reason, status, text }) => {
    await act(async () => {
      showErrorModal(toErrorModalInput({
        body: { error: reason },
        message: `request failed: ${status} ${JSON.stringify({ error: reason })}`,
        status,
        route,
      }));
    });
    await waitFor(() => expect(dialogText()).toContain(text));
    expect(dialogText()).not.toContain('未收录的错误原因');
    expect(dialogText()).not.toContain(reason);
    expect(dialogText()).not.toContain('failed:');
  });

  it.each(['body', 'message.body'])('代理错误直接传入 $0 时也显示中文', async (shape) => {
    const message = 'request failed: 502 {"error":"upstream_unavailable"}';
    const body = { error: 'upstream_unavailable' };
    const input = shape === 'body'
      ? { message, body, status: 502 }
      : { message: { message, body }, status: 502 };
    await act(async () => { showErrorModal(input); });
    await waitFor(() => expect(dialogText()).toContain('后端服务暂时无法连接，请稍后重试。'));
    expect(dialogText()).not.toContain('upstream_unavailable');
    expect(dialogText()).not.toContain('failed:');
  });

  it('代理原因已有中文映射时仍保留具体错误信息', async () => {
    await act(async () => {
      showErrorModal(toErrorModalInput({
        body: { error: 'upstream_unavailable', message: '请求在维护窗口暂停，请于 22:30 后重试。' },
        status: 502,
        route: '/announcements',
      }));
    });
    await waitFor(() => expect(dialogText()).toContain('请求在维护窗口暂停，请于 22:30 后重试。'));
    expect(dialogText()).toContain('后端服务暂时无法连接，请稍后重试。');
    expect(dialogText()).not.toContain('未收录的错误原因');
  });
});

/**
 * 会先撞「机器作用域」守卫的容器路由：创建走机器准入（machine_*），
 * 动作类走有效状态机（container_host_*）。两族都必须在**本路由**上映射，
 * 否则会退到全局兜底去借别的路由的措辞（按 Object.keys 顺序取首个命中者，很脆）。
 */
const MACHINE_SCOPE_ROUTES = [
  '/containers/create_container',
  '/containers/delete_container',
  '/containers/add_collaborator',
  '/containers/remove_collaborator',
  '/containers/update_role',
  '/containers/unpause_container',
];

describe('机器作用域族按路由映射', () => {
  it('容器路由自带该族文案，不依赖全局兜底', () => {
    const missing = [];
    for (const route of MACHINE_SCOPE_ROUTES) {
      const map = routeErrorMap[route] || {};
      for (const reason of ['machine_maintenance', 'machine_offline', 'machine_not_found',
                            'container_host_maintenance', 'container_host_offline']) {
        if (!map[reason]) missing.push(`${route} → ${reason}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it('有效状态机族不再退化成后端原文', () => {
    // 这两条曾经在全表里映射为 0 处，用户看到的是 "MACHINE remove aborted: machine is maintenance"
    const mapped = collectMappedReasons();
    expect(mapped.has('container_host_maintenance')).toBe(true);
    expect(mapped.has('container_host_offline')).toBe(true);
  });

  it('协作者三路由自带离线/冻结/异常/处理中/状态未知文案', () => {
    const missing = [];
    for (const route of [
      '/containers/add_collaborator',
      '/containers/remove_collaborator',
      '/containers/update_role',
    ]) {
      const map = routeErrorMap[route] || {};
      for (const reason of [
        'container_offline',
        'container_paused',
        'container_failed',
        'container_busy',
        'container_status_unknown',
      ]) {
        if (!map[reason]) missing.push(`${route} → ${reason}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

describe('恢复路由自带失败文案', () => {
  it('长期配额 / 快照不可恢复 / 机器作用域都在本路由上映射', () => {
    const map = routeErrorMap['/containers/resurrect_container'] || {};
    for (const reason of ['long_term_limit_reached', 'data_not_recoverable',
                          'machine_maintenance', 'machine_offline', 'machine_not_found',
                          'not_found', 'invalid_payload', 'container_exists']) {
      expect(map[reason], `resurrect → ${reason}`).toBeTruthy();
    }
  });
});
