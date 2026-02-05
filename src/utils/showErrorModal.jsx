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

const showErrorModal = ({ title = '错误', message = '发生错误', status } = {}) => {
  if (typeof document === 'undefined') return Promise.resolve({ confirmed: false, status });
  // Determine HTTP status: prefer explicit, otherwise try to parse from message text
  let code = Number(status);
  if (Number.isNaN(code)) {
    // try to extract a three-digit code from the message string
    try {
      const m = String(message || '');
      const found = m.match(/\b(\d{3})\b/);
      if (found) code = Number(found[1]);
    } catch (e) {
      code = NaN;
    }
  }

  // Do not perform redirects or clear auth here; redirect (if any) happens after user confirmation below.
  // Provide a localized hint for common HTTP status codes to help users understand errors.
  const statusCode = Number(status);
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
      hint = '未找到资源，可能已被删除或路径错误。';
      break;
    case 409:
      hint = '请求冲突，相同名称的内容已存在。';
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
      resolve({ confirmed: true, status: code, message });
    };

    root.render(
      <ConfirmModal
        visible={true}
        title={title}
        message={message}
        content={(
          <div style={{ background: '#fff2f0', padding: 12, borderRadius: 4, border: '1px solid #ffccc7' }}>
            <div style={{ color: '#a8071a', marginBottom: 8 }}>{message}</div>
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
