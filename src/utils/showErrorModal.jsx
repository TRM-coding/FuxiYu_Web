import React from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmModal from '../components/ConfirmModal';

const hideExistingModals = () => {
  const modals = Array.from(document.querySelectorAll('.ant-modal'));
  const masks = Array.from(document.querySelectorAll('.ant-modal-mask'));
  modals.forEach((el, i) => {
    el.dataset._prevDisplay = el.style.display || '';
    el.style.display = 'none';
  });
  masks.forEach((el) => {
    el.dataset._prevDisplay = el.style.display || '';
    el.style.display = 'none';
  });
  return { modals, masks };
};

const restoreModals = () => {
  const modals = Array.from(document.querySelectorAll('.ant-modal'));
  const masks = Array.from(document.querySelectorAll('.ant-modal-mask'));
  modals.forEach((el) => {
    if (el.dataset._prevDisplay !== undefined) {
      el.style.display = el.dataset._prevDisplay;
      delete el.dataset._prevDisplay;
    }
  });
  masks.forEach((el) => {
    if (el.dataset._prevDisplay !== undefined) {
      el.style.display = el.dataset._prevDisplay;
      delete el.dataset._prevDisplay;
    }
  });
};

const showErrorModal = ({ title = '错误', message = '发生错误', status, route } = {}) => {
  if (typeof document === 'undefined') return Promise.resolve({ confirmed: false, status });
  // Determine HTTP status: prefer explicit, otherwise try to parse from message text
  let code = Number(status);
  // 这里之后的两个Block都是在做json的解析
  let displayMessage = '';
  let extraDetails = null;
  // helper: extract balanced JSON object substring from a string, return null if not found
  const extractJsonFromString = (s) => {
    if (!s || typeof s !== 'string') return null;
    const first = s.indexOf('{');
    if (first === -1) return null;
    let depth = 0;
    for (let i = first; i < s.length; i++) {
      const ch = s[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      if (depth === 0) {
        const candidate = s.slice(first, i + 1);
        try {
          return JSON.parse(candidate);
        } catch (e) {
          return null;
        }
      }
    }
    return null;
  };

  try {
    if (typeof message === 'string') {
      // try to robustly extract a JSON object substring like '... {"a":1} ...'
      const parsedCandidate = extractJsonFromString(message);
      if (parsedCandidate && typeof parsedCandidate === 'object') {
        message = parsedCandidate;
      } else {
        displayMessage = String(message || '发生错误');
      }
    }

    if (message && typeof message === 'object') {
      // communication format: { success: 0, message: '...' }
      if (Object.prototype.hasOwnProperty.call(message, 'message')) {
        displayMessage = String(message.message);
      }
      // some libs put payload under `body` or `data`
      else if (message.body && typeof message.body === 'object' && message.body.message) {
        displayMessage = String(message.body.message);
      } else if (message.data && typeof message.data === 'object' && message.data.message) {
        displayMessage = String(message.data.message);
      }

      // extract status if present
      if (!Number.isFinite(code)) {
        if (Number.isFinite(Number(message.status))) code = Number(message.status);
        else if (message.response && Number.isFinite(Number(message.response.status))) code = Number(message.response.status);
      }

      // keep a copy of other useful fields to show
      const cloned = { ...message };
      if (cloned.message) delete cloned.message;
      if (cloned.success !== undefined) delete cloned.success;
      if (cloned.status !== undefined) delete cloned.status;
      //if (Object.keys(cloned).length > 0) extraDetails = cloned;
    }
  } catch (e) {
    displayMessage = typeof message === 'string' ? message : '发生错误';
  }

  // If we still don't have a readable message, try to extract a three-digit code from the text
  if (!displayMessage) {
    try {
      const m = String(message || '');
      const found = m.match(/\b(\d{3})\b/);
      if (found) {
        code = Number(found[1]);
        displayMessage = `${found[1]} 错误`;
      }
    } catch (e) {
      // ignore
    }
  }
  displayMessage = displayMessage || '发生错误';
  // prefer parsed numeric `code` (extracted earlier) for hint selection
  const statusCode = Number.isFinite(Number(code)) ? Number(code) : Number(status);

  // 尝试依赖路由和错误原因来提供更友好的错误提示
  let routePath = '';
  try {
    if (route) {
      routePath = (new URL(route, window.location.origin)).pathname;
    } else if (message && message.response && message.response.url) {
      routePath = (new URL(message.response.url, window.location.origin)).pathname;
    }
  } catch (e) {
    routePath = '';
  }

  let errorReason = null;
  if (message && typeof message === 'object') {
    errorReason = message.error_reason || message.error || (message.body && message.body.error_reason) || (message.data && message.data.error_reason) || null;
  }

  const routeErrorMap = {
    // 用户相关
    '/register': { username_exists: '用户名已存在', email_exists: '邮箱已存在', no_none_ascii: '禁止非ASCII字符（请勿输入中文）', invalid_username: '用户名仅允许英文、数字和下划线' },
    '/login': { user_not_found: '用户不存在', password_incorrect: '密码错误' },
    '/users/change_password': { old_password_incorrect: '旧密码不正确', no_none_ascii: '禁止非ASCII字符（请勿输入中文）' },
    '/users/delete_user': { wild_container: '存在无主容器，无法删除用户', missing_user_id: '缺少 user_id' },
    '/users/get_user_detail_information': { user_not_found: '用户不存在', missing_user_id: '缺少 user_id' },
    '/users/list_all_user_bref_information': { list_failed: '获取用户列表失败' },
    '/users/update_user': { missing_fields: '缺少更新字段', user_not_found: '用户不存在', no_none_ascii: '禁止非ASCII字符（请勿输入中文）', invalid_username: '用户名仅允许英文、数字和下划线' },
    '/users/reset_password': { user_not_found: '用户不存在', missing_user_id: '缺少 user_id' },

    // 容器相关
    '/containers/create_container': { duplicate_entry: '创建容器失败：重复项', invalid_payload: '无效的容器数据', invalid_config: '容器配置无效或超出宿主机上限', create_failed: '创建容器失败' },
    '/containers/delete_container': { delete_failed: '删除容器失败', not_found: '容器不存在' },
    '/containers/add_collaborator': { add_collaborator_failed: '添加协作者失败', container_offline: '容器未在线，无法添加协作者' },
    '/containers/remove_collaborator': { remove_collaborator_failed: '移除协作者失败', container_offline: '容器未在线，无法移除协作者' },
    '/containers/update_role': { update_role_failed: '更新角色失败', container_offline: '容器未在线，无法更新角色' },
    '/containers/get_container_detail_information': { get_detail_failed: '获取容器详情失败' },
    '/containers/list_all_container_bref_information': { list_failed: '获取容器列表失败' },
    '/containers/set_long_term_container': {
      container_not_found: '容器不存在',
      machine_permission_denied: '权限不足，无法操作该机器上的容器',
      container_permission_denied: '只有容器所有者可以设置长期容器',
      long_term_limit_reached: '已达到长期容器上限',
      invalid_payload: '长期容器设置参数无效',
    },

    // 机器相关
    '/machines/add_machine': { duplicate_entry: '机器已存在', internal_error: '内部错误，添加失败', create_failed: '添加机器失败' },
    '/machines/remove_machine': { remove_failed: '删除机器失败' },
    '/machines/update_machine': { update_failed: '更新机器失败', machine_not_found: '机器不存在', machine_maintenance: '机器正在维护中', machine_offline: '机器离线' },
    '/machines/get_detail_information': { machine_not_found: '机器不存在', machine_offline: '机器离线', machine_maintenance: '机器正在维护中' },
    '/machines/list_all_machine_bref_information': { list_failed: '获取机器列表失败', machine_offline: '机器离线' },

    // 通用/鉴权
    '': { invalid_token: '身份验证失败，请重新登录', insufficient_permission: '权限不足', unexpected_response: '远端返回意外响应', NODE_error: '节点错误' },
    '*': {
      create_failed: '创建失败',
      list_failed: '获取列表失败',
      duplicate_entry: '重复项导致失败',
      internal_error: '服务器内部错误',
      start_failed: '启动失败',
      stop_failed: '停止失败',
      restart_failed: '重启失败',
      unexpected_response: '远端返回意外响应',
      NODE_error: '节点错误',
      machine_maintenance: '机器正在维护中',
      machine_offline: '机器离线',
      machine_not_found: '机器不存在',
      long_term_limit_reached: '已达到长期容器上限'
    }
  };

  // If an explicit error_reason exists, prefer it for display
  if (errorReason) {
    let found = false;
    // prefer route-specific mapping when routePath is available
    if (routePath) {
      for (const key of Object.keys(routeErrorMap)) {
        if (routePath.endsWith(key) || routePath.indexOf(key) !== -1) {
          const map = routeErrorMap[key] || {};
          if (map[errorReason]) {
            displayMessage = map[errorReason];
            found = true;
            break;
          }
        }
      }
    }
    // fallback: search all mappings for the errorReason (global match)
    if (!found) {
      for (const key of Object.keys(routeErrorMap)) {
        const map = routeErrorMap[key] || {};
        if (map[errorReason]) {
          displayMessage = map[errorReason];
          found = true;
          break;
        }
      }
    }
    if (!extraDetails) extraDetails = {};
  }

  // Provide a localized hint for common HTTP status codes to help users understand errors.
  let hint = '';
  switch (statusCode) {
    case 400:
      hint = '请求无效，请检查输入后重试。';
      break;
    case 401:
      hint = '未授权，请登录后重试。';
      break;
    case 403:
      hint = '权限不足，您没有执行此操作的权限。';
      break;
    case 404:
      hint = '资源未找到，请确认请求的内容是否存在。';
      break;
    case 409:
      hint = errorReason === 'long_term_limit_reached'
        ? '请先取消其他长期容器，或调整长期容器上限。'
        : '请求冲突，请检查是否存在重复内容。';
      break;
    case 422:
      hint = '请求参数校验失败，请修正后重试。';
      break;
    case 500:
      hint = '服务器出现错误，请稍后重试或联系管理员。';
      break;
    case 502:
    case 503:
    case 504:
      hint = '服务暂不可用，请稍后再试。';
      break;
    default:
      hint = '';
  }

    const { modals, masks } = hideExistingModals();

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    try {
      root.unmount();
    } catch (e) {
      // ignore
    }
    if (container.parentNode) container.parentNode.removeChild(container);
    restoreModals();
  };

  return new Promise((resolve) => {
    const onConfirm = () => {
      cleanup();
      resolve({ confirmed: true, status: code, message: displayMessage });
    };

    root.render(
      <ConfirmModal
        visible={true}
        title={title}
        message={displayMessage}
        content={(
          <div style={{ background: '#fff2f0', padding: 12, borderRadius: 4, border: '1px solid #ffccc7' }}>
            <div style={{ color: '#a8071a', marginBottom: 8 }}>{displayMessage}</div>
            {hint ? <div style={{ color: '#a8071a', opacity: 0.9 }}>{hint}</div> : null}
          </div>
        )}
        danger
        iconColor="#ff4d4f"
        onConfirm={onConfirm}
        loading={false}
        confirmText="好的"
        showCancel={false}
      />
    );
  });
};

export default showErrorModal;
