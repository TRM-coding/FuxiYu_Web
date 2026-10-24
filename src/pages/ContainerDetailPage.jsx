import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Avatar, Button, Checkbox, Select, Space, Spin, Tag, Typography, message } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, PlusOutlined, ReloadOutlined, TeamOutlined, UnlockOutlined } from '@ant-design/icons';
import {
  addCollaborator,
  deleteContainer,
  getContainerDetailInformation,
  getContainerOperationLogs,
  removeCollaborator,
  resetContainerPassword,
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
import { toErrorModalInput } from '../utils/errorModalInput';
import CredentialModal from '../components/CredentialModal';
import ConfirmModal from '../components/ConfirmModal';
import { formatNumber, formatSnapshotTime, formatContainerImage } from '../utils/detailFormat';
import { formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';
import {
  canResetContainerCredentials,
  createContainerStatusTransition,
  deriveContainerEffectiveStatus,
  getContainerActionReasonText,
  getContainerRoleFromAccounts,
  resolveContainerActions,
} from '../utils/containerActions';
import { useContainerSnapshots } from '../utils/containerSnapshots';

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
  reset_container_password: '重置容器密码',
  set_long_term: '设置长期容器',
  send_cleanup_reminder: '发送清理提醒',
};
import { getContainerStatusDisplay } from '../utils/statusDisplay';
import { POLL_TIMEOUT } from '../configs/backend_config';
import { LIST_REFRESH_INTERVAL_MS, canRunListRefresh } from '../utils/listRefresh';
import { usePermission } from '../contexts/PermissionContext';
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
  const [credentials, setCredentials] = useState([]);
  const [resetConfirm, setResetConfirm] = useState(null);
  const [resetSaving, setResetSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // 'start' | 'stop' | 'restart' | 'unpause' | 'delete' | null
  const [containerActionConfirm, setContainerActionConfirm] = useState({ visible: false, action: '' });
  const {
    entities,
    userId: currentUserId,
    userName: currentUserName,
    hasPermission,
    containerResourceUnrestricted,
  } = usePermission();
  const pendingContainerTransitionRef = useRef(new Map());
  const operationLogsRequestSeqRef = useRef(0);
  const operationLogsMountedRef = useRef(true);
  const operationLogsCurrentRequestRef = useRef({ seq: 0, containerId: null, inFlight: false });
  const detailRequestSeqRef = useRef(0);
  const detailCurrentRequestRef = useRef({ seq: 0, containerId: null, inFlight: false });
  const loadingRequestSeqRef = useRef(0);
  const detailMountedRef = useRef(true);
  const usersRequestSeqRef = useRef(0);
  const navigationEpochRef = useRef(0);
  const containerIdRef = useRef(containerId);
  containerIdRef.current = containerId;
  const {
    remember: rememberContainerSnapshot,
    markUnavailable: markContainerUnavailable,
    get: getContainerSnapshot,
  } = useContainerSnapshots();

  const applyContainerEffectiveStatus = useCallback((detail) => {
    if (!detail) return detail;
    const key = containerId === undefined || containerId === null ? '' : String(containerId);
    const result = deriveContainerEffectiveStatus(
      detail.effective_status,
      key ? pendingContainerTransitionRef.current.get(key) : null,
      Date.now(),
    );
    if (result.pendingTransition) {
      pendingContainerTransitionRef.current.set(key, result.pendingTransition);
    } else if (result.cleared) {
      pendingContainerTransitionRef.current.delete(key);
    }
    return { ...detail, effective_status: result.status };
  }, [containerId]);

  const markContainerTransition = (detail, transitionStatus, targetStatus) => {
    if (!containerId) return;
    pendingContainerTransitionRef.current.set(
      String(containerId),
      createContainerStatusTransition(detail?.effective_status, transitionStatus, {
        targetStatus,
        startedAt: Date.now(),
      }),
    );
  };

  const resolveActionsFor = (detail, extraLoading = {}) => {
    const loading = {
      start: extraLoading.start === true || actionLoading === 'start',
      stop: extraLoading.stop === true || actionLoading === 'stop',
      restart: extraLoading.restart === true || actionLoading === 'restart',
      unpause: extraLoading.unpause === true || actionLoading === 'unpause',
      delete: extraLoading.delete === true || actionLoading === 'delete',
      long_term_enable: extraLoading.long_term_enable === true || longTermSaving,
      long_term_disable: extraLoading.long_term_disable === true || longTermSaving,
    };
    return resolveContainerActions({
      container: {
        is_long_term: detail?.is_long_term,
        effective_status: detail?.effective_status,
        long_term_container_can_enable: detail?.long_term_container_can_enable,
        disk_usage_percent: detail?.disk_usage_percent,
        disk_usage: detail?.disk_usage,
      },
      context: {
        permissions: entities,
        containerRole: getContainerRoleFromAccounts(detail?.accounts, currentUserId, currentUserName),
        readOnly: false,
      },
      pendingTransition: containerId ? pendingContainerTransitionRef.current.get(String(containerId)) : null,
      loading,
    });
  };

  const loadDetail = useCallback(async ({ silent = false, background = false, timeout = null } = {}) => {
    if (!containerId) return;
    const requestedContainerId = String(containerId);
    if (String(containerIdRef.current) !== requestedContainerId) return;
    // 只约束当前容器的当前有效请求：旧路由/已淘汰请求仍在途也不算新页阻塞。
    const activeRequest = detailCurrentRequestRef.current;
    if (background && activeRequest.inFlight && activeRequest.containerId === requestedContainerId) return;
    const requestSeq = detailRequestSeqRef.current + 1;
    detailRequestSeqRef.current = requestSeq;
    detailCurrentRequestRef.current = {
      seq: requestSeq,
      containerId: requestedContainerId,
      inFlight: true,
    };
    if (!silent) {
      // loading 属于发起它的那次显式请求生命周期，不依赖“它仍是最新 seq”。
      loadingRequestSeqRef.current = requestSeq;
      setLoading(true);
    }
    let errorPayload = null;
    try {
      const detailRequest = timeout == null
        ? getContainerDetailInformation(Number(containerId))
        : getContainerDetailInformation(Number(containerId), timeout);
      const res = await detailRequest;
      // 旧路由、旧请求或卸载后的响应一律不写状态。
      if (!detailMountedRef.current) return;
      if (detailRequestSeqRef.current !== requestSeq) return;
      if (String(containerIdRef.current) !== requestedContainerId) return;
      const detail = res?.container_info || res?.container || res?.data || res;
      if (!detail || (typeof detail === 'object' && Object.keys(detail).length === 0)) {
        markContainerUnavailable(containerId);
        setContainer(null);
        return;
      }
      const withPending = applyContainerEffectiveStatus(detail);
      rememberContainerSnapshot(withPending, 'detail');
      setContainer(withPending);
      setHistory(prev => addHistoryPoint(prev, detail?.runtime_metrics));
    } catch (err) {
      if (!detailMountedRef.current) return;
      if (detailRequestSeqRef.current !== requestSeq) return;
      if (String(containerIdRef.current) !== requestedContainerId) return;
      if (background) {
        // 周期刷新失败保留既有详情；不每 5 秒弹错误窗，前台显式操作仍会提示。
        console.warn('container detail background refresh failed', err?.message);
        return;
      }
      errorPayload = { message: err?.body || err || '获取容器详情失败', status: err?.status, route: err?.route };
    } finally {
      if (detailCurrentRequestRef.current.seq === requestSeq) {
        detailCurrentRequestRef.current = { ...detailCurrentRequestRef.current, inFlight: false };
      }
      // 错误弹窗可能等用户很久；网络请求结束即释放 loading 和后台占用。
      if (!silent && detailMountedRef.current
        && String(containerIdRef.current) === requestedContainerId
        && loadingRequestSeqRef.current === requestSeq) {
        loadingRequestSeqRef.current = 0;
        setLoading(false);
      }
    }
    if (errorPayload) {
      await showErrorModal(errorPayload);
    }
  }, [applyContainerEffectiveStatus, containerId, markContainerUnavailable, rememberContainerSnapshot]);

  const loadOperationLogs = useCallback(async ({ background = false, timeout = null } = {}) => {
    if (!containerId) return;
    const requestedContainerId = String(containerId);
    // 旧容器的异步动作/刷新不再抢占当前容器的请求序号。
    if (String(containerIdRef.current) !== requestedContainerId) return;
    const activeRequest = operationLogsCurrentRequestRef.current;
    if (background && activeRequest.inFlight && activeRequest.containerId === requestedContainerId) return;
    const requestSeq = operationLogsRequestSeqRef.current + 1;
    operationLogsRequestSeqRef.current = requestSeq;
    operationLogsCurrentRequestRef.current = {
      seq: requestSeq,
      containerId: requestedContainerId,
      inFlight: true,
    };
    try {
      const logsRequest = timeout == null
        ? getContainerOperationLogs(Number(containerId))
        : getContainerOperationLogs(Number(containerId), timeout);
      const res = await logsRequest;
      // 旧容器/旧刷新的响应晚到时不得覆盖当前容器的历史；卸载后也不再写状态。
      if (!operationLogsMountedRef.current) return;
      if (operationLogsRequestSeqRef.current !== requestSeq) return;
      if (String(containerIdRef.current) !== requestedContainerId) return;
      if (Array.isArray(res?.logs)) setOperationLogs(res.logs);
    } catch (err) {
      if (!operationLogsMountedRef.current) return;
      if (operationLogsRequestSeqRef.current !== requestSeq) return;
      if (String(containerIdRef.current) !== requestedContainerId) return;
      console.warn('load container operation logs failed', err?.message);
    } finally {
      if (operationLogsCurrentRequestRef.current.seq === requestSeq) {
        operationLogsCurrentRequestRef.current = { ...operationLogsCurrentRequestRef.current, inFlight: false };
      }
    }
  }, [containerId]);

  const loadUsers = useCallback(async () => {
    const requestSeq = usersRequestSeqRef.current + 1;
    usersRequestSeqRef.current = requestSeq;
    setUsersLoading(true);
    try {
      const res = await listAllUserBrefInformation({ page_number: 1, page_size: 100 });
      if (!detailMountedRef.current || usersRequestSeqRef.current !== requestSeq) return;
      const rawUsers = res?.users || res?.user_list || res?.data || [];
      setUsersList(Array.isArray(rawUsers) ? rawUsers.map(normalizeUser).filter(user => user.id !== undefined && user.id !== null) : []);
    } catch (err) {
      if (!detailMountedRef.current || usersRequestSeqRef.current !== requestSeq) return;
      console.warn('list users for container detail failed', err);
    } finally {
      if (detailMountedRef.current && usersRequestSeqRef.current === requestSeq) setUsersLoading(false);
    }
  }, []);

  useEffect(() => {
    detailMountedRef.current = true;
    return () => {
      detailMountedRef.current = false;
      detailRequestSeqRef.current += 1;
      usersRequestSeqRef.current += 1;
    };
  }, []);

  useLayoutEffect(() => {
    // 导航 epoch 与 5s 详情刷新序号分离：同容器慢请求不会被周期刷新淘汰，
    // 但 A→B→A 返回同 ID 时，离开前的旧凭据请求也不得通过。
    navigationEpochRef.current += 1;
    setCredentials(prev => (prev.length ? [] : prev));
    setResetConfirm(prev => (prev ? null : prev));
  }, [containerId]);

  useEffect(() => {
    loadDetail();
    loadUsers();
    const refreshIfVisible = () => {
      if (!canRunListRefresh()) return undefined;
      // 完整详情是容器可变事实的权威来源：accounts/owners、长期、冻结、磁盘、SSH
      // 等字段都随 5s 周期收敛，不再另开 status 轮询与详情互相覆盖。
      // 操作历史也随同一拍复读，异步 add/remove/role/reset 的终态无需用户手刷。
      return Promise.all([
        loadDetail({ silent: true, background: true, timeout: POLL_TIMEOUT }),
        loadOperationLogs({ background: true, timeout: POLL_TIMEOUT }),
      ]);
    };
    const timer = setInterval(refreshIfVisible, LIST_REFRESH_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshIfVisible);
    }
    return () => {
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshIfVisible);
      }
      // 同一页面切换容器时淘汰上一路由的详情/用户响应。
      detailRequestSeqRef.current += 1;
      usersRequestSeqRef.current += 1;
    };
  }, [containerId, loadDetail, loadOperationLogs, loadUsers]);

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
  }, [container?.runtime_metrics?.gpu]);

  // 操作历史（op-log）：能看容器的即可看其事件；进入时与刷新/动作后共用同一请求序号。
  useEffect(() => {
    operationLogsMountedRef.current = true;
    return () => {
      operationLogsMountedRef.current = false;
      operationLogsRequestSeqRef.current += 1;
    };
  }, []);

  useEffect(() => {
    loadOperationLogs();
    return () => {
      operationLogsRequestSeqRef.current += 1;
    };
  }, [loadOperationLogs]);

  // 容器操作（详情页直连 API；状态与成员等详情事实由 5s 完整详情刷新兜底）
  const [longTermSaving, setLongTermSaving] = useState(false);

  const latestDetail = () => getContainerSnapshot(containerId) || container;

  const preflightDetailAction = (actionKey) => {
    const detail = latestDetail();
    if (!detail) {
      message.warning(getContainerActionReasonText('container_no_longer_available'));
      return { ok: false, detail: null, action: null };
    }
    const action = resolveActionsFor(detail, { [actionKey]: false }).actions[actionKey];
    if (!action || !action.visible || !action.enabled) {
      message.warning(getContainerActionReasonText(action?.reason) || '当前不可执行该操作');
      return { ok: false, detail, action };
    }
    return { ok: true, detail, action };
  };

  const runAction = async (actionKey, action, label) => {
    if (!containerId) return false;
    const before = preflightDetailAction(actionKey);
    if (!before.ok) {
      await loadDetail({ silent: true });
      return false;
    }
    setActionLoading(actionKey);
    try {
      await action(Number(containerId));
      message.success(label === '解冻' ? '解冻指令已发送' : `${label}成功`);
      const transitionStatus = {
        start: 'starting',
        stop: 'stopping',
        restart: 'restarting',
        unpause: 'unpausing',
      }[actionKey];
      const targetStatus = {
        start: 'online',
        stop: 'offline',
        restart: 'online',
        unpause: 'online',
      }[actionKey];
      markContainerTransition(before.detail, transitionStatus, targetStatus);
      const patched = applyContainerEffectiveStatus({
        ...before.detail,
        effective_status: transitionStatus,
      });
      rememberContainerSnapshot(patched, 'local-status');
      setContainer(prev => (prev ? applyContainerEffectiveStatus({ ...prev, effective_status: transitionStatus }) : prev));
      await loadDetail({ silent: true });
      await loadOperationLogs();
      return true;
    } catch (err) {
      if (containerId) pendingContainerTransitionRef.current.delete(String(containerId));
      await showErrorModal({ message: err?.body || err || `${label}失败`, status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      await loadDetail({ silent: true });
      return false;
    } finally {
      setActionLoading(null);
    }
  };

  const handleLongTermToggle = async (checked) => {
    if (!containerId) return;
    const detail = latestDetail();
    const before = detail ? resolveActionsFor(detail).longTerm : null;
    if (!before || !before.visible || !before.enabled) {
      message.warning(getContainerActionReasonText(before?.reason) || '当前不可切换长期状态');
      await loadDetail({ silent: true });
      return;
    }
    if ((before.actionKey === 'long_term_enable') !== (checked === true)) return;
    setLongTermSaving(true);
    try {
      await setLongTermContainer({ container_id: Number(containerId), is_long_term: checked });
      message.success(checked ? '已设为长期容器' : '已取消长期容器');
      await loadDetail({ silent: true });
      await loadOperationLogs();
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '设置长期容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      await loadDetail({ silent: true });
    } finally {
      setLongTermSaving(false);
    }
  };
  const handleDeleteContainer = () => {
    setContainerActionConfirm({ visible: true, action: 'delete' });
  };
  const handleConfirmDeleteContainer = async () => {
    const before = preflightDetailAction('delete');
    if (!before.ok) {
      setContainerActionConfirm({ visible: false, action: '' });
      await loadDetail({ silent: true });
      return;
    }
    setActionLoading('delete');
    try {
      await deleteContainer(Number(containerId));
      markContainerUnavailable(containerId);
      message.success('容器已删除');
      setContainerActionConfirm({ visible: false, action: '' });
      navigate('/index');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '删除失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      setContainerActionConfirm({ visible: false, action: '' });
      await loadDetail({ silent: true });
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
    const actionMap = {
      start: { fn: startContainer, label: '启动' },
      stop: { fn: stopContainer, label: '停止' },
      restart: { fn: restartContainer, label: '重启' },
      unpause: { fn: unpauseContainer, label: '解冻' },
    };
    const selected = actionMap[action];
    if (!selected) return;
    await runAction(action, selected.fn, selected.label);
    setContainerActionConfirm({ visible: false, action: '' });
  };

  const status = String(container?.effective_status || 'unknown').toLowerCase();
  const statusDisplay = getContainerStatusDisplay(status);
  const metrics = useMemo(() => container?.runtime_metrics || {}, [container?.runtime_metrics]);
  const diskUsage = container?.disk_usage || {};
  const resolvedActions = container ? resolveActionsFor(container) : null;
  const actions = resolvedActions?.actions;
  const longTermAction = resolvedActions?.longTerm;
  const reasonTitle = action => getContainerActionReasonText(action?.reason) || undefined;
  const latestHistoryPoint = history.length ? history[history.length - 1] : null;
  const collectedAt = latestHistoryPoint?.collectedAt || metrics?.collected_at || metrics?.cache_updated_at;
  const gpuDevices = useMemo(() => metrics?.gpu?.device_ids || [], [metrics]);
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
  // 只消费既有详情响应里的可空字段；不按容器名/机器名/端口拼猜，也不向 Node 核实。
  const bindMountPath = typeof container?.bind_mount_path === 'string' ? container.bind_mount_path : '';
  const sshEndpoint = container?.machine_ip && container?.port ? `${container.machine_ip}:${container.port}` : '';
  // 端口映射（docker 自动分配，Node inspect 回填落库；后端出参已派生补齐 22→port）
  const portMappings = Array.isArray(container?.port_mappings) ? container.port_mappings : [];
  const accounts = (container?.accounts || []).map(account => normalizeAccount(account, usersList));
  const isRoot = accounts.some(account => account.role === ROLE.ROOT && String(account.user_id) === String(currentUserId));
  const canManagePeople = isRoot && status === 'online';
  const hasOperationPermission = typeof hasPermission === 'function'
    ? hasPermission('container:operation')
    : entities.includes('container:operation');
  const resetEligibility = canResetContainerCredentials({
    accounts,
    userId: currentUserId,
    userName: currentUserName,
    containerResourceUnrestricted,
    hasOperationPermission,
    containerStatus: status,
  });
  const availableUsers = usersList.filter(user => !accounts.some(account => String(account.user_id) === String(user.id)));
  const refreshAfterPeopleChange = async () => {
    await loadDetail({ silent: true });
    // 受理后的立即重取通常仍是旧终态；后续 5s 后台复读负责收敛。
    await loadOperationLogs();
    // 成员变更后重取候选用户；平台用户列表不参与 5s 周期轮询。
    await loadUsers();
  };
  // 凭据/角色请求返回时，页面可能已切换容器、离开后返回同 ID 或卸载。
  const isCurrentContainerRequest = (requestContainerId, requestNavigationEpoch) => (
    detailMountedRef.current
    && requestNavigationEpoch === navigationEpochRef.current
    && String(containerIdRef.current) === String(requestContainerId)
  );
  const handleAddUser = async () => {
    if (!selectedUserId || !containerId) return;
    const requestContainerId = String(containerId);
    const requestNavigationEpoch = navigationEpochRef.current;
    setPeopleSaving(true);
    try {
      const res = await addCollaborator({ user_id: selectedUserId, container_id: Number(containerId), role: selectedRole });
      if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
      setSelectedUserId(null);
      setSelectedRole(ROLE.COLLABORATOR);
      setCredentials(res?.credentials || []);
      message.success('新增协作者请求已受理');
      await refreshAfterPeopleChange();
    } catch (err) {
      if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
      await showErrorModal(toErrorModalInput(err, '添加用户失败'));
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
      await showErrorModal(toErrorModalInput(err, '移除用户失败'));
    } finally {
      setPeopleSaving(false);
    }
  };
  const handleRoleChange = async (userId, updatedRole) => {
    if (!userId || !containerId) return;
    const requestContainerId = String(containerId);
    const requestNavigationEpoch = navigationEpochRef.current;
    setPeopleSaving(true);
    try {
      if (updatedRole === ROLE.ROOT) {
        // 与 Home 共用同一 ROOT 交接语义：只发一次目标请求，由 Ctrl 后台降旧 ROOT、
        // 升目标为唯一 ROOT，并返回永久 root 与原 owner 独立账号的凭据。
        const res = await updateRole({
          container_id: Number(containerId),
          user_id: userId,
          updated_role: ROLE.ROOT,
        });
        if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
        setCredentials(res?.credentials || []);
        message.success('ROOT 交接请求已受理');
      } else {
        await updateRole({ container_id: Number(containerId), user_id: userId, updated_role: updatedRole });
        if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
        message.success('角色已更新');
      }
      await refreshAfterPeopleChange();
    } catch (err) {
      if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
      await showErrorModal(toErrorModalInput(err, '更新角色失败'));
    } finally {
      setPeopleSaving(false);
    }
  };

  const openResetConfirm = (account) => {
    if (!resetEligibility.visible || !resetEligibility.enabled || !account?.user_id || peopleSaving) return;
    setResetConfirm(account);
  };

  const confirmResetPassword = async () => {
    const account = resetConfirm;
    if (!account?.user_id || !resetEligibility.visible || !resetEligibility.enabled) {
      setResetConfirm(null);
      return;
    }
    const requestContainerId = String(containerId);
    const requestNavigationEpoch = navigationEpochRef.current;
    setResetSaving(true);
    try {
      const res = await resetContainerPassword({
        container_id: Number(containerId),
        user_id: Number(account.user_id),
      });
      if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
      setCredentials(res?.credentials || []);
      setResetConfirm(null);
      message.success('重置密码请求已受理');
    } catch (err) {
      if (!isCurrentContainerRequest(requestContainerId, requestNavigationEpoch)) return;
      await showErrorModal(toErrorModalInput(err, '重置密码失败'));
    } finally {
      setResetSaving(false);
    }
  };

  // GPU 分配与共享内存是运行资源配置，和 CPU/内存/网络/磁盘同属运行指标；
  // 镜像卡只保留镜像身份与 Dockerfile。
  const gpuAllocationText = gpuDevices.length ? gpuDevices.join(', ') : formatNumber(allocGpu, ' 张');
  const resourceMetrics = useMemo(() => ([
    { label: 'CPU', value: formatNumber(metrics.cpu_usage_percent, '%'), extra: `配额 ${formatNumber(allocCpu, ' 核')}` },
    { label: '内存', value: formatNumber(metrics.memory_usage_percent, '%'), extra: `${formatNumber(metrics.memory_usage_mb, ' MB')} / ${memoryLimitText} · 配额 ${formatNumber(allocMem, ' GB')}` },
    { label: 'GPU 分配', value: gpuAllocationText, extra: gpuDevices.length ? '设备编号' : '分配数量' },
    { label: '共享内存', value: formatNumber(container?.shared_gb, ' GB'), extra: '共享配额' },
    { label: '网络', value: formatNumber(networkTotal, ' MB'), extra: `入 ${formatNumber(metrics.network_rx_mb, ' MB')} / 出 ${formatNumber(metrics.network_tx_mb, ' MB')}` },
    { label: '磁盘', value: formatNumber(diskUsage.total_gb, ' GB'), extra: `上限 ${formatNumber(diskUsage.limit_gb, ' GB')} · IO ${formatNumber(diskIoTotal, ' MB')}` },
  ]), [container, metrics, networkTotal, diskIoTotal, memoryLimitText, allocCpu, allocMem, gpuAllocationText, gpuDevices, diskUsage.limit_gb, diskUsage.total_gb]);

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
          <Button icon={<ReloadOutlined />} onClick={() => { loadDetail(); loadUsers(); loadOperationLogs(); }}>刷新</Button>
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
                <div className="detail-field detail-field-bind-mount-path container-runtime-bind-path">
                  <span className="detail-field-label">宿主 bind 路径</span>
                  <div className="detail-field-value bind-mount-path-value">
                    {bindMountPath ? (
                      <CopyChip value={bindMountPath} className="bind-mount-path-chip" block>
                        {bindMountPath}
                      </CopyChip>
                    ) : (
                      <Typography.Text type="secondary">未记录</Typography.Text>
                    )}
                    <Typography.Text type="secondary" className="bind-mount-path-note">
                      最近记录，非实时核对
                    </Typography.Text>
                  </div>
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
                  {actions?.start.visible && (
                    <Button
                      type="primary"
                      disabled={!actions.start.enabled}
                      loading={actions.start.loading}
                      title={reasonTitle(actions.start)}
                      onClick={() => openContainerActionConfirm('start')}
                    >启动</Button>
                  )}
                  {actions?.stop.visible && (
                    <Button
                      danger
                      disabled={!actions.stop.enabled}
                      loading={actions.stop.loading}
                      title={reasonTitle(actions.stop)}
                      onClick={() => openContainerActionConfirm('stop')}
                    >停止</Button>
                  )}
                  {actions?.restart.visible && (
                    <Button
                      disabled={!actions.restart.enabled}
                      loading={actions.restart.loading}
                      title={reasonTitle(actions.restart)}
                      onClick={() => openContainerActionConfirm('restart')}
                    >重启</Button>
                  )}
                  {actions?.delete.visible && (
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      disabled={!actions.delete.enabled}
                      loading={actions.delete.loading}
                      title={reasonTitle(actions.delete)}
                      onClick={handleDeleteContainer}
                    >删除</Button>
                  )}
                </div>
                <div className="container-secondary-actions">
                  {longTermAction?.visible && (
                    <Checkbox
                      checked={longTermAction.checked === true}
                      disabled={longTermAction.disabled}
                      title={reasonTitle(longTermAction)}
                      onChange={e => handleLongTermToggle(e.target.checked)}
                    >长期容器（不参与清理倒计时）</Checkbox>
                  )}
                  {actions?.unpause.visible && (
                    <Button
                      size="small"
                      icon={<UnlockOutlined />}
                      disabled={!actions.unpause.enabled}
                      loading={actions.unpause.loading}
                      title={reasonTitle(actions.unpause)}
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
                      onOpenChange={open => { if (open) loadUsers(); }}
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
                        {resetEligibility.visible ? (
                          <Button
                            size="small"
                            disabled={!resetEligibility.enabled || !account.user_id || peopleSaving}
                            title={resetEligibility.enabled ? undefined : '仅在线且具备操作权限时可重置密码'}
                            onClick={() => openResetConfirm(account)}
                          >
                            重置密码
                          </Button>
                        ) : null}
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
                  <div className="detail-field"><span className="detail-field-label">镜像</span><span className="detail-field-value">{formatContainerImage(container?.image_name)}</span></div>
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
            <ConfirmModal
              visible={Boolean(resetConfirm)}
              title="确认重置密码"
              message={`确定要重置 ${resetConfirm?.username || resetConfirm?.ownerName || ''} 的密码吗？`}
              confirmText="确认重置"
              onConfirm={confirmResetPassword}
              onCancel={() => setResetConfirm(null)}
              loading={resetSaving}
            />
            <CredentialModal
              open={credentials.length > 0}
              credentials={credentials}
              onClose={() => setCredentials([])}
            />
          </>
        )}
      </div>
    </main>
  );
};

export default ContainerDetailPage;
