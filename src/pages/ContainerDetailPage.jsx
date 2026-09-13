import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, Checkbox, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, UnlockOutlined } from '@ant-design/icons';
import {
  addCollaborator,
  deleteContainer,
  getContainerDetailInformation,
  getContainerOperationLogs,
  getContainerStatus,
  removeCollaborator,
  restartContainer,
  setLongTermContainer,
  startContainer,
  stopContainer,
  unpauseContainer,
  updateRole,
} from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import CopyChip from '../components/CopyChip';
import ContainerActionConfirmModal from '../components/ContainerActionConfirmModal';
import RuntimeTrendChart from '../components/RuntimeTrendChart';
import showErrorModal from '../utils/showErrorModal';
import { formatNumber, formatSnapshotTime } from '../utils/detailFormat';
import { formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';
import { isDiskOverLimit, DISK_OVER_LIMIT_MESSAGE } from '../utils/diskLimit';

// 容器相关操作 → 中文（与 AdminLogs 的映射保持一致；未知操作回退原文）
const CONTAINER_OPERATION_LABELS = {
  create_container: '创建容器',
  delete_container: '删除容器',
  start_container: '启动容器',
  stop_container: '停止容器',
  restart_container: '重启容器',
  pause_container: '冻结容器',
  unpause_container: '解冻容器',
  add_collaborator: '添加协作者',
  remove_collaborator: '移除协作者',
  update_collaborator_role: '变更角色',
  set_long_term: '设置长期容器',
  send_cleanup_reminder: '发送清理提醒',
};
import { getContainerStatusDisplay } from '../utils/statusDisplay';
import { usePermission } from '../contexts/PermissionContext';
import { getContainerActionState } from '../utils/containerActions';
import './DetailPages.css';

const ROLE = {
  ROOT: 'ROOT',
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
};

const ROLE_CONFIG = {
  [ROLE.ROOT]: { label: '超级管理员', color: 'red' },
  [ROLE.ADMIN]: { label: '管理员', color: 'blue' },
  [ROLE.COLLABORATOR]: { label: '协作者', color: 'green' },
};

const getAvatarUrl = username => `https://api.dicebear.com/7.x/miniavs/svg?seed=${username || 'user'}`;
const normalizeUser = user => ({
  id: user?.id ?? user?.user_id ?? user?.key,
  username: user?.username || user?.name || '',
  name: user?.name || user?.username || '',
  email: user?.email || '',
});
const normalizeAccount = (account, users = []) => {
  const userId = account?.user_id ?? account?.id ?? account?.key;
  const matched = users.find(user => String(user.id) === String(userId));
  return {
    ...account,
    user_id: userId,
    username: account?.username || matched?.username || matched?.name || '',
    ownerName: matched?.name || account?.ownerName || account?.username || `用户 ${userId}`,
  };
};
const roleLabel = role => ROLE_CONFIG[role]?.label || role || '-';
const roleColor = role => ROLE_CONFIG[role]?.color || 'default';

const sumNumbers = values => {
  const nums = values.map(Number).filter(Number.isFinite);
  if (!nums.length) return null;
  return nums.reduce((sum, value) => sum + value, 0);
};

const firstFinite = values => values.find(value => Number.isFinite(Number(value)));

const addHistoryPoint = (history, metrics) => {
  if (!metrics) return history;
  const gpuDevices = Array.isArray(metrics?.gpu?.devices) ? metrics.gpu.devices : [];
  const point = {
    t: Date.now(),
    collectedAt: metrics.collected_at || metrics.cache_updated_at || null,
    cpu: Number(metrics.cpu_usage_percent),
    memory: Number(metrics.memory_usage_percent),
    networkRx: Number(metrics.network_rx_mb),
    networkTx: Number(metrics.network_tx_mb),
    blockRead: Number(metrics.block_read_mb),
    blockWrite: Number(metrics.block_write_mb),
    gpus: gpuDevices.map(device => ({
      index: device?.index,
      value: Number(device?.utilization_gpu_percent),
    })),
  };
  const hasMetric = [
    point.cpu,
    point.memory,
    point.networkRx,
    point.networkTx,
    point.blockRead,
    point.blockWrite,
  ].some(Number.isFinite);
  const hasGpu = point.gpus.some(gpu => Number.isFinite(gpu.value));
  if (!hasMetric && !hasGpu) return history;
  return [...history.slice(-23), point];
};

const ContainerDetailPage = () => {
  const { containerId } = useParams();
  const navigate = useNavigate();
  const [container, setContainer] = useState(null);
  const [operationLogs, setOperationLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedRole, setSelectedRole] = useState(ROLE.COLLABORATOR);
  const [peopleSaving, setPeopleSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'start' | 'stop' | 'restart' | 'unpause' | 'delete' | null
  const [containerActionConfirm, setContainerActionConfirm] = useState({ visible: false, action: '' });
  const { hasPermission } = usePermission();

  const loadDetail = async ({ silent = false } = {}) => {
    if (!containerId) return;
    if (!silent) setLoading(true);
    try {
      const res = await getContainerDetailInformation(Number(containerId));
      const detail = res?.container_info || res?.container || res?.data || res;
      setContainer(detail || null);
      setHistory(prev => addHistoryPoint(prev, detail?.runtime_metrics));
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取容器详情失败', status: err?.status, route: err?.route });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    try {
      const res = await listAllUserBrefInformation({ page_number: 1, page_size: 100 });
      const rawUsers = res?.users || res?.user_list || res?.data || [];
      setUsersList(Array.isArray(rawUsers) ? rawUsers.map(normalizeUser).filter(user => user.id !== undefined && user.id !== null) : []);
    } catch (err) {
      console.warn('list users for container detail failed', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const loadStatus = async () => {
    if (!containerId) return;
    try {
      const data = await getContainerStatus(Number(containerId));
      setContainer(prev => {
        if (!prev) return prev;
        const has = key => Object.prototype.hasOwnProperty.call(data || {}, key);
        return {
          ...prev,
          effective_status: has('effective_status') ? data.effective_status : prev.effective_status,
          failed_reason: has('failed_reason') ? data.failed_reason : prev.failed_reason,
          failed_detail: has('failed_detail') ? data.failed_detail : prev.failed_detail,
          runtime_metrics: has('runtime_metrics') ? data.runtime_metrics : prev.runtime_metrics,
        };
      });
      setHistory(prev => addHistoryPoint(prev, data?.runtime_metrics));
    } catch (err) {
      console.warn('container status polling failed', err);
    }
  };

  useEffect(() => {
    loadDetail();
    loadUsers();
    const timer = setInterval(loadStatus, 5000);
    return () => clearInterval(timer);
  }, [containerId]);

  // 容器级掉卡审查（与机器页同款 N 帧语义）：分配锁定的卡（device_ids，静态）
  // 持续缺席于每轮 live 切片（devices）→ 该容器实际已无此卡可用
  const GPU_ABSENT_TICKS = 3;
  const [absentTicks, setAbsentTicks] = useState({});

  useEffect(() => {
    const gpu = container?.runtime_metrics?.gpu;
    if (!gpu || !Array.isArray(gpu.device_ids) || gpu.device_ids.length === 0) {
      setAbsentTicks({});
      return;
    }
    const liveIdx = new Set(
      (Array.isArray(gpu.devices) ? gpu.devices : [])
        .map(d => Number(d?.index)).filter(Number.isInteger),
    );
    const ids = gpu.device_ids.map(Number).filter(Number.isInteger);
    setAbsentTicks(prev => {
      const next = {};
      for (const idx of ids) next[idx] = liveIdx.has(idx) ? 0 : (prev[idx] ?? 0) + 1;
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [container?.runtime_metrics?.gpu]);

  // 操作历史（op-log）：能看容器的即可看其事件；进入时拉一次
  useEffect(() => {
    if (!containerId) return;
    let mounted = true;
    (async () => {
      try {
        const res = await getContainerOperationLogs(Number(containerId));
        if (mounted && Array.isArray(res?.logs)) setOperationLogs(res.logs);
      } catch (err) {
        console.warn('load container operation logs failed', err?.message);
      }
    })();
    return () => { mounted = false; };
  }, [containerId]);

  // 容器操作（详情页直连 API；状态由 5s 轮询 loadStatus 兜底刷新）
  const actionState = getContainerActionState(container?.effective_status);
  const runAction = async (action, label) => {
    if (!containerId) return;
    setActionLoading(label);
    try {
      await action(Number(containerId));
      message.success(`${label}成功`);
      await loadDetail({ silent: true });
    } catch (err) {
      await showErrorModal({ message: err?.body || err || `${label}失败`, status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setActionLoading(null);
    }
  };
  const [longTermSaving, setLongTermSaving] = useState(false);
  const handleLongTermToggle = async (checked) => {
    if (!containerId) return;
    setLongTermSaving(true);
    try {
      await setLongTermContainer({ container_id: Number(containerId), is_long_term: checked });
      message.success(checked ? '已设为长期容器' : '已取消长期容器');
      await loadDetail({ silent: true });
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '设置长期容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setLongTermSaving(false);
    }
  };
  const handleDeleteContainer = () => {
    setContainerActionConfirm({ visible: true, action: 'delete' });
  };
  const handleConfirmDeleteContainer = async () => {
    setActionLoading('delete');
    try {
      await deleteContainer(Number(containerId));
      message.success('容器已删除');
      setContainerActionConfirm({ visible: false, action: '' });
      navigate('/index');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '删除失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setActionLoading(null);
    }
  };
  const openContainerActionConfirm = action => {
    setContainerActionConfirm({ visible: true, action });
  };
  const closeContainerActionConfirm = () => {
    if (actionLoading) return;
    setContainerActionConfirm({ visible: false, action: '' });
  };
  const handleConfirmContainerAction = async () => {
    const action = containerActionConfirm.action;
    if (action === 'delete') {
      await handleConfirmDeleteContainer();
      return;
    }
    const actions = {
      start: { fn: startContainer, label: '启动' },
      stop: { fn: stopContainer, label: '停止' },
      restart: { fn: restartContainer, label: '重启' },
      unpause: { fn: unpauseContainer, label: '解冻' },
    };
    const selected = actions[action];
    if (!selected) return;
    await runAction(selected.fn, selected.label);
    setContainerActionConfirm({ visible: false, action: '' });
  };

  const status = String(container?.effective_status || 'unknown').toLowerCase();
  const statusDisplay = getContainerStatusDisplay(status);
  const metrics = container?.runtime_metrics || {};
  const diskUsage = container?.disk_usage || {};
  // 「长期容器」勾选框：已长期的不用拦（超限的长期容器走冻结升级），未长期但磁盘已达上限的置灰。
  // 详情页的磁盘数据是嵌套形状（disk_usage.usage_percent），共用判据两种形状都认。
  const longTermBlockedByDisk = container?.is_long_term !== true && isDiskOverLimit(container);
  const longTermBlockedByQuota = container?.is_long_term !== true && container?.long_term_container_can_enable === false;
  const latestHistoryPoint = history.length ? history[history.length - 1] : null;
  const collectedAt = latestHistoryPoint?.collectedAt || metrics?.collected_at || metrics?.cache_updated_at;
  const gpuDevices = metrics?.gpu?.device_ids || [];
  const gpuRuntimeDevices = Array.isArray(metrics?.gpu?.devices) ? metrics.gpu.devices : [];
  // 容器级掉卡：分配的物理卡（device_ids）连续缺席 live 切片 → 提示
  const gpuMissing = gpuDevices
    .map(Number).filter(Number.isInteger)
    .filter(idx => (absentTicks[idx] ?? 0) >= GPU_ABSENT_TICKS);
  const diskIoTotal = sumNumbers([metrics.block_read_mb, metrics.block_write_mb]);
  const networkTotal = sumNumbers([metrics.network_rx_mb, metrics.network_tx_mb]);
  const memoryLimitValue = firstFinite([metrics.memory_limit_mb]);
  const memoryLimitText = memoryLimitValue !== undefined
    ? formatNumber(memoryLimitValue, ' MB')
    : formatNumber(container?.memory_gb, ' GB');
  // 展示派生（后端 alloc_*）：机器上限收缩 trim 后，容器申请超上限展示砍后值 + degraded 标记
  const allocDegraded = container?.alloc_degraded === true;
  const allocCpu = container?.alloc_cpu_number ?? container?.cpu_number;
  const allocMem = container?.alloc_memory_gb ?? container?.memory_gb;
  const allocGpu = container?.alloc_gpu_number ?? container?.gpu_number;
  const title = container?.container_name || `容器 ${containerId}`;
  const sshEndpoint = container?.machine_ip && container?.port ? `${container.machine_ip}:${container.port}` : '';
  // 端口映射（docker 自动分配，Node inspect 回填落库；后端出参已派生补齐 22→port）
  const portMappings = Array.isArray(container?.port_mappings) ? container.port_mappings : [];
  const currentUserId = localStorage.getItem('currentUserId');
  const accounts = (container?.accounts || []).map(account => normalizeAccount(account, usersList));
  const isRoot = accounts.some(account => account.role === ROLE.ROOT && String(account.user_id) === String(currentUserId));
  const canManagePeople = isRoot && status === 'online';
  const availableUsers = usersList.filter(user => !accounts.some(account => String(account.user_id) === String(user.id)));
  const refreshAfterPeopleChange = async () => {
    await loadDetail({ silent: true });
  };
  const handleAddUser = async () => {
    if (!selectedUserId || !containerId) return;
    setPeopleSaving(true);
    try {
      await addCollaborator({ user_id: selectedUserId, container_id: Number(containerId), role: selectedRole });
      setSelectedUserId(null);
      setSelectedRole(ROLE.COLLABORATOR);
      await refreshAfterPeopleChange();
      message.success('用户已添加');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '添加用户失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setPeopleSaving(false);
    }
  };
  const handleRemoveUser = async userId => {
    if (!userId || !containerId) return;
    setPeopleSaving(true);
    try {
      await removeCollaborator({ user_id: userId, container_id: Number(containerId) });
      await refreshAfterPeopleChange();
      message.success('用户已移除');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '移除用户失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setPeopleSaving(false);
    }
  };
  const handleRoleChange = async (userId, updatedRole) => {
    if (!userId || !containerId) return;
    setPeopleSaving(true);
    try {
      await updateRole({ container_id: Number(containerId), user_id: userId, updated_role: updatedRole });
      await refreshAfterPeopleChange();
      message.success('角色已更新');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '更新角色失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setPeopleSaving(false);
    }
  };

  const resourceMetrics = useMemo(() => ([
    { label: 'CPU', value: formatNumber(metrics.cpu_usage_percent, '%'), extra: `配额 ${formatNumber(allocCpu, ' 核')}` },
    { label: '内存', value: formatNumber(metrics.memory_usage_percent, '%'), extra: `${formatNumber(metrics.memory_usage_mb, ' MB')} / ${memoryLimitText} · 配额 ${formatNumber(allocMem, ' GB')}` },
    { label: '网络', value: formatNumber(networkTotal, ' MB'), extra: `入 ${formatNumber(metrics.network_rx_mb, ' MB')} / 出 ${formatNumber(metrics.network_tx_mb, ' MB')}` },
    { label: '磁盘', value: formatNumber(diskUsage.total_gb, ' GB'), extra: `上限 ${formatNumber(diskUsage.limit_gb, ' GB')} · IO ${formatNumber(diskIoTotal, ' MB')}` },
  ]), [container, metrics, networkTotal, diskIoTotal, memoryLimitText, allocCpu, allocMem]);

  const resourceSeries = [
    { key: 'cpu', label: 'CPU', color: '#1677ff', fill: 'rgba(22, 119, 255, 0.12)', value: point => point.cpu },
    { key: 'memory', label: '内存', color: '#13a06f', fill: 'rgba(19, 160, 111, 0.10)', value: point => point.memory },
  ];

  const gpuSeries = gpuRuntimeDevices.map((device, idx) => ({
    key: `gpu-${device?.index ?? idx}`,
    label: `GPU ${device?.index ?? idx}`,
    color: ['#1677ff', '#13a06f', '#7c3aed', '#f59e0b'][idx % 4],
    value: point => {
      const found = (point.gpus || []).find(item => String(item.index) === String(device?.index ?? idx));
      return found?.value;
    },
  }));

  return (
    <main className="detail-page">
      <div className="detail-shell">
        <div className="detail-topbar">
          <Button icon={<ArrowLeftOutlined />} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/index'))}>返回</Button>
          <Button icon={<ReloadOutlined />} onClick={() => loadDetail()}>刷新</Button>
        </div>

        {loading && !container ? <Spin /> : (
          <>
            <div className="detail-title-wrap">
              <div className="detail-title">
                <h1>{title}</h1>
                <Tag color={statusDisplay.color}>{statusDisplay.label}</Tag>
              </div>
              <div className="detail-subtitle">
                <span>ID {container?.container_id || containerId}</span>
                <CopyChip value={container?.machine_ip || ''}>{container?.machine_ip || '-'}</CopyChip>
                <CopyChip value={container?.port || ''}>{container?.port ? `:${container.port}` : '无端口'}</CopyChip>
                <Tag color={collectedAt ? 'blue' : 'default'}>采集 {formatSnapshotTime(collectedAt)}</Tag>
                {container?.created_at ? <Tag>创建于 {formatSnapshotTime(container.created_at)}</Tag> : null}
              </div>
            </div>

            <section className="container-detail-layout detail-main-grid">
              <div className="container-top-row">
              <div className="detail-card container-runtime-card">
                <div className="detail-card-head">
                  <h2>运行指标</h2>
                  {allocDegraded ? <Tag color="orange">配额已按机器上限收缩</Tag> : null}
                </div>
                <div className="detail-metric-grid">
                  {resourceMetrics.map(item => (
                    <div className="detail-metric" key={item.label}>
                      <div className="detail-metric-label">{item.label}</div>
                      <div className="detail-metric-value">{item.value}</div>
                      <div className="detail-metric-extra">{item.extra}</div>
                    </div>
                  ))}
                </div>
                <div className="detail-runtime-list detail-runtime-list-after-chart">
                  <div className="detail-runtime-item">
                    <strong>上次SSH</strong>
                    <span>{formatLastSshTime(container?.last_ssh_login_time)}</span>
                  </div>
                  <div className="detail-runtime-item">
                    <strong>清理倒计时</strong>
                    <span>{formatCleanupCountdown(container?.last_ssh_login_time, container)}</span>
                  </div>
                </div>
                {container?.failed_reason || container?.failed_detail ? (
                  <div className="container-error-banner">
                    {container.failed_reason ? <strong>异常原因：{container.failed_reason}</strong> : null}
                    {container.failed_detail ? <span>{container.failed_detail}</span> : null}
                  </div>
                ) : null}
              </div>

              <div className="detail-card container-operations-card">
                <h2>容器操作</h2>
                <div className="container-operations-actions">
                  <Button
                    type="primary"
                    disabled={!actionState.canStart}
                    loading={actionLoading === '启动'}
                    onClick={() => openContainerActionConfirm('start')}
                  >启动</Button>
                  <Button
                    danger
                    disabled={!actionState.canStop}
                    loading={actionLoading === '停止'}
                    onClick={() => openContainerActionConfirm('stop')}
                  >停止</Button>
                  <Button
                    disabled={!actionState.canRestart}
                    loading={actionLoading === '重启'}
                    onClick={() => openContainerActionConfirm('restart')}
                  >重启</Button>
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    disabled={['building', 'creating'].includes(status)}
                    loading={actionLoading === 'delete'}
                    onClick={handleDeleteContainer}
                  >删除</Button>
                </div>
                <div className="container-secondary-actions">
                  <Checkbox
                    checked={container?.is_long_term === true}
                    disabled={longTermSaving || longTermBlockedByDisk || longTermBlockedByQuota}
                    title={longTermSaving ? undefined
                      : longTermBlockedByDisk ? DISK_OVER_LIMIT_MESSAGE
                        : longTermBlockedByQuota ? '绑定用户已达到长期容器上限'
                          : undefined}
                    onChange={e => handleLongTermToggle(e.target.checked)}
                  >长期容器（不参与清理倒计时）</Checkbox>
                  {hasPermission('container:manage') && (
                    <Button
                      size="small"
                      icon={<UnlockOutlined />}
                      disabled={!actionState.canUnpause}
                      loading={actionLoading === '解冻'}
                      onClick={() => openContainerActionConfirm('unpause')}
                    >解冻</Button>
                  )}
                </div>
                <Typography.Text type="secondary">操作结果即时生效，状态由平台实时采集</Typography.Text>
              </div>
              </div>

              <div className="detail-card container-port-card">
                <h2>端口管理</h2>
                <div className="detail-port-panel">
                  <div className="detail-port-primary">
                    <span className="detail-field-label">SSH 入口</span>
                    <div className="detail-port-chip-row">
                      <CopyChip value={container?.machine_ip || ''}>{container?.machine_ip || '-'}</CopyChip>
                      <CopyChip value={container?.port || ''}>{container?.port ? `:${container.port}` : '无端口'}</CopyChip>
                      <CopyChip value={sshEndpoint}>{sshEndpoint || '-'}</CopyChip>
                    </div>
                  </div>
                  <div className="detail-port-map-list">
                    <span className="detail-field-label">端口映射（docker 自动分配）</span>
                    {portMappings.length ? portMappings.map((item, index) => {
                      const hostPort = item?.host_port ?? item?.external_port ?? item?.port ?? item?.hostPort;
                      const containerPort = item?.container_port ?? item?.internal_port ?? item?.target_port ?? item?.containerPort;
                      const protocol = item?.protocol || 'tcp';
                      const isSsh = Number(containerPort) === 22;
                      return (
                        <div className="detail-port-map" key={`${hostPort}-${containerPort}-${index}`}>
                          <CopyChip value={containerPort || ''}>{containerPort ? `:${containerPort}` : '-'}</CopyChip>
                          <span>→</span>
                          <CopyChip value={hostPort || ''}>{hostPort ? `:${hostPort}` : '-'}</CopyChip>
                          <Tag>{protocol}</Tag>
                          {isSsh && <Tag color="blue">平台保留</Tag>}
                        </div>
                      );
                    }) : <Typography.Text type="secondary">暂无端口映射</Typography.Text>}
                  </div>
                </div>
              </div>

              <div className="detail-card container-people-card">
                <div className="detail-card-head">
                  <h2><TeamOutlined /> 用户管理</h2>
                  <Tag color={canManagePeople ? 'blue' : 'default'}>{accounts.length} 人</Tag>
                </div>
                {canManagePeople ? (
                  <div className="container-people-add">
                    <Select
                      showSearch
                      allowClear
                      placeholder="选择用户"
                      value={selectedUserId}
                      loading={usersLoading}
                      disabled={peopleSaving}
                      optionFilterProp="label"
                      onChange={setSelectedUserId}
                      options={availableUsers.map(user => ({
                        value: user.id,
                        label: `${user.name || user.username} @${user.username}`,
                      }))}
                    />
                    <Select
                      value={selectedRole}
                      disabled={peopleSaving}
                      onChange={setSelectedRole}
                      options={[
                        { value: ROLE.COLLABORATOR, label: '协作者' },
                        { value: ROLE.ADMIN, label: '管理员' },
                      ]}
                    />
                    <Button type="primary" icon={<PlusOutlined />} loading={peopleSaving} disabled={!selectedUserId} onClick={handleAddUser}>添加</Button>
                  </div>
                ) : (
                  <Typography.Text type="secondary">只有容器 ROOT 且容器运行中时可修改人员角色。</Typography.Text>
                )}
                <div className="container-people-list">
                  {accounts.length ? accounts.map(account => (
                    <div className="container-people-item" key={`${account.user_id}-${account.role}`}>
                      <Space align="center" className="container-people-meta">
                        <Avatar src={getAvatarUrl(account.username)} />
                        <div>
                          <Typography.Text strong>{account.ownerName}</Typography.Text>
                          <div className="container-people-sub">@{account.username || '-'} · ID {account.user_id || '-'}</div>
                        </div>
                      </Space>
                      <Space className="container-people-actions">
                        <Select
                          size="small"
                          value={account.role}
                          disabled={!canManagePeople || account.role === ROLE.ROOT || peopleSaving}
                          onChange={value => handleRoleChange(account.user_id, value)}
                          options={[
                            { value: ROLE.COLLABORATOR, label: '协作者' },
                            { value: ROLE.ADMIN, label: '管理员' },
                            { value: ROLE.ROOT, label: '超级管理员' },
                          ]}
                        />
                        <Tag color={roleColor(account.role)}>{roleLabel(account.role)}</Tag>
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          disabled={!canManagePeople || account.role === ROLE.ROOT || peopleSaving}
                          onClick={() => handleRemoveUser(account.user_id)}
                        />
                      </Space>
                    </div>
                  )) : <Typography.Text type="secondary">暂无人员关联</Typography.Text>}
                </div>
              </div>

              <div className="detail-card detail-chart-card container-resource-chart-card">
                <h2>资源趋势</h2>
                <RuntimeTrendChart history={history} series={resourceSeries} emptyText="等待 CPU / 内存快照" ariaLabel="容器资源趋势" />
              </div>

              <div className="detail-card detail-chart-card container-gpu-chart-card">
                <div className="detail-chart-card-head">
                  <h2>GPU 使用趋势</h2>
                  {gpuMissing.length > 0 && (
                    <span className="gpu-absent-warn">
                      ⚠ 分配 GPU {gpuMissing.join('、')} 已连续缺席运行快照（疑似掉卡，本容器实际无此卡可用）
                    </span>
                  )}
                </div>
                <RuntimeTrendChart history={history} series={gpuSeries} emptyText="暂无 GPU 运行快照" ariaLabel="容器 GPU 趋势" />
                {gpuRuntimeDevices.length ? (
                  <div className="detail-runtime-list detail-runtime-list-after-chart">
                    {gpuRuntimeDevices.map(device => (
                      <div className="detail-runtime-item" key={`${device.vendor}-${device.index}`}>
                        <strong>{device.vendor || 'gpu'} {device.index ?? '-'}</strong>
                        <span>
                          {formatNumber(device.utilization_gpu_percent, '%')}
                          {' · '}
                          {formatNumber(device.memory_used_mb, ' MB')} / {formatNumber(device.memory_total_mb, ' MB')}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : <Typography.Text type="secondary">暂无 GPU 运行快照</Typography.Text>}
              </div>

              <div className="detail-card container-image-card">
                <h2>镜像信息</h2>
                <div className="detail-field-grid">
                  <div className="detail-field"><span className="detail-field-label">镜像</span><span className="detail-field-value">{container?.container_image || '-'}</span></div>
                  <div className="detail-field"><span className="detail-field-label">GPU 分配</span><span className="detail-field-value">{gpuDevices.length ? gpuDevices.join(', ') : formatNumber(allocGpu, ' 张')}</span></div>
                  <div className="detail-field"><span className="detail-field-label">共享内存</span><span className="detail-field-value">{formatNumber(container?.shared_gb, ' GB')}</span></div>
                </div>
                {container?.image_dockerfile ? (
                  <pre className="container-dockerfile">{container.image_dockerfile}</pre>
                ) : null}
              </div>

              <div className="detail-card container-log-card">
                <h2>操作历史</h2>
                {operationLogs.length ? (
                  <div className="container-oplog-list">
                    {operationLogs.map(log => (
                      <div className="container-oplog-item" key={log.id}>
                        <span className="container-oplog-op">{CONTAINER_OPERATION_LABELS[log.operation] || log.operation}</span>
                        <span className="container-oplog-user">{log.operator_username || '系统'}</span>
                        <span className="container-oplog-time">{formatSnapshotTime(log.created_at)}</span>
                        <Tag color={log.success ? 'green' : 'red'}>{log.success ? '成功' : '失败'}</Tag>
                      </div>
                    ))}
                  </div>
                ) : <Typography.Text type="secondary">暂无操作记录</Typography.Text>}
              </div>
            </section>

            <ContainerActionConfirmModal
              visible={containerActionConfirm.visible}
              action={containerActionConfirm.action}
              container={container}
              loading={Boolean(actionLoading)}
              onConfirm={handleConfirmContainerAction}
              onCancel={closeContainerActionConfirm}
            />
          </>
        )}
      </div>
    </main>
  );
};

export default ContainerDetailPage;
