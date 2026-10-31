import React from 'react';
import { Button, Space, Typography, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import ConfirmModal from './ConfirmModal';

const copyText = async (text) => {
  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  throw new Error('clipboard unavailable');
};

/**
 * 一次性凭据弹窗。
 *
 * 只负责展示与复制；密码的生命周期由父组件状态控制。关闭时父组件必须立即
 * 清空 credentials。这里不写 localStorage/sessionStorage/console/oplog，也不
 * 调用 showErrorModal。该保证是 DOM/状态层不可回看，不承诺 JS 字符串物理零化。
 */
const CredentialModal = ({ open, credentials = [], onClose, title = '密码' }) => {
  if (!open) return null;
  const items = Array.isArray(credentials) ? credentials : [];
  const handleCopy = async (item) => {
    try {
      await copyText(item.password);
      message.success('密码已复制');
    } catch {
      message.error('复制失败，请手动选择密码复制');
    }
  };
  return (
    <ConfirmModal
      visible={open}
      title={title}
      message="密码仅显示一次，关闭后无法再次查看。"
      content={(
        <div className="credential-modal-list">
          {items.map((item) => (
            <div className="credential-modal-item" key={`${item.login_name}-${item.password}`}>
              <Space align="center" wrap>
                <Typography.Text strong>重置后{item.login_name}的密码：</Typography.Text>
                <Typography.Text code>{item.password}</Typography.Text>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => handleCopy(item)}
                >
                  复制
                </Button>
              </Space>
            </div>
          ))}
        </div>
      )}
      danger={false}
      iconColor="#1677ff"
      onConfirm={onClose}
      onCancel={onClose}
      confirmText="关闭"
      showCancel={false}
    />
  );
};

export default CredentialModal;
