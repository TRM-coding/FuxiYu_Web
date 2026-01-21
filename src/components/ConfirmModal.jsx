import React from 'react';
import { ExclamationCircleOutlined } from '@ant-design/icons';
import { Button, Modal, Space, Typography } from 'antd';

/**
 * 通用确认弹窗组件
 * 
 * 使用指南：
 * 
 * 1. 基础使用：
 *    <ConfirmModal
 *      visible={isVisible}
 *      title="确认操作"
 *      message="确定要执行此操作吗？"
 *      content={<div>操作详情</div>}
 *      onConfirm={handleConfirm}
 *      onCancel={handleCancel}
 *    />
 * 
 * 
 * 2. Props 说明：
 *    @param {boolean} visible - 弹窗显示状态
 *    @param {string} title - 弹窗标题
 *    @param {string} message - 弹窗主文本信息
 *    @param {ReactNode} content - 弹窗详情内容
 *    @param {boolean} danger - 是否为危险操作（显示红色按钮）
 *    @param {boolean} isDanger - danger 的别名，两者效果相同
 *    @param {function} onConfirm - 确认按钮回调函数
 *    @param {function} onCancel - 取消按钮回调函数
 *    @param {boolean} loading - 加载状态（通常用于 API 调用中）
 *    @param {string} confirmText - 确认按钮文本，默认 '确认'
 *    @param {string} cancelText - 取消按钮文本，默认 '取消'
 *    @param {boolean} showCancel - 是否显示取消按钮，默认 true
 *    @param {string} iconColor - 标题图标颜色，默认 '#faad14'
 */
const ConfirmModal = ({ 
  visible, 
  title, 
  message: messageText, 
  content, 
  danger = false, 
  isDanger = false,
  onConfirm, 
  onCancel, 
  loading,
  confirmText = '确认',
  cancelText = '取消',
  showCancel = true,
  iconColor = '#faad14'
}) => {
  const isDangerMode = danger || isDanger;
  const footerButtons = [];
  if (showCancel) {
    footerButtons.push(
      <Button key="cancel" onClick={onCancel} disabled={loading}>
        {cancelText}
      </Button>
    );
  }
  footerButtons.push(
    <Button 
      key="confirm" 
      type="primary"
      danger={isDangerMode}
      loading={loading}
      onClick={onConfirm}
    >
      {confirmText}
    </Button>
  );

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: iconColor }} />
          <span>{title}</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={500}
      footer={footerButtons}
    >
      <div style={{ marginBottom: 16 }}>
        <Typography.Text>{messageText}</Typography.Text>
      </div>
      {content}
    </Modal>
  );
};

export default ConfirmModal;
