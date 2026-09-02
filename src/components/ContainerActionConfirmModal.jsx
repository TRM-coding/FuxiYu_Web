import React from 'react';
import { ContainerOutlined } from '@ant-design/icons';
import { Col, Row, Typography } from 'antd';
import ConfirmModal from './ConfirmModal';
import './ContainerActionConfirmModal.css';

const ACTION_CONFIG = {
  start: {
    title: '确认启动容器',
    verb: '启动',
    confirmText: '确认启动',
    danger: false,
    iconColor: '#1677ff',
    detail: '启动容器后，平台将等待状态采集确认其进入运行中。',
    contentClassName: 'home-modal-info',
    textType: 'secondary',
  },
  stop: {
    title: '确认停止容器',
    verb: '停止',
    confirmText: '确认停止',
    danger: true,
    iconColor: '#ff4d4f',
    detail: '停止容器是高风险操作，可能导致服务中断或数据不可用。',
    contentClassName: 'home-modal-danger',
    textType: 'danger',
  },
  restart: {
    title: '确认重启容器',
    verb: '重启',
    confirmText: '确认重启',
    danger: true,
    iconColor: '#ff4d4f',
    detail: '重启容器是高风险操作，可能会中断正在运行的任务。',
    contentClassName: 'home-modal-danger',
    textType: 'danger',
  },
  unpause: {
    title: '确认解冻容器',
    verb: '解冻',
    confirmText: '确认解冻',
    danger: false,
    iconColor: '#1677ff',
    detail: '解冻后容器将恢复可操作状态，状态仍由平台采集确认。',
    contentClassName: 'home-modal-info',
    textType: 'secondary',
  },
  delete: {
    title: '确认删除容器',
    verb: '删除',
    confirmText: '删除',
    danger: true,
    iconColor: '#ff4d4f',
    detail: '此操作不可恢复！此操作将永久删除该容器。',
  },
};

const valueOrDash = value => (value === undefined || value === null || value === '' ? '-' : value);
const containerIdOf = container => container?.key || container?.container_id || container?.id;
const containerNameOf = container => container?.container_name || container?.name || containerIdOf(container);
const machineOf = container => container?.machine_id || container?.machine_ip;
const DANGER_CARD_ACTIONS = new Set(['stop', 'restart', 'delete']);

const ContainerDangerContent = ({ container, detail }) => (
  <div className="mm-danger-box">
    <Row gutter={[0, 8]}>
      <Col span={24}>
        <Typography.Text type="secondary">容器ID：</Typography.Text>
        <Typography.Text className="mm-ml-8">{valueOrDash(containerIdOf(container))}</Typography.Text>
      </Col>
      <Col span={24}>
        <Typography.Text type="secondary">容器名：</Typography.Text>
        <Typography.Text className="mm-ml-8">{valueOrDash(containerNameOf(container))}</Typography.Text>
      </Col>
      <Col span={24}>
        <Typography.Text type="secondary">所属机器：</Typography.Text>
        <Typography.Text className="mm-ml-8">{valueOrDash(machineOf(container))}</Typography.Text>
      </Col>
    </Row>
    <Typography.Text type="danger" className="mm-danger-text">
      {detail}
    </Typography.Text>
  </div>
);

const ContainerActionContent = ({ config }) => (
  <div className={config.contentClassName}>
    <Typography.Text type={config.textType}>{config.detail}</Typography.Text>
  </div>
);

const ContainerActionConfirmModal = ({
  visible,
  action,
  container,
  loading,
  onConfirm,
  onCancel,
}) => {
  const config = ACTION_CONFIG[action] || ACTION_CONFIG.restart;
  const name = containerNameOf(container);
  const actionMessageName = name || '';
  const useDangerCard = DANGER_CARD_ACTIONS.has(action);

  return (
    <ConfirmModal
      visible={visible}
      title={config.title}
      icon={<ContainerOutlined style={{ color: config.iconColor, fontSize: 18 }} />}
      message={useDangerCard ? (
        <div>
          <div className="mm-delete-headline">你即将<span className="mm-action-verb">{config.verb}</span>的是：<span className="mm-delete-headline-type">容器</span></div>
          <div className="mm-delete-name">名称：{valueOrDash(name)}</div>
        </div>
      ) : `确定要${config.verb}容器 ${actionMessageName} 吗？`}
      content={useDangerCard ? (
        <ContainerDangerContent container={container} detail={config.detail} />
      ) : (
        <ContainerActionContent config={config} />
      )}
      danger={config.danger}
      iconColor={config.iconColor}
      onConfirm={onConfirm}
      onCancel={onCancel}
      loading={loading}
      confirmText={config.confirmText}
    />
  );
};

export default ContainerActionConfirmModal;
