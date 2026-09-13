import { describe, it, expect } from 'vitest';
import { routeErrorMap } from '../utils/showErrorModal';

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
  // 机器
  'duplicate_entry', 'create_failed', 'remove_failed', 'update_failed',
  'machine_not_found', 'machine_maintenance', 'machine_offline',
  // 有效状态机族（动作类先撞的是这一族，不是 machine_*）
  'container_host_maintenance', 'container_host_offline',
  'machine_permission_denied', 'node_endpoint_not_found',
  // 容器
  'container_exists', 'container_not_found', 'container_offline',
  'container_permission_denied', 'long_term_limit_reached',
  'delete_failed', 'start_failed', 'stop_failed', 'restart_failed',
  'add_collaborator_failed', 'remove_collaborator_failed', 'update_role_failed',
  'unpause_failed', 'get_detail_failed',
  // 公告
  'empty_targets', 'cannot_delete_system_template',
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
});
