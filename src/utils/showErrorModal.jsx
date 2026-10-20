import React from 'react';
import { createRoot } from 'react-dom/client';
import ConfirmModal from '../components/ConfirmModal';

const hideExistingModals = () => {
  const modals = Array.from(document.querySelectorAll('.ant-modal'));
  const masks = Array.from(document.querySelectorAll('.ant-modal-mask'));
  modals.forEach((el) => {
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

// 机器作用域族的文案：容器动作与创建共用。措辞指向"所在机器"，不假定是哪个容器动作。
const MACHINE_SCOPE_MESSAGES = {
  machine_maintenance: '所在机器正在维护中，暂时无法操作其上的容器',
  machine_offline: '所在机器不在线，暂时无法操作其上的容器',
  machine_not_found: '容器所在的机器不存在',
  container_host_maintenance: '所在机器正在维护中，暂时无法操作其上的容器',
  container_host_offline: '所在机器不在线，暂时无法操作其上的容器',
};

export const routeErrorMap = {
    // 用户相关
    '/register': {
      username_exists: '用户名已存在',
      email_exists: '邮箱已存在',
      no_none_ascii: '禁止非ASCII字符（请勿输入中文）',
      invalid_username: '用户名仅允许英文、数字和下划线',
      registration_code_required: '请填写注册验证码',
      registration_code_invalid: '注册验证码无效或已过期',
      mail_send_failed: '验证邮件发送失败',
      email_domain_not_allowed: '该邮箱域名不允许注册',
    },
    '/request_register_code': {
      missing_email: '请输入邮箱',
      email_domain_not_allowed: '该邮箱域名不允许注册',
      mail_send_failed: '验证邮件发送失败',
      code_creation_failed: '验证码生成失败，请稍后重试',
    },
    '/login': { user_not_found: '用户不存在', password_incorrect: '密码错误' },
    '/users/change_password': { old_password_incorrect: '旧密码不正确', no_none_ascii: '禁止非ASCII字符（请勿输入中文）' },
    '/users/delete_user': { wild_container: '存在无主容器，无法删除用户', missing_user_id: '缺少 user_id' },
    '/users/get_user_detail_information': { user_not_found: '用户不存在', missing_user_id: '缺少 user_id' },
    '/users/list_all_user_bref_information': { list_failed: '获取用户列表失败' },
    '/users/update_user': { missing_fields: '缺少更新字段', user_not_found: '用户不存在', no_none_ascii: '禁止非ASCII字符（请勿输入中文）', invalid_username: '用户名仅允许英文、数字和下划线', invalid_fields: '更新字段不合法' },
    '/users/reset_password': { user_not_found: '用户不存在', missing_user_id: '缺少 user_id' },

    // 容器相关
    // 机器作用域族：容器动作与创建都可能撞上，措辞与具体容器动作无关，故抽成一块共用。
    // 两个来源：动作类先撞**有效状态机**（container_host_*），创建没有容器、只撞
    // **机器准入**（machine_*）。此前两族都没映射到容器路由，靠全局兜底去 /machines/*
    // 借措辞——能用但脆：它按 Object.keys 的遍历顺序取第一个命中者。
    '/containers/create_container': {
      ...MACHINE_SCOPE_MESSAGES,
      duplicate_entry: '创建容器失败：重复项',
      invalid_payload: '无效的容器数据',
      invalid_config: '容器配置无效或超出宿主机上限',
      create_failed: '创建容器失败',
    },
    '/containers/delete_container': {
      ...MACHINE_SCOPE_MESSAGES,
      delete_failed: '删除容器失败',
      not_found: '容器不存在',
    },
    '/containers/add_collaborator': {
      ...MACHINE_SCOPE_MESSAGES,
      add_collaborator_failed: '添加协作者失败',
      container_offline: '容器未在线，无法添加协作者',
    },
    '/containers/remove_collaborator': {
      ...MACHINE_SCOPE_MESSAGES,
      remove_collaborator_failed: '移除协作者失败',
      container_offline: '容器未在线，无法移除协作者',
    },
    '/containers/update_role': {
      ...MACHINE_SCOPE_MESSAGES,
      update_role_failed: '更新角色失败',
      container_offline: '容器未在线，无法更新角色',
    },
    '/containers/unpause_container': {
      ...MACHINE_SCOPE_MESSAGES,
      unpause_failed: '解冻容器失败',
    },
    '/containers/get_container_detail_information': { get_detail_failed: '获取容器详情失败' },
    '/containers/list_all_container_bref_information': { list_failed: '获取容器列表失败' },
    '/containers/set_long_term_container': {
      container_not_found: '容器不存在',
      machine_permission_denied: '权限不足，无法操作该机器上的容器',
      container_permission_denied: '只有容器所有者可以设置长期容器',
      long_term_limit_reached: '已达到长期容器上限',
      invalid_payload: '长期容器设置参数无效',
    },
    // 恢复（复活软删容器）：长期配额、快照不可恢复、机器作用域三条链路都会从这里出去。
    // 恢复先撞机器准入（machine_*），故复用容器动作那一族文案。
    '/containers/resurrect_container': {
      ...MACHINE_SCOPE_MESSAGES,
      not_found: '已删除容器记录不存在',
      data_not_recoverable: '该容器的挂载已清理，数据不可恢复',
      invalid_payload: '恢复参数无效',
      container_exists: '容器记录已存在，无法恢复',
      long_term_limit_reached: '已达到长期容器上限，恢复后无法保留长期标记',
    },

    // 机器相关
    // 登记（TOFU 接入）与「修复连接」共用若干 reason（machine_unreachable /
    // enrollment_failed / issue_uid_failed），但**语义不同**：登记是首次建立信任，
    // 没有「原有信任」可言；修复连接是在保住已有信任。所以两条路由各写各的文案，
    // 不能靠全局兜底互相借用——否则登记失败会显示「原有信任未被改动」这种错话。
    '/machines/register_machine': {
      invalid_trust_anchor: '机器名与 IP 为必填项',
      invalid_machine_ip: 'IP 地址须为纯地址（不含端口），端口请单独填写',
      invalid_node_port: '端口须为 1-65535 之间的整数',
      machine_unreachable: '连不上该机器，无法抓取证书',
      peer_cert_unavailable: '该机器未提供证书，无法建立信任',
      enrollment_failed: '该机器未返回接入资料',
      issue_uid_failed: '该机器的身份牌下发失败',
      issue_uid_rejected: '该机器拒绝了下发身份牌',
      persist_failed: '建档写库失败，请重试',
      internal_error: '建档过程中出现内部错误，请查看日志',
    },
    '/machines/remove_machine': { remove_failed: '删除机器失败' },
    '/machines/update_machine': {
      update_failed: '更新机器失败',
      machine_not_found: '机器不存在',
      machine_maintenance: '机器正在维护中',
      machine_offline: '机器离线',
      // 限额编辑被拒：与容器创建的超限文案分开，先看具体 message 里的字段与数值
      invalid_config: '机器配置限额无效或超出硬件容量',
      invalid_payload: '机器配置限额参数无效',
      missing_field: '缺少必填字段',
    },
    '/machines/get_detail_information': { machine_not_found: '机器不存在', machine_offline: '机器离线', machine_maintenance: '机器正在维护中' },
    '/machines/list_all_machine_bref_information': { list_failed: '获取机器列表失败', machine_offline: '机器离线' },
    '/machines/renew_machine_trust': {
      machine_not_found: '机器不存在',
      invalid_machine_ip: '该机器没有可用的 IP，无法重新抓取证书',
      machine_unreachable: '连不上该机器，无法抓取证书；原有信任未被改动',
      enrollment_failed: '该机器未返回接入资料；原有信任未被改动',
      issue_uid_failed: '该机器的身份牌下发失败；原有信任未被改动',
      persist_failed: '信任已重建，但写库失败，请重试',
    },

    // 设置相关
    '/settings': { invalid_setting: '设置项不合法', update_failed: '保存设置失败' },

    // 公告模板（列表/保存/删除同路由；深链为同前缀的 /{id}）
    '/announcements/templates': {
      duplicate_entry: '模板名称已存在',
      missing_field: '缺少模板必填字段',
      not_found: '模板不存在',
      cannot_delete_system_template: '系统模板不可删除',
    },

    // 镜像模板：五个入口各自只映射 Ctrl 已存在的 error_reason。
    '/images/create_image': {
      duplicate_entry: '镜像名称已存在',
      invalid_status: '镜像状态不合法',
      create_failed: '创建镜像失败',
    },
    '/images/update_image': {
      duplicate_entry: '镜像名称已存在',
      invalid_status: '镜像状态不合法',
      image_not_found: '镜像不存在',
      update_failed: '更新镜像失败',
    },
    '/images/delete_image': { image_not_found: '镜像不存在' },
    '/images/set_image_valid_range': {
      invalid_valid_range: '镜像可见范围不合法',
      image_not_found: '镜像不存在',
      set_valid_range_failed: '设置镜像可见范围失败',
    },
    '/images/set_image_visible_users': {
      not_custom_range: '只有自定义可见范围才能设置用户名单',
      unknown_user: '用户名单中存在不存在的用户',
      image_not_found: '镜像不存在',
      set_visible_users_failed: '保存镜像可见用户失败',
    },

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
      long_term_limit_reached: '已达到长期容器上限',
      // 通用兜底：以下 error_reason 可能在多个接口出现，避免路由窄映射漏掉
      machine_permission_denied: '权限不足，无法操作该机器上的容器',
      container_permission_denied: '只有容器所有者可以执行此操作',
      container_offline: '容器未在线',
      container_not_found: '容器不存在',
      invalid_payload: '请求参数无效',
      not_found: '资源不存在',
      container_exists: '容器已存在',
      node_endpoint_not_found: '节点不支持该操作',
      missing_field: '缺少必填字段',
      empty_targets: '请选择公告目标',
      cannot_delete_system_template: '系统模板不可删除'
    }
  };

// 占位/无信息量文案：这些不算「具体信息」，不能让它们抵掉中文原因映射
const PLACEHOLDER_MESSAGES = new Set([
  '发生错误', '发生错误，请稍后重试或联系管理员。', '未知错误', '请求失败', '失败',
  'error', 'Error', 'failed', 'Failed', 'undefined', 'null',
]);

// 网络类失败（fetch 抛错 / 超时）：没有 HTTP 状态也没有 error_reason 时给中文兜底，
// 不把 "Failed to fetch" 这类英文原文直接抛给用户。
const NETWORK_FAILURE_PATTERN = /(failed to fetch|networkerror|network request failed|fetch failed|load failed|err_connection|err_network|econnrefused|etimedout|network error|timed out|超时)/i;

/** 后端 message 是否算「具体信息」（能带出申请值/上限等细节、不是占位或原因名本身） */
const isSpecificMessage = (text, errorReason) => {
  const t = String(text || '').trim();
  if (!t) return false;
  if (PLACEHOLDER_MESSAGES.has(t)) return false;
  if (errorReason && t.toLowerCase() === String(errorReason).toLowerCase()) return false;
  if (/^\d{3}\s*错误$/.test(t)) return false;
  return true;
};

/** 路由优先、其次全表，找到 error_reason 的中文映射；未收录返回 null */
const resolveReasonMessage = (errorReason, routePath) => {
  if (!errorReason) return null;
  if (routePath) {
    for (const key of Object.keys(routeErrorMap)) {
      if (routePath.endsWith(key) || routePath.indexOf(key) !== -1) {
        const map = routeErrorMap[key] || {};
        if (map[errorReason]) return map[errorReason];
      }
    }
  }
  for (const key of Object.keys(routeErrorMap)) {
    const map = routeErrorMap[key] || {};
    if (map[errorReason]) return map[errorReason];
  }
  return null;
};

const showErrorModal = (input = {}) => {
  // 历史调用存在只传字符串的写法；统一归一化，避免把字符串当对象解构后
  // 退化成“发生错误”，也不改变对象调用（含 err.body）的既有语义。
  const params = typeof input === 'string' ? { message: input } : (input || {});
  const { title = '错误', status, route } = params;
  // message 是可变绑定：下面会把字符串里的 JSON 对象解析出来替换它；用 const 会在
  // 解析分支运行时抛错，退化为原字符串展示。
  let message = params.message === undefined ? '发生错误' : params.message;
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
        } catch {
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
  } catch {
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
    } catch {
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
  } catch {
    routePath = '';
  }

  let errorReason = null;
  if (message && typeof message === 'object') {
    errorReason = message.error_reason || message.error || (message.body && message.body.error_reason) || (message.data && message.data.error_reason) || null;
  }

  // 后端具体 message（可能带申请值与上限等数字）与中文原因映射分开保存：
  // 具体 message 优先保留，中文映射只作为补充行，不再反过来覆盖数值。
  // 未收录的原因也不硬套某个已知错误（例如把任何失败都说成超限）。
  const rawMessage = String(displayMessage || '').trim();
  const mappedReasonMessage = resolveReasonMessage(errorReason, routePath);
  const specificMessage = isSpecificMessage(rawMessage, errorReason) ? rawMessage : null;
  const hasStatusCode = Number.isFinite(Number(code)) || Number.isFinite(Number(status));
  const networkFailure = !errorReason && !hasStatusCode && NETWORK_FAILURE_PATTERN.test(rawMessage);

  let secondaryMessage = '';
  if (networkFailure) {
    displayMessage = '网络异常或请求超时，无法连接到服务器，请检查网络后重试。';
  } else if (specificMessage) {
    displayMessage = specificMessage;
    if (mappedReasonMessage && mappedReasonMessage !== specificMessage) {
      secondaryMessage = `原因：${mappedReasonMessage}`;
    }
  } else if (mappedReasonMessage) {
    displayMessage = mappedReasonMessage;
  } else if (errorReason) {
    displayMessage = '发生未知错误，请重试或联系管理员。';
    secondaryMessage = `未收录的错误原因：${errorReason}`;
  } else {
    displayMessage = '发生错误，请稍后重试或联系管理员。';
  }
  if (!extraDetails) extraDetails = {};

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

    hideExistingModals();

  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);

  const cleanup = () => {
    try {
      root.unmount();
    } catch {
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
            {secondaryMessage ? (
              <div style={{ color: '#a8071a', marginBottom: 8 }}>{secondaryMessage}</div>
            ) : null}
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
