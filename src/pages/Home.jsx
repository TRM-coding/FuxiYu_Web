import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, UnlockOutlined } from '@ant-design/icons';
import { Flex, Typography, Row, Col, Button, Input, Space, Tag, message, Checkbox } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import ConfirmModal from '../components/ConfirmModal';
import ContainerActionConfirmModal from '../components/ContainerActionConfirmModal';
import EditUserModal from '../components/EditUserModal';
import { listAllContainerBrefInformation, getContainerDetailInformation, deleteContainer, removeCollaborator, startContainer, stopContainer, restartContainer, refreshLastSshLoginTime, setLongTermContainer, unpauseContainer } from '../api/container_api';
import { formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';
import { CONTAINER_TERMINAL_STATES, createContainerStatusTransition, deriveContainerEffectiveStatus, getContainerActionState, getRoleActionSet } from '../utils/containerActions';
import { startContainerStatusHeartbeat, watchIngContainerUntilTerminal, ING_CONTAINER_STATES } from '../utils/heartbeat';
import { LIST_REFRESH_INTERVAL_MS, canRunListRefresh, containerListFingerprint } from '../utils/listRefresh';
import { useLocation } from 'react-router-dom';
import { listAllUserBrefInformation } from '../api/user_api';
import { isAbortError } from '../utils/requestManager';
import ContainerDetailModal from '../components/ContainerDetailModal';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
import { usePermission } from '../contexts/PermissionContext';
import CopyChip from '../components/CopyChip';
import './Home.css';

const Desc = props => (
  <Flex justify="center" align="center" className="home-desc-flex">
    <Typography.Title type="secondary" level={5} className="home-desc-title">
      {props.text}
    </Typography.Title>
  </Flex>
);


// will be populated from backend
const initialContainers = [];

const Home = () => {
  const [value3, setValue3] = useState('Any');
  const [position, setPosition] = useState('end');
  const { barRef: statsBarRef, barStyle: statsBarStyle } = useAutoHideTopBar();
  const navigate = useNavigate();

  // read current user name from localStorage; if missing or error, clear auth and redirect to login
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        // require both name and id; if missing, show 401 modal then clear auth and force login
        if (!name || !id) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          // 401: clear auth and navigate to login
          handleAuthError(401, navigate);
          return;
        }
        setCurrentUserName(name);
        setCurrentUserId(id);
      } catch (e) {
        if (!sessionStorage.getItem('auth_modal_shown')) {
          try {
            sessionStorage.setItem('auth_modal_shown', '1');
            await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          } finally {
            sessionStorage.removeItem('auth_modal_shown');
          }
        }
        // 401: clear auth and navigate to login
        handleAuthError(401, navigate);
      }
    };
    checkAuth();
  }, [navigate]);

  // containers state loaded from backend
  const [containers, setContainers] = useState(initialContainers);
  const [loadingContainers, setLoadingContainers] = useState(false);
  const [sshRefreshingMap, setSshRefreshingMap] = useState({});
  const [longTermRemaining, setLongTermRemaining] = useState(null);
  const [longTermLimit, setLongTermLimit] = useState(null);
  const [longTermUpdatingMap, setLongTermUpdatingMap] = useState({});
  const [unpauseMap, setUnpauseMap] = useState({});
  const { hasPermission } = usePermission();
  const pendingContainerTransitionRef = useRef(new Map());
  const containerListFingerprintRef = useRef('');

  const applyContainerEffectiveStatus = (container) => {
    const cid = container?.key || container?.container_id;
    if (!cid) return container;
    const key = String(cid);
    const result = deriveContainerEffectiveStatus(
      container.effective_status,
      pendingContainerTransitionRef.current.get(key),
    );
    if (result.pendingTransition) {
      pendingContainerTransitionRef.current.set(key, result.pendingTransition);
    } else if (result.cleared) {
      pendingContainerTransitionRef.current.delete(key);
    }
    return { ...container, effective_status: result.status };
  };

  const markContainerTransition = (container, transitionStatus, targetStatus) => {
    const cid = container?.key || container?.container_id;
    if (!cid) return;
    pendingContainerTransitionRef.current.set(
      String(cid),
      createContainerStatusTransition(container?.effective_status, transitionStatus, { targetStatus }),
    );
  };

  const clearContainerTransition = (cid) => {
    if (cid) pendingContainerTransitionRef.current.delete(String(cid));
  };

  const patchContainerStatus = (cid, status) => {
    setContainers(prev => prev.map(c => (
      String(c.key) === String(cid)
        ? applyContainerEffectiveStatus({ ...c, effective_status: status })
        : c
    )));
  };


  const refreshSshTimeForContainer = async (containerId, options = {}) => {
    const { silent = false } = options;
    if (!containerId) return null;
    setSshRefreshingMap(prev => ({ ...prev, [String(containerId)]: true }));
    try {
      const res = await refreshLastSshLoginTime(Number(containerId));
      const value = (res && Object.prototype.hasOwnProperty.call(res, 'last_ssh_login_time'))
        ? res.last_ssh_login_time
        : null;
      const cleanup_after_days = res?.cleanup_after_days ?? null;
      const cleanup_at = res?.cleanup_at ?? null;
      const seconds_until_cleanup = res?.seconds_until_cleanup ?? null;
      const cleanup_status = res?.cleanup_status ?? null;
      setContainers(prev => prev.map(c => (
        String(c.key) === String(containerId)
          ? {
            ...c,
            last_ssh_login_time: value,
            cleanup_after_days,
            cleanup_at,
            seconds_until_cleanup,
            cleanup_status,
          }
          : c
      )));
      if (!silent) message.success('SSH 登录时间已刷新');
      return value;
    } catch (err) {
      if (!silent) {
        await showErrorModal({ message: err?.body || err || '刷新 SSH 登录时间失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      }
      return null;
    } finally {
      setSshRefreshingMap(prev => ({ ...prev, [String(containerId)]: false }));
    }
  };

  const refreshSshTimeForAllContainers = async (list) => {
    if (!Array.isArray(list) || list.length === 0) return;
    await Promise.allSettled(
      list
        .map(c => c?.key)
        .filter(Boolean)
        .map(cid => refreshSshTimeForContainer(cid, { silent: true }))
    );
  };

  useEffect(() => {
    if (!currentUserId) return; // wait until we have the id
    let mounted = true;
    let refreshing = false;
    const load = async ({ silent = false, refreshSsh = false } = {}) => {
      if (refreshing) return;
      refreshing = true;
      if (!silent) setLoadingContainers(true);
      try {
        // machine_id should be null for this global list request
        // pagination: backend expects pages starting from 0
        const res = await listAllContainerBrefInformation({ machine_id: null, user_id: Number(currentUserId), page_number: 0, page_size: 100 });
        const items = (res && (res.containers_info || res.containers)) || [];
        const mapped = items.map((c, idx) => applyContainerEffectiveStatus({
          key: c.container_id ? String(c.container_id) : `c-${idx}`,
          container_id: c.container_id ?? null,
          container_name: c.container_name || c.name || `container-${idx}`,
          container_image: c.container_image || '',
          port: c.port ? String(c.port) : (c.port_str || ''),
          effective_status: (c.effective_status || '').toLowerCase(),
          failed_reason: c.failed_reason ?? null,
          failed_detail: c.failed_detail ?? null,
          machine_id: c.machine_id ? String(c.machine_id) : null,
          machine_ip: c.machine_ip || '',
          accounts: c.accounts || [],
          is_long_term: c.is_long_term === true,
          long_term_container_can_enable: c.long_term_container_can_enable !== false,
          last_ssh_login_time: c.last_ssh_login_time ?? null,
          cleanup_after_days: c.cleanup_after_days ?? null,
          cleanup_at: c.cleanup_at ?? null,
          seconds_until_cleanup: c.seconds_until_cleanup ?? null,
          cleanup_status: c.cleanup_status ?? null,
          disk_total_gb: c.disk_total_gb ?? null,
          disk_limit_gb: c.disk_limit_gb ?? null,
          disk_usage_percent: c.disk_usage_percent ?? null,
          runtime_metrics: c.runtime_metrics ?? null,
          freeze_first_frozen_at: c.freeze_first_frozen_at ?? null,
          freeze_grace_until: c.freeze_grace_until ?? null,
          freeze_days_frozen: c.freeze_days_frozen ?? null,
          freeze_escalation_days: c.freeze_escalation_days ?? null,
        }));
        const nextRemaining = Object.prototype.hasOwnProperty.call(res || {}, 'long_term_container_remaining')
          ? Number(res.long_term_container_remaining)
          : longTermRemaining;
        const nextLimit = Object.prototype.hasOwnProperty.call(res || {}, 'long_term_container_limit')
          ? Number(res.long_term_container_limit)
          : longTermLimit;
        const fingerprint = containerListFingerprint(mapped, {
          long_term_container_remaining: nextRemaining,
          long_term_container_limit: nextLimit,
        });
        if (!mounted) return;
        if (!silent || fingerprint !== containerListFingerprintRef.current) {
          containerListFingerprintRef.current = fingerprint;
          setContainers(mapped);
          setLongTermRemaining(nextRemaining);
          setLongTermLimit(nextLimit);
        }
        if (refreshSsh) await refreshSshTimeForAllContainers(mapped);
      } catch (err) {
        console.error('load containers failed', err);
        if (!silent) {
          await showErrorModal({ message: err?.body || err || '加载容器列表失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
        }
      } finally {
        refreshing = false;
        if (mounted && !silent) setLoadingContainers(false);
      }
    };
    const refreshIfVisible = () => {
      if (canRunListRefresh()) load({ silent: true });
    };
    load({ refreshSsh: true });
    const timer = setInterval(refreshIfVisible, LIST_REFRESH_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshIfVisible);
    }
    return () => {
      mounted = false;
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshIfVisible);
      }
    };
  }, [currentUserId]);

  // 渲染侧 ing 看护（状态驱动，补手动刷新/他人操作后进页的缺口）：
  // 列表出现 ing 态 → 自动轮询至终态并更新该项；动作驱动的操作心跳不受影响。
  const ingWatcherRef = useRef(new Map());
  useEffect(() => {
    const current = ingWatcherRef.current;
    for (const c of containers) {
      const st = (c.effective_status || '').toLowerCase();
      const cid = c.key ? String(c.key) : (c.container_id ? String(c.container_id) : null);
      // 数字 container_id + machine_id 齐备才看护（key 回退形如 c-<idx> 时跳过）
      if (!cid || !c.machine_id || !/^\d+$/.test(cid)) continue;
      if (!ING_CONTAINER_STATES.has(st)) {
        const stop = current.get(cid);
        if (stop) { stop(); current.delete(cid); }
        continue;
      }
      if (current.has(cid)) continue; // 每容器一个 watcher，去重
      const stop = watchIngContainerUntilTerminal({
        machine_id: c.machine_id,
        container_id: cid,
        container_name: c.container_name,
        onProgress: (data) => {
          const st = data && data.effective_status ? String(data.effective_status).toLowerCase() : null;
          if (st) patchContainerStatus(cid, st);
        },
        onTerminal: (data) => {
          const finalSt = data && data.effective_status ? String(data.effective_status).toLowerCase() : null;
          if (!finalSt) return;
          current.delete(cid);
          patchContainerStatus(cid, finalSt);
        },
      });
      current.set(cid, stop);
    }
  }, [containers]);

  // 卸载时停止全部 ing watcher
  useEffect(() => {
    const current = ingWatcherRef.current;
    return () => {
      current.forEach(stop => stop());
      current.clear();
    };
  }, []);

  const handleUnpause = async (record) => {
    const cid = record?.key || record?.container_id;
    if (!cid) return;
    const key = String(cid);
    setUnpauseMap(prev => ({ ...prev, [key]: true }));
    try {
      await unpauseContainer(Number(cid));
      message.success('解冻指令已发送');
      patchContainerStatus(cid, 'unpausing');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '解冻失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setUnpauseMap(prev => ({ ...prev, [key]: false }));
    }
  };

  const handleLongTermChange = async (record, checked) => {
    const cid = record?.key || record?.container_id;
    if (!cid) return;
    const currentlyLongTerm = record?.is_long_term === true;
    if (checked && !currentlyLongTerm && Number(longTermRemaining) <= 0) return;

    setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: true }));
    try {
      const res = await setLongTermContainer({ container_id: Number(cid), is_long_term: checked });
      const nextIsLongTerm = res?.is_long_term === true;
      setContainers(prev => prev.map(c => (
        String(c.key) === String(cid)
          ? { ...c, is_long_term: nextIsLongTerm }
          : c
      )));
      const remainingByUser = res?.long_term_container_remaining_by_user || {};
      const nextRemaining = remainingByUser?.[String(currentUserId)] ?? remainingByUser?.[Number(currentUserId)];
      if (nextRemaining !== undefined) {
        setLongTermRemaining(Number(nextRemaining));
      } else if (checked && !currentlyLongTerm) {
        setLongTermRemaining(prev => (prev === null ? prev : Math.max(0, Number(prev) - 1)));
      } else if (!checked && currentlyLongTerm) {
        setLongTermRemaining(prev => (prev === null ? prev : Number(prev) + 1));
      }
      message.success(nextIsLongTerm ? '已设为长期容器' : '已取消长期容器');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '设置长期容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: false }));
    }
  };

  // If navigated here with a startHeartbeat request (from Apply), start the heartbeat and refresh list when ONLINE
  const location = useLocation();
  const applyHeartbeatStartedRef = useRef(false);
  useEffect(() => {
    const req = location?.state?.startHeartbeat;
    if (!req || !req.container_name) return;
    if (applyHeartbeatStartedRef.current) return;
    // 列表异步加载：等匹配到容器（machine_id + container_name）再开心跳；
    // 匹配不到则等 containers 变化后重试
    const matched = containers.find(
      c => String(c.machine_id) === String(req.machine_id) && c.container_name === req.container_name
    );
    if (!matched) return;
    applyHeartbeatStartedRef.current = true;
    const matchedStatus = String(matched.effective_status || '').toLowerCase();
    if (CONTAINER_TERMINAL_STATES.has(matchedStatus)) {
      clearContainerTransition(matched.key);
      patchContainerStatus(matched.key, matchedStatus);
      return;
    }
    // 两轮三态（building → creating → online）：轮 1 从 building 起步等 creating，
    // 中间态由 onProgress 喂入 deriveContainerEffectiveStatus 推进轮 2
    markContainerTransition(matched, 'building', 'creating');
    patchContainerStatus(matched.key, 'building');
    try {
      startContainerStatusHeartbeat({
        machine_id: req.machine_id,
        container_name: req.container_name,
        container_id: matched.key,
        onProgress: (data) => {
          const st = data && data.effective_status ? String(data.effective_status).toLowerCase() : null;
          if (st) patchContainerStatus(matched.key, st);
        },
        onRunning: async (data) => {
          // heartbeat may return a payload with effective_status; handle 'failed' explicitly
          const st = (data && data.effective_status) ? String(data.effective_status).toLowerCase() : null;
          if (st === 'failed') {
            message.error('容器创建失败');
            try {
              setContainers(prev => prev.map(c => {
                if (String(c.machine_id) === String(req.machine_id) && (c.container_name === req.container_name || c.container_name === req.container_name)) {
                  return { ...c, effective_status: 'failed' };
                }
                return c;
              }));
            } catch (e) {
              // ignore update errors
            }
            return;
          }

          message.success('容器已运行，刷新状态');
          try {
            setContainers(prev => prev.map(c => {
              if (String(c.machine_id) === String(req.machine_id) && (c.container_name === req.container_name || c.container_name === req.container_name)) {
                return { ...c, effective_status: 'online' };
              }
              return c;
            }));
          } catch (e) {
            // ignore update errors
          }
        },
      });
    } catch (e) {
      // ignore
    }
    // containers 变化时重试匹配（Apply 导航后列表异步加载）；心跳自终止，无需 cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, currentUserId, containers]);

  // Modal state
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'delete' | 'leave' | 'removeUser' | 'changeRole' | 'invite'
    loading: false,
    data: null,
  });

  // track which parent modal was open when confirm modal is shown
  const [modalParent, setModalParent] = useState(null); // 'detail' | 'edit' | null

  // container detail modal state
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailContainer, setDetailContainer] = useState(null);
  const [reopenDetailOnCancel, setReopenDetailOnCancel] = useState(false);

  // edit-user modal state
  const [editVisible, setEditVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const openEditModal = (container) => {
    // hide detail modal and open edit modal
    setSelectedContainer(container);
    setDetailVisible(false);
    setEditModalVisible(true);
  };

  const closeEditModal = () => {
    setEditModalVisible(false);
    setSelectedContainer(null);
  };

  // 从编辑返回详情页：重新拉取详情并显示
  const returnToDetail = async () => {
    setEditModalVisible(false);
    if (!selectedContainer) {
      setDetailVisible(true);
      return;
    }
    try {
      await openContainerDetail(selectedContainer);
    } catch (e) {
      // fallback to simply showing detail if fetch fails
      setDetailVisible(true);
    }
  };

  // 关闭所有弹窗（与 ManageMachine 保持一致）
  const closeAllModals = () => {
    setDetailVisible(false);
    setEditModalVisible(false);
    setSelectedContainer(null);
    setDetailContainer(null);
  };

  const handleEditSave = (updated) => {
    // update local containers list to reflect edits
    setContainers(prev => prev.map(c => (String(c.key) === String(updated.key) ? { ...c, ...updated } : c)));
    message.success('容器用户信息已保存');
    closeEditModal();
  };

  // 这里 start/stop/restart 的实现都只是前端模拟，实际应该调用对应的 API 来操作容器，并根据结果来更新状态和提示用户
  const handleStartContainer = async (record) => {
    const cid = record?.key;
    if ((record?.effective_status || '').toLowerCase() !== 'offline') return;
    try {
      // optimistic UI
      markContainerTransition(record, 'starting', 'online');
      patchContainerStatus(cid, 'starting');
      message.loading({ content: `正在启动 ${record.container_name}...`, key: `start-${cid}` });
      await startContainer(Number(cid));
      // start web-side heartbeat to wait until controller reports ONLINE
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          container_id: cid,
          terminalState: 'online',
          onTerminal: (data) => {
            const st = (data && data.effective_status) ? String(data.effective_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchContainerStatus(cid, 'failed');
              message.error({ content: `容器 ${record.container_name} 创建失败`, key: `start-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchContainerStatus(cid, 'online');
            message.success({ content: `容器 ${record.container_name} 已启动`, key: `start-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `启动指令已发送`, key: `start-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('start container failed', e);
      // revert state
      clearContainerTransition(cid);
      patchContainerStatus(cid, 'offline');
      try { await showErrorModal({ message: e?.body || e || '启动失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('启动失败');
    }
  };

  const handleStopContainer = async (record) => {
    const cid = record?.key;
    if ((record?.effective_status || '').toLowerCase() !== 'online') return;
    try {
      markContainerTransition(record, 'stopping', 'offline');
      patchContainerStatus(cid, 'stopping');
      message.loading({ content: `正在停止 ${record.container_name}...`, key: `stop-${cid}` });
      await stopContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          container_id: cid,
          terminalState: 'offline',
          onTerminal: (data) => {
            const st = (data && data.effective_status) ? String(data.effective_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchContainerStatus(cid, 'failed');
              message.error({ content: `容器 ${record.container_name} 状态异常`, key: `stop-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchContainerStatus(cid, 'offline');
            message.success({ content: `容器 ${record.container_name} 已停止`, key: `stop-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `停止指令已发送`, key: `stop-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('stop container failed', e);
      // revert state
      clearContainerTransition(cid);
      patchContainerStatus(cid, 'online');
      try { await showErrorModal({ message: e?.body || e || '停止失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('停止失败');
    }
  };

  const handleRestartContainer = async (record) => {
    const cid = record?.key;
    if ((record?.effective_status || '').toLowerCase() !== 'online') return;
    try {
      markContainerTransition(record, 'restarting', 'online');
      patchContainerStatus(cid, 'restarting');
      message.loading({ content: `正在重启 ${record.container_name}...`, key: `restart-${cid}` });
      await restartContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          container_id: cid,
          terminalState: 'online',
          requiredProgressState: 'restarting',
          onProgress: (data) => {
            const st = (data && data.effective_status) ? String(data.effective_status).toLowerCase() : null;
            if (st && st !== 'online' && st !== 'failed') {
              patchContainerStatus(cid, st);
            }
          },
          onTerminal: (data) => {
            const st = (data && data.effective_status) ? String(data.effective_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchContainerStatus(cid, 'failed');
              message.error({ content: `容器 ${record.container_name} 重启失败`, key: `restart-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchContainerStatus(cid, 'online');
            message.success({ content: `容器 ${record.container_name} 已重启`, key: `restart-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `重启指令已发送`, key: `restart-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('restart container failed', e);
      // revert to online
      clearContainerTransition(cid);
      patchContainerStatus(cid, 'online');
      try { await showErrorModal({ message: e?.body || e || '重启失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('重启失败');
    }
  };

  // helpers
  const getRoleForUser = (accounts, username, userId = null) => {
    if (!accounts) return null;
    if (Array.isArray(accounts)) {
      for (const item of accounts) {
        if (Array.isArray(item)) {
          if (item[0] === username) return item[1];
        } else if (item && typeof item === 'object') {
          if (userId !== null && item.user_id !== undefined && String(item.user_id) === String(userId)) return item.type ?? item.role ?? null;
          if ((item.name ?? item.username) === username) return item.type ?? item.role ?? null;
        }
      }
    } else if (accounts && typeof accounts === 'object') {
      if (userId !== null && accounts.user_id !== undefined && String(accounts.user_id) === String(userId)) return accounts.type ?? accounts.role ?? null;
      if ((accounts.name ?? accounts.username) === username) return accounts.type ?? accounts.role ?? null;
    }
    return null;
  };

  const isRootRole = (role) => String(role || '').toUpperCase() === 'ROOT'; // eslint-disable-line no-unused-vars

  const openConfirm = (type, data) => {
    // hide parent modal (detail/edit) if open and remember which
    if (detailVisible) {
      setModalParent('detail');
      setDetailVisible(false);
    } else if (editModalVisible) {
      setModalParent('edit');
      setEditVisible(false);
    } else {
      setModalParent(null);
    }
    setModal({ visible: true, type, loading: false, data });
  };

  const handleInvite = record => openConfirm('invite', { record });
  const handleDeleteContainer = record => openConfirm('delete', { record });
  const handleLeave = record => openConfirm('leave', { record });
  const handleRemoveUser = (record, username) => openConfirm('removeUser', { record, username });
  const handleChangeRole = (record, username) => openConfirm('changeRole', { record, username });

  const closeModal = () => {
    setModal({ visible: false, type: '', loading: false, data: null });
    // if a parent modal was hidden to show confirmation, reopen it on cancel
    if (modalParent === 'detail') {
      setDetailVisible(true);
    } else if (modalParent === 'edit') {
      setEditVisible(true);
    }
    setModalParent(null);
  };

  const handleModalConfirm = async () => {
    setModal(prev => ({ ...prev, loading: true }));
    const { type, data } = modal;
    try {
      if (type === 'delete') {
        const cid = data?.record?.key || data?.record?.container_id;
        await deleteContainer(Number(cid));
        setContainers(prev => prev.filter(c => String(c.key) !== String(cid)));
        message.success(`容器 ${data.record.container_name} 已删除`);
        setReopenDetailOnCancel(false);
      } else if (type === 'leave') {
        // current user leaving the container
        const cid = data?.record?.key || data?.record?.container_id;
        const uid = Number(currentUserId);
        if (uid && cid) {
          try {
            await removeCollaborator({ user_id: uid, container_id: Number(cid) });
          } catch (e) {
            console.error('removeCollaborator failed', e);
          }
        }
        // remove from local list for the current user
        setContainers(prev => prev.filter(c => String(c.key) !== String(cid)));
        message.success(`已解除与容器 ${data.record.container_name} 的关联`);
      } else if (type === 'removeUser') {
        message.success(`已将 ${data.username} 移出容器`);
      } else if (type === 'changeRole') {
        message.success(`已变更 ${data.username} 的角色`);
      } else if (type === 'invite') {
        message.success(`已发送邀请`);
      } else if (type === 'start') {
        await handleStartContainer(data.record);
      } else if (type === 'stop') {
        // stop container (high-risk)
        const cid = data?.record?.key || data?.record?.container_id;
        await handleStopContainer(data.record);
        message.success(`容器 ${data.record.container_name} 停止请求已发送`);
      } else if (type === 'restart') {
        // restart container (high-risk)
        const cid = data?.record?.key || data?.record?.container_id;
        await handleRestartContainer(data.record);
        message.success(`容器 ${data.record.container_name} 重启请求已发送`);
      }
    } catch (err) {
      console.error('modal action failed', err);
      await showErrorModal({ message: err?.body || err || '操作失败，请重试', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setModal({ visible: false, type: '', loading: false, data: null });
    }
  };

  const openContainerDetail = async (container) => {
    if (!container) return;
    const cid = container.key || container.container_id || (container.container_id === 0 ? container.key || container.container_id : null);
    try {
      setDetailContainer(null);
      setDetailVisible(false);

      // fetch container detail
      const res = await getContainerDetailInformation(cid);
      const detail = (res && (res.container_info || res.container || res.data || res.container_detail)) || res || null;
      if (!detail) {
        await showErrorModal({ message: '未能获取容器详情' });
        return;
      }
      const mapped = {
        key: detail.container_id ? String(detail.container_id) : (container.key || String(Date.now())),
        container_name: detail.container_name || detail.name || container.container_name || '',
        container_image: detail.container_image || detail.image || container.container_image || '',
        port: detail.port ? String(detail.port) : (detail.port_str || container.port || ''),
        effective_status: (detail.effective_status || '').toLowerCase(),
        machine_ip: detail.machine_ip || container.machine_ip || '',
        machine_id: detail.machine_id ? String(detail.machine_id) : (container.machine_id ? String(container.machine_id) : ''),
        cpu_number: detail.cpu_number || container.cpu_number || 0,
        gpu_number: detail.gpu_number || container.gpu_number || 0,
        memory_gb: detail.memory_gb || container.memory_gb || 0,
        shared_gb: detail.shared_gb || container.shared_gb || 0,
        disk_usage: detail.disk_usage || null,
        disk_total_gb: detail.disk_total_gb ?? container.disk_total_gb ?? null,
        disk_limit_gb: detail.disk_limit_gb ?? container.disk_limit_gb ?? null,
        disk_usage_percent: detail.disk_usage_percent ?? container.disk_usage_percent ?? null,
        owners: detail.owners || detail.owner_list || container.owners || [],
        accounts: detail.accounts || detail.account_list || container.accounts || []
      };

      // fetch users for mapping owner names
      setUsersLoading(true);
      try {
        const ures = await listAllUserBrefInformation({ page_number: 1, page_size: 500 });
        const items = (ures && (ures.users || ures.users_info || ures.data || ures.users_list)) || [];
        const mappedUsers = items.map(u => ({ id: u.user_id || u.id || u.uid || u.userId, username: u.username || u.name || String(u.id), name: u.display_name || u.name || u.username }));
        setUsersList(mappedUsers);
      } catch (e) {
        console.error('load users failed', e);
        setUsersList([]);
      } finally {
        setUsersLoading(false);
      }

      setDetailContainer(mapped);
      setDetailVisible(true);
    } catch (err) {
      console.error('getContainerDetailInformation failed', err);
      const status = err?.response?.status || err?.status;
      await showErrorModal({ message: err?.body || err || '获取容器详情失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      if (status === 403) {
        handleAuthError(403, navigate);
      }
      return;
    }
  };

  const handleDetailDelete = (container) => {
    // hide detail and open confirm; if cancel, we'll reopen detail
    setReopenDetailOnCancel(true);
    setDetailVisible(false);
    setModal({ visible: true, type: 'delete', loading: false, data: { record: container } });
  };

  const onChange3 = ({ target: { value } }) => {
    console.log('radio3 checked', value);
    setValue3(value);
  };

  const getModalConfig = () => {
    const { type, data } = modal;
    
    const configs = {
      delete: {
        title: '确认删除容器',
        message: `确定要删除容器 ${data?.record?.container_name} 吗？`,
        content: (
          <div className="home-modal-danger">
            <Typography.Text type="danger">此操作不可恢复！容器内所有数据将被永久删除。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认删除'
      },
      leave: {
        title: '确认退出容器',
        message: `确定要退出容器 ${data?.record?.container_name} 吗？`,
        content: (
          <div className="home-modal-warning">
            <Typography.Text>退出后需要管理员重新邀请才能加入。</Typography.Text>
          </div>
        ),
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认退出'
      },
      removeUser: {
        title: '确认移除用户',
        message: `确定要将 ${data?.username} 从容器中移除吗？`,
        content: (
          <div className="home-modal-danger">
            <Typography.Text>该用户将无法访问此容器。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认移除'
      },
      changeRole: {
        title: '确认变更角色',
        message: `确定要变更 ${data?.username} 的角色吗？`,
        content: (
          <div className="home-modal-info">
            <Typography.Text>角色变更将影响该用户的权限。</Typography.Text>
          </div>
        ),
        danger: false,
        iconColor: '#1890ff',
        confirmText: '确认变更'
      },
      invite: {
        title: '确认邀请用户',
        message: `确定要邀请用户加入容器 ${data?.record?.container_name} 吗？`,
        content: null,
        danger: false,
        iconColor: '#52c41a',
        confirmText: '确认邀请'
      }
    };
    
    return configs[type] || {};
  };

  const renderContainerCard = (record) => {
    const status = (record?.effective_status || '').toLowerCase();
    const statusLabelMap = {
      online: '运行中',
      offline: '已停止',
      building: '构建中',
      creating: '创建中',
      starting: '启动中',
      restarting: '重启中',
      stopping: '停止中',
      paused: '已冻结',
      pausing: '冻结中',
      unpausing: '解冻中',
      failed: '异常',
      unknown: '未知',
      status_unknown: '状态未知',
      host_offline: '宿主机离线',
      host_maintenance: '宿主机维护',
    };
    const color = status === 'online'
      ? 'green'
      : status === 'offline'
        ? 'volcano'
          : status === 'paused'
            ? 'volcano'
            : status === 'building'
              ? 'geekblue'
              : status === 'creating'
            ? 'blue'
            : status === 'starting'
              ? 'cyan'
              : status === 'restarting'
                ? 'purple'
                : status === 'stopping'
                  ? 'orange'
                  : status === 'failed'
                    ? 'red'
                    : 'default';
    const myRole = getRoleForUser(record.accounts, currentUserName, currentUserId);
    const cleanupText = formatCleanupCountdown(record?.last_ssh_login_time, record);
    const actionState = getContainerActionState(record.effective_status);
    const roleColor = myRole === 'ROOT' ? 'purple' : myRole === 'ADMIN' ? 'volcano' : myRole === 'COLLABORATOR' ? 'green' : 'default';
    // 磁盘使用情况（进度条为主）：容量检测是本系统核心机制，卡片优先展示它
    const diskTotal = record?.disk_total_gb;
    const diskLimit = record?.disk_limit_gb;
    const diskPct = Number(record?.disk_usage_percent || 0);
    const diskText = diskTotal == null
      ? '磁盘 -'
      : `磁盘 ${diskTotal}G / ${diskLimit != null ? `${diskLimit}G` : '-'}`;
    const diskFillClass = diskPct >= 90 ? 'home-container-disk-fill danger' : diskPct >= 75 ? 'home-container-disk-fill warn' : 'home-container-disk-fill';

    return (
      <article className="home-container-card" key={record.key}>
        <div className="home-container-card-head">
          <button type="button" className="home-card-title-button" onClick={() => navigate(`/index/containers/${record.key}`)}>
            {record.container_name || '未命名容器'}
          </button>
          <Tag color={color}>{statusLabelMap[status] || status || '未知'}</Tag>
        </div>
        <div className="home-container-card-meta">
          <span>ID {record.key}</span>
          <CopyChip value={record.machine_ip || record.machine_id || ''}>{record.machine_ip || record.machine_id || '-'}</CopyChip>
          <CopyChip value={record.port || ''}>{record.port ? `:${record.port}` : '无端口'}</CopyChip>
          <Tag color={roleColor}>{myRole || '未授权'}</Tag>
          <span>{record.is_long_term ? '长期容器' : `清理倒计时 ${cleanupText}`}</span>
        </div>
        {/* 磁盘行（2026-09 对齐 ManageUser/ManageMachine）：文本 + 操作（解冻/长期）+ 进度条；动态 SSH 格移除 */}
        <div className="home-container-disk-line">
          <span title={diskText}>{diskText}</span>
          <div className="home-container-disk-actions">
            {hasPermission('container:manage') && (
              <Button
                size="small"
                icon={<UnlockOutlined />}
                disabled={!actionState.canUnpause}
                loading={!!unpauseMap[String(record.key)]}
                onClick={(e) => { e.stopPropagation(); handleUnpause(record); }}
              >解冻</Button>
            )}
            <Checkbox
              checked={record.is_long_term === true}
              disabled={
                !!longTermUpdatingMap[String(record.key)] ||
                !actionState.canSetLongTerm ||
                (record.is_long_term !== true && record.long_term_container_can_enable === false)
              }
              onChange={e => handleLongTermChange(record, e.target.checked)}
              onClick={e => e.stopPropagation()}
            >长期</Checkbox>
          </div>
          <div className="home-container-disk-track">
            <div className={diskFillClass} style={{ width: `${Math.min(diskPct, 100)}%` }} />
          </div>
        </div>
        <div className="home-container-card-foot">
          <Typography.Text type="secondary" ellipsis>{record.container_image || '未记录镜像'}</Typography.Text>
          <div className="home-container-card-actions">
            <Button
              size="small"
              type="primary"
              disabled={!actionState.canStart}
              onClick={() => openConfirm('start', { record })}
            >
              启动
            </Button>
            <Button
              size="small"
              danger
              disabled={!actionState.canStop}
              onClick={() => openConfirm('stop', { record })}
            >
              停止
            </Button>
            <Button
              size="small"
              disabled={!actionState.canRestart}
              onClick={() => openConfirm('restart', { record })}
            >
              重启
            </Button>
            <Button size="small" onClick={() => navigate(`/index/containers/${record.key}`)}>详情</Button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <div>
      {['start', 'stop', 'restart', 'delete'].includes(modal.type) ? (
        <ContainerActionConfirmModal
          visible={modal.visible}
          action={modal.type}
          container={modal.data?.record}
          loading={modal.loading}
          onConfirm={handleModalConfirm}
          onCancel={closeModal}
        />
      ) : (
        <ConfirmModal
          visible={modal.visible}
          title={getModalConfig().title}
          message={getModalConfig().message}
          content={getModalConfig().content}
          danger={getModalConfig().danger}
          iconColor={getModalConfig().iconColor}
          confirmText={getModalConfig().confirmText}
          onConfirm={handleModalConfirm}
          onCancel={closeModal}
          loading={modal.loading}
        />
      )}
      
      <div className="home-root">
        <div ref={statsBarRef} style={statsBarStyle} className="home-hero home-auto-hide-bar">
          <Row gutter={16} className="home-row-bottom">
            <Col xs={12} sm={12} md={5}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">总容器数</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-blue">{containers.length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={5}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">运行中</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-green">{containers.filter(c => c.effective_status === 'online').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={4}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">异常</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-warning">{containers.filter(c => c.effective_status === 'failed').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={5}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">离线</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-red">{containers.filter(c => c.effective_status === 'offline').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={5}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">长期容器</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-purple">{containers.filter(c => c.is_long_term === true).length}</Typography.Title>
              </div>
            </Col>
          </Row>
        </div>
        <section className="home-grid-overview">
          <div className="home-section-heading">
            <div>
              <Typography.Text type="secondary">容器视图</Typography.Text>
              <Typography.Title level={4}>我的容器</Typography.Title>
            </div>
            <Typography.Text type="secondary">{containers.length} 个容器</Typography.Text>
          </div>

          {containers.length > 0 ? (
            <div className="home-container-flat-grid">
              {containers.map(renderContainerCard)}
            </div>
          ) : (
            <div className="home-empty-card">{loadingContainers ? '容器加载中...' : '暂无容器'}</div>
          )}
        </section>
        <ContainerDetailModal
          visible={detailVisible}
          container={detailContainer}
          onClose={() => setDetailVisible(false)}
          onDelete={handleDetailDelete}
          onLeave={handleLeave}
          onEdit={openEditModal}
          usersList={usersList}
          currentUserName={currentUserName}
          currentUserId={currentUserId}
        />

        <EditUserModal
          visible={editModalVisible}
          container={selectedContainer}
          onClose={closeAllModals}
          onBack={returnToDetail}
          usersList={usersList}
          usersLoading={usersLoading}
        />
      </div>
    </div>
  );
};

export default Home;
