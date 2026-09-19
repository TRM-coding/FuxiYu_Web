import React from 'react';
import { Modal, Button, Typography, Row, Col, Space, Tag, Avatar, Progress } from 'antd';
import {
  SettingOutlined,
  GlobalOutlined,
  ClockCircleOutlined,
  TeamOutlined,
  EditOutlined,
  DeleteOutlined,
  PlayCircleOutlined,
  HddOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { formatContainerImage } from '../utils/detailFormat';
import './ContainerDetailModal.css';

const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

const ROLE_CONFIG = {
  [ROLE.ROOT]: { label: '超级管理员', color: 'red', icon: null, description: '拥有最高权限，可管理所有容器和用户' },
  [ROLE.ADMIN]: { label: '管理员', color: 'blue', icon: null, description: '可管理指定容器的所有操作' },
  [ROLE.COLLABORATOR]: { label: '协作者', color: 'green', icon: null, description: '可使用容器，但操作权限有限' }
};

const getAvatarUrl = (username) => `https://api.dicebear.com/7.x/miniavs/svg?seed=${username}`;
const formatRole = (role) => (ROLE_CONFIG[role] ? ROLE_CONFIG[role].label : role);
const getRoleColor = (role) => (ROLE_CONFIG[role] ? ROLE_CONFIG[role].color : 'default');
const hasValue = value => value !== null && value !== undefined && value !== '';
const formatValue = (value, suffix = '') => (hasValue(value) ? `${value}${suffix}` : '-');
const formatPercent = value => {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
};
const formatRuntime = (value, suffix = '') => {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  return `${n.toFixed(n % 1 === 0 ? 0 : 1)}${suffix}`;
};
const formatTime = value => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
};
const formatCleanup = container => {
  if (container?.is_long_term) return '长期保留';
  if (container?.cleanup_status === 'overdue') return '待清理';
  if (container?.seconds_until_cleanup !== null && container?.seconds_until_cleanup !== undefined) {
    const seconds = Math.max(0, Number(container.seconds_until_cleanup) || 0);
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    if (days > 0) return `${days}天${hours}小时`;
    return `${hours}小时`;
  }
  return '-';
};

/**
 * 容器详情弹窗。
 *
 * `showRuntimeSummary`：是否显示「运行摘要」。默认显示，但**日志页**那种"看一条历史操作"
 * 的场景要关掉——那里的上下文不是"这台容器现在跑得怎么样"，而且它的数据来源只挑了
 * 部分字段，硬显示只会是一排 "-"。
 */
const ContainerDetailModal = ({
  visible, container, onClose, onEdit, onDelete, onLeave, onUnpause,
  usersList = [], currentUserId = null, forceSystemAdmin = false, readOnly = false,
  showRuntimeSummary = true,
}) => {
  if (!container) return null;

  const accountsByRole = container.accounts?.reduce((acc, account) => {
    const role = account.role;
    if (!acc[role]) acc[role] = [];
    const ownerName = (usersList.find(u => String(u.id) === String(account.user_id))?.name) || account.username;
    acc[role].push({ ...account, ownerName });
    return acc;
  }, {});
  const roleOrder = [ROLE.ROOT, ROLE.ADMIN, ROLE.COLLABORATOR];
  const orderedRoleEntries = Object.entries(accountsByRole || {}).sort(([a], [b]) => {
    const ai = roleOrder.indexOf(a);
    const bi = roleOrder.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // 使用 user_id 精确判断当前用户是否为 ROOT（避免 username 修改导致匹配失败）
  const isRoot = forceSystemAdmin || (container.accounts || []).some(acc => acc.role === ROLE.ROOT && String(acc.user_id) === String(currentUserId));
  const canManagePeople = !readOnly && isRoot && typeof onEdit === 'function' && container.effective_status === 'online';

  const isHostOffline = container.effective_status === 'host_offline';
  const runtime = container.runtime_metrics || {};
  const diskUsage = container.disk_usage || {};
  const gpuDevices = runtime.gpu?.devices || [];
  const cpuPercent = formatPercent(runtime.cpu_usage_percent);
  const memoryPercent = formatPercent(runtime.memory_usage_percent);
  const diskPercent = formatPercent(diskUsage.usage_percent ?? container.disk_usage_percent);
  const statusColor = isHostOffline
    ? 'default'
    : container.effective_status === 'online'
    ? 'green'
    : container.effective_status === 'offline'
      ? 'volcano'
      : container.effective_status === 'building'
        ? 'geekblue'
      : container.effective_status === 'creating'
        ? 'blue'
        : container.effective_status === 'starting'
          ? 'cyan'
          : container.effective_status === 'restarting'
            ? 'purple'
            : container.effective_status === 'stopping'
              ? 'orange'
              : container.effective_status === 'paused'
                ? 'volcano'
                : container.effective_status === 'failed'
                  ? 'red'
                  : 'default';
   const statusText = isHostOffline
    ? '宿主机离线'
    : container.effective_status === 'online'
    ? '运行中'
    : container.effective_status === 'offline'
      ? '已停止'
      : container.effective_status === 'building'
        ? '构建中'
      : container.effective_status === 'creating'
        ? '创建中'
        : container.effective_status === 'starting'
          ? '启动中'
          : container.effective_status === 'restarting'
            ? '重启中'
          : container.effective_status === 'stopping'
            ? '停止中'
            : container.effective_status === 'paused'
              ? '磁盘已冻结'
              : container.effective_status === 'failed'
                ? '异常'
                : container.effective_status === 'status_unknown'
                  ? '状态未知'
                  : container.effective_status === 'host_maintenance'
                    ? '宿主机维护'
                    : container.effective_status === 'host_offline'
                      ? '宿主机离线'
                      : container.effective_status;

  return (
    <Modal title="容器详细信息" open={visible} onCancel={onClose} width="min(750px, calc(100vw - 24px))" className="cdm-modal" footer={[
      !readOnly && container.effective_status === 'paused' && onUnpause ? (
        <Button key="unpause" type="primary" icon={<PlayCircleOutlined />} onClick={() => onUnpause(container)}>解冻容器</Button>
      ) : null,
      !readOnly && container.effective_status === 'paused' && !onUnpause ? (
        <Typography.Text key="frozen-hint" type="secondary" style={{ marginRight: 12, alignSelf: 'center', fontSize: 12 }}>
          磁盘已冻结，请联系管理员解冻
        </Typography.Text>
      ) : null,
      <Button key="close" onClick={onClose}>关闭</Button>,
      !readOnly && (isRoot ? (
        <Button key="deleteContainer" danger icon={<DeleteOutlined />} onClick={() => onDelete && onDelete(container)}>删除容器</Button>
      ) : (
        <Button key="leave" icon={<DeleteOutlined />} disabled={container.effective_status !== 'online'} onClick={() => onLeave && onLeave(container)}>解除关联</Button>
      ))
    ]}>
      <div className="cdm-body">
        <div className="cdm-header">
          <Typography.Title level={4} className="cdm-title">{container.container_name}</Typography.Title>
          <Typography.Text type="secondary">容器ID: {container.key}</Typography.Text>
        </div>

        <div className="cdm-summary-card">
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">容器状态</Typography.Text>
                  <Tag color={statusColor}>
                    {statusText}
                  </Tag>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <GlobalOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">所属机器 IP</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{container.machine_ip || container.machine_id}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <ClockCircleOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">镜像</Typography.Text>
                  <Typography.Text className="cdm-image-text" ellipsis={{ tooltip: formatContainerImage(container.image_name) }}>{formatContainerImage(container.image_name)}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">端口映射</Typography.Text>
                  <Tag color="purple">{container.port}</Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        <div className="cdm-admin-row">
          <div className="cdm-personnel-card">
            <div className="cdm-section-head">
              <Typography.Title level={5} className="cdm-roles-title">
                <TeamOutlined className="cdm-roles-icon" /> 人员管理 ({container.accounts?.length || 0}人)
              </Typography.Title>
              {canManagePeople && (
                <Button size="small" type="primary" icon={<EditOutlined />} onClick={() => onEdit(container)}>
                  管理人员
                </Button>
              )}
            </div>

            {orderedRoleEntries.length > 0 ? orderedRoleEntries.map(([role, accounts]) => (
              <div key={role} className="cdm-role-group">
                <div className="cdm-role-header">
                  <Space>
                    <Typography.Text strong>{formatRole(role)}</Typography.Text>
                    <Tag color={getRoleColor(role)} className="cdm-role-count">{accounts.length}人</Tag>
                  </Space>
                  <Typography.Text type="secondary" className="cdm-role-desc">{ROLE_CONFIG[role]?.description}</Typography.Text>
                </div>

                <div className="cdm-role-body">
                  <Row gutter={[12, 12]}>
                    {accounts.map((account, index) => (
                      <Col xs={24} sm={12} key={index}>
                        <Space align="center" className="cdm-account-item">
                          <Avatar src={getAvatarUrl(account.username)} size="default" />
                          <div className="cdm-account-meta">
                            <div className="cdm-account-row">
                              <Typography.Text strong ellipsis>{account.ownerName}</Typography.Text>
                              <Tag className="cdm-account-id">ID {account.user_id}</Tag>
                            </div>
                            <Typography.Text type="secondary" className="cdm-account-username" ellipsis>@{account.username}</Typography.Text>
                          </div>
                        </Space>
                      </Col>
                    ))}
                  </Row>
                </div>
              </div>
            )) : (
              <Typography.Text type="secondary" className="cdm-empty-text">暂无人员关联</Typography.Text>
            )}
          </div>

          <div className="cdm-port-card">
            <div className="cdm-metric-head">
              <GlobalOutlined />
              <Typography.Text strong>端口管理</Typography.Text>
            </div>
            <div className="cdm-port-main">
              <Typography.Text type="secondary">SSH 端口</Typography.Text>
              <Tag color="purple" className="cdm-port-tag">:{container.port || '-'}</Tag>
            </div>
            <Typography.Text type="secondary" className="cdm-subline">
              所属机器 {container.machine_ip || container.machine_id || '-'}
            </Typography.Text>
          </div>
        </div>

        {(container.failed_reason || container.failed_detail) && (
          <div className="cdm-diagnostic-card">
            <Typography.Text strong className="cdm-item-label">失败诊断</Typography.Text>
            {container.failed_reason && <Tag color="red">{container.failed_reason}</Tag>}
            {container.failed_detail && (
              <Typography.Paragraph className="cdm-diagnostic-detail">
                {container.failed_detail}
              </Typography.Paragraph>
            )}
          </div>
        )}

        <div className="cdm-metrics-grid">
          {showRuntimeSummary && (
          <div className="cdm-metric-card cdm-runtime-card">
            <div className="cdm-metric-head">
              <ThunderboltOutlined />
              <Typography.Text strong>运行摘要</Typography.Text>
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">CPU</Typography.Text>
                <Progress percent={cpuPercent} size="small" format={() => formatRuntime(runtime.cpu_usage_percent, '%')} />
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">内存</Typography.Text>
                <Progress percent={memoryPercent} size="small" status="active" format={() => formatRuntime(runtime.memory_usage_percent, '%')} />
                <Typography.Text type="secondary" className="cdm-subline">
                  {formatRuntime(runtime.memory_usage_mb, ' MB')} / {formatRuntime(runtime.memory_limit_mb, ' MB')}
                </Typography.Text>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">网络</Typography.Text>
                <Typography.Text className="cdm-machine-text">
                  入 {formatRuntime(runtime.network_rx_mb, ' MB')} / 出 {formatRuntime(runtime.network_tx_mb, ' MB')}
                </Typography.Text>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">块 IO</Typography.Text>
                <Typography.Text className="cdm-machine-text">
                  读 {formatRuntime(runtime.block_read_mb, ' MB')} / 写 {formatRuntime(runtime.block_write_mb, ' MB')}
                </Typography.Text>
              </Col>
            </Row>
          </div>
          )}

          <div className="cdm-metric-card">
            <div className="cdm-metric-head">
              <HddOutlined />
              <Typography.Text strong>清理与磁盘</Typography.Text>
            </div>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">最后 SSH</Typography.Text>
                <Typography.Text className="cdm-machine-text">{formatTime(container.last_ssh_login_time)}</Typography.Text>
              </Col>
              <Col xs={24} sm={12}>
                <Typography.Text className="cdm-item-label">清理倒计时</Typography.Text>
                <Typography.Text className="cdm-machine-text">{formatCleanup(container)}</Typography.Text>
              </Col>
              <Col xs={24}>
                <Typography.Text className="cdm-item-label">磁盘用量</Typography.Text>
                <Progress percent={diskPercent} size="small" status={diskPercent >= 100 ? 'exception' : undefined} />
                <Typography.Text type="secondary" className="cdm-subline">
                  {formatRuntime(diskUsage.total_gb ?? container.disk_total_gb, ' GB')} / {formatRuntime(diskUsage.limit_gb ?? container.disk_limit_gb, ' GB')}
                </Typography.Text>
              </Col>
              {container.freeze_state?.is_frozen && (
                <Col xs={24}>
                  <Tag color="volcano">冻结 {formatValue(container.freeze_state.days_frozen, ' 天')}</Tag>
                  <Typography.Text type="secondary">宽限至 {formatTime(container.freeze_state.grace_until)}</Typography.Text>
                </Col>
              )}
            </Row>
          </div>
        </div>

        {gpuDevices.length > 0 && (
          <div className="cdm-gpu-card">
            <Typography.Text strong className="cdm-item-label">GPU 运行情况</Typography.Text>
            <div className="cdm-gpu-list">
              {gpuDevices.map(gpu => (
                <div key={`${gpu.vendor || 'gpu'}-${gpu.index}`} className="cdm-gpu-row">
                  <Typography.Text className="cdm-gpu-name">{gpu.name || `GPU ${gpu.index}`}</Typography.Text>
                  <Tag color="geekblue">#{gpu.index}</Tag>
                  <Typography.Text>{formatRuntime(gpu.utilization_gpu_percent, '%')}</Typography.Text>
                  <Typography.Text type="secondary">
                    {formatRuntime(gpu.memory_used_mb, ' MB')} / {formatRuntime(gpu.memory_total_mb, ' MB')}
                  </Typography.Text>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </Modal>
  );
};

export default ContainerDetailModal;
