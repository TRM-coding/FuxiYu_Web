import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Typography, Row, Col, Button, Input, Space, Table, Tag, message } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import TableComponent from '../components/TableComponent';
import { Radio } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';
import { listAllContainerBrefInformation, getContainerDetailInformation, deleteContainer, removeCollaborator, startContainer, stopContainer, restartContainer, refreshLastSshLoginTime } from '../api/container_api';
import { startContainerStatusHeartbeat } from '../utils/heartbeat';
import { useLocation } from 'react-router-dom';
import { listAllUserBrefInformation } from '../api/user_api';
import { isAbortError } from '../utils/requestManager';
import ContainerDetailModal from '../components/ContainerDetailModal';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
const { Column, ColumnGroup } = Table;
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
const SSH_CLEANUP_WINDOW_DAYS = 7;

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

  const parseSshTimeToDate = (raw) => {
    if (!raw || typeof raw !== 'string') return null;
    const t = raw.trim();
    const d0 = new Date(t);
    if (!Number.isNaN(d0.getTime())) return d0;

    // fallback A: parse syslog-like prefix, e.g. "Mar 20 10:35:20 ..."
    const m = t.match(/^([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2}:\d{2})/);
    if (m) {
      const year = new Date().getFullYear();
      const d1 = new Date(`${m[1]} ${m[2]} ${year} ${m[3]}`);
      if (!Number.isNaN(d1.getTime())) return d1;
    }

    // fallback B: parse `last` output snippet, e.g. "... Fri Mar 20 12:39 ..."
    const m2 = t.match(/\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+([A-Z][a-z]{2})\s+(\d{1,2})\s+(\d{2}:\d{2})(?::(\d{2}))?\b/);
    if (m2) {
      const year = new Date().getFullYear();
      const hhmmss = `${m2[3]}:${m2[4] || '00'}`;
      const d2 = new Date(`${m2[1]} ${m2[2]} ${year} ${hhmmss}`);
      if (!Number.isNaN(d2.getTime())) return d2;
    }
    return null;
  };

  const formatLastSshTime = (raw) => {
    if (!raw) return '-';
    const d = parseSshTimeToDate(raw);
    if (!d) return String(raw);
    return d.toLocaleString();
  };

  const formatCleanupCountdown = (raw, record = null) => {
    // Prefer backend-calculated fields (authoritative and format-independent).
    if (record && typeof record === 'object') {
      const status = record.cleanup_status;
      const seconds = Number(record.seconds_until_cleanup);
      if (status === 'due') return '可清理';
      if (Number.isFinite(seconds) && seconds >= 0) {
        const hours = Math.ceil(seconds / 3600);
        const days = Math.floor(hours / 24);
        const remainHours = hours % 24;
        if (days > 0) return `${days}天${remainHours}小时`;
        return `${hours}小时`;
      }
    }

    const d = parseSshTimeToDate(raw);
    if (!d) return '-';
    const expireAt = d.getTime() + SSH_CLEANUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
    const diff = expireAt - Date.now();
    if (diff <= 0) return '可清理';
    const hours = Math.ceil(diff / (60 * 60 * 1000));
    const days = Math.floor(hours / 24);
    const remainHours = hours % 24;
    if (days > 0) return `${days}天${remainHours}小时`;
    return `${hours}小时`;
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
    const load = async () => {
      setLoadingContainers(true);
      try {
        // machine_id should be null for this global list request
        // pagination: backend expects pages starting from 0
        const res = await listAllContainerBrefInformation({ machine_id: null, user_id: Number(currentUserId), page_number: 0, page_size: 100 });
        const items = (res && (res.containers_info || res.containers)) || [];
        const mapped = items.map((c, idx) => ({
          key: c.container_id ? String(c.container_id) : `c-${idx}`,
          container_name: c.container_name || c.name || `container-${idx}`,
          container_image: c.container_image || '',
          port: c.port ? String(c.port) : (c.port_str || ''),
          container_status: (c.container_status || '').toLowerCase(),
          machine_id: c.machine_id ? String(c.machine_id) : null,
          machine_ip: c.machine_ip || '',
          accounts: c.accounts || [],
          last_ssh_login_time: c.last_ssh_login_time ?? null,
          cleanup_after_days: c.cleanup_after_days ?? null,
          cleanup_at: c.cleanup_at ?? null,
          seconds_until_cleanup: c.seconds_until_cleanup ?? null,
          cleanup_status: c.cleanup_status ?? null,
        }));
        if (mounted) setContainers(mapped);
        if (mounted) await refreshSshTimeForAllContainers(mapped);
      } catch (err) {
        console.error('load containers failed', err);
        await showErrorModal({ message: err?.body || err || '加载容器列表失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      } finally {
        if (mounted) setLoadingContainers(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentUserId]);

  // If navigated here with a startHeartbeat request (from Apply), start the heartbeat and refresh list when ONLINE
  const location = useLocation();
  useEffect(() => {
    const req = location?.state?.startHeartbeat;
    if (!req || !req.container_name) return;
    let stop = null;
      try {
      stop = startContainerStatusHeartbeat({
        machine_id: req.machine_id,
        container_name: req.container_name,
        onRunning: async (data) => {
          // heartbeat may return a payload with container_status; handle 'failed' explicitly
          const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
          if (st === 'failed') {
            message.error('容器创建失败');
            try {
              setContainers(prev => prev.map(c => {
                if (String(c.machine_id) === String(req.machine_id) && (c.container_name === req.container_name || c.container_name === req.container_name)) {
                  return { ...c, container_status: 'failed' };
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
                return { ...c, container_status: 'online' };
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
    return () => { if (typeof stop === 'function') stop(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, currentUserId]);

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
    if ((record?.container_status || '').toLowerCase() !== 'offline') return;
    try {
      // optimistic UI
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'starting' } : c)));
      message.loading({ content: `正在启动 ${record.container_name}...`, key: `start-${cid}` });
      await startContainer(Number(cid));
      // start web-side heartbeat to wait until controller reports ONLINE
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          terminalState: 'online',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)));
              message.error({ content: `容器 ${record.container_name} 创建失败`, key: `start-${cid}`, duration: 4 });
              return;
            }
            setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)));
            message.success({ content: `容器 ${record.container_name} 已启动`, key: `start-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `启动指令已发送`, key: `start-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('start container failed', e);
      // revert state
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'offline' } : c)));
      try { await showErrorModal({ message: e?.body || e || '启动失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('启动失败');
    }
  };

  const handleStopContainer = async (record) => {
    const cid = record?.key;
    if ((record?.container_status || '').toLowerCase() !== 'online') return;
    try {
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'stopping' } : c)));
      message.loading({ content: `正在停止 ${record.container_name}...`, key: `stop-${cid}` });
      await stopContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          terminalState: 'offline',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)));
              message.error({ content: `容器 ${record.container_name} 状态异常`, key: `stop-${cid}`, duration: 4 });
              return;
            }
            setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'offline' } : c)));
            message.success({ content: `容器 ${record.container_name} 已停止`, key: `stop-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `停止指令已发送`, key: `stop-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('stop container failed', e);
      // revert state
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)));
      try { await showErrorModal({ message: e?.body || e || '停止失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('停止失败');
    }
  };

  const handleRestartContainer = async (record) => {
    const cid = record?.key;
    if ((record?.container_status || '').toLowerCase() !== 'online') return;
    try {
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'starting' } : c)));
      message.loading({ content: `正在重启 ${record.container_name}...`, key: `restart-${cid}` });
      await restartContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: record.machine_id,
          container_name: record.container_name,
          terminalState: 'online',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)));
              message.error({ content: `容器 ${record.container_name} 重启失败`, key: `restart-${cid}`, duration: 4 });
              return;
            }
            setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)));
            message.success({ content: `容器 ${record.container_name} 已重启`, key: `restart-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `重启指令已发送`, key: `restart-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('restart container failed', e);
      // revert to online
      setContainers(prev => prev.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)));
      try { await showErrorModal({ message: e?.body || e || '重启失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('重启失败');
    }
  };

  // helpers
  const getRoleForUser = (accounts, username) => {
    if (!accounts) return null;
    if (Array.isArray(accounts)) {
      for (const item of accounts) {
        if (Array.isArray(item)) {
          if (item[0] === username) return item[1];
        } else if (item && typeof item === 'object') {
          if ((item.name ?? item.username) === username) return item.type ?? item.role ?? null;
        }
      }
    } else if (accounts && typeof accounts === 'object') {
      if ((accounts.name ?? accounts.username) === username) return accounts.type ?? accounts.role ?? null;
    }
    return null;
  };

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
        container_status: (detail.container_status || detail.status || '').toLowerCase(),
        machine_ip: detail.machine_ip || container.machine_ip || '',
        machine_id: detail.machine_id ? String(detail.machine_id) : (container.machine_id ? String(container.machine_id) : ''),
        cpu_number: detail.cpu_number || container.cpu_number || 0,
        gpu_number: detail.gpu_number || container.gpu_number || 0,
        memory_gb: detail.memory_gb || container.memory_gb || 0,
        swap_gb: detail.swap_gb || container.swap_gb || 0,
        owners: detail.owners || detail.owner_list || container.owners || [],
        accounts: detail.accounts || detail.account_list || container.accounts || []
      };

      // fetch users for mapping owner names
      setUsersLoading(true);
      try {
        const ures = await listAllUserBrefInformation({ page_number: 0, page_size: 500 });
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

  return (
    <div>
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
      
      <div className="home-root">
        <div ref={statsBarRef} style={statsBarStyle} className="home-hero home-auto-hide-bar">
          <Row gutter={16} className="home-row-bottom">
            <Col xs={12} sm={12} md={6}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">总容器数</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-blue">{containers.length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">运行中</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-green">{containers.filter(c => c.container_status === 'online').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">异常</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-warning">{containers.filter(c => c.container_status === 'failed').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={12} sm={12} md={6}>
              <div className="home-stat-card">
                <Typography.Text type="secondary" className="home-stat-label">离线</Typography.Text>
                <Typography.Title level={2} className="home-stat-number home-red">{containers.filter(c => c.container_status === 'offline').length}</Typography.Title>
              </div>
            </Col>
          </Row>
        </div>
        <div className="home-table-wrapper">
          <TableComponent dataSource={containers} loading={loadingContainers} className="home-table">
            <Column title="容器名称" dataIndex="container_name" key="container_name" render={(text, record) => <a onClick={() => openContainerDetail(record)}>{text}</a>} />
            <Column title="容器ID" dataIndex="key" key="key" />
            <Column title="机器 IP" dataIndex="machine_ip" key="machine_ip" render={(text, record) => (record.machine_ip  || '-')} />
            <Column
              title="容器状态"
              dataIndex="container_status"
              key="container_status"
              render={status => {
                let color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : status === 'creating' ? 'blue' : status === 'starting' ? 'cyan' : status === 'stopping' ? 'orange' : status === 'failed' ? 'red' : 'default';
                let text = status === 'online' ? '运行中' : status === 'offline' ? '已停止' : status === 'creating' ? '创建中' : status === 'starting' ? '启动中' : status === 'stopping' ? '停止中' : status === 'failed' ? '异常' : status;
                return <Tag color={color}>{text}</Tag>;
              }}
            />
            <Column
              title="上次SSH登录"
              dataIndex="last_ssh_login_time"
              key="last_ssh_login_time"
              render={(_, record) => formatLastSshTime(record?.last_ssh_login_time)}
            />
            <Column
              title="距清理时间"
              dataIndex="ssh_cleanup_countdown"
              key="ssh_cleanup_countdown"
              render={(_, record) => formatCleanupCountdown(record?.last_ssh_login_time, record)}
            />
            <Column title="端口" dataIndex="port" key="port" />
            <Column
              title="操作"
              key="action"
              render={(_, record) => {
                const myRole = getRoleForUser(record.accounts, currentUserName);
                const status = (record?.container_status || '').toLowerCase();
                const startDisabled = status !== 'offline';
                const restartDisabled = status !== 'online';
                const stopDisabled = status !== 'online';
                const sshRefreshLoading = !!sshRefreshingMap[String(record?.key)];

                const ActionButtons = (
                  <Space size="small">
                      <a
                        onClick={() => { if (!startDisabled) handleStartContainer(record); }}
                        className={startDisabled ? 'home-action-link home-action-disabled' : 'home-action-link'}
                      >
                        启动
                      </a>
                      <a
                        onClick={() => { if (!restartDisabled) handleRestartContainer(record); }}
                        className={restartDisabled ? 'home-action-link home-action-disabled' : 'home-action-link'}
                      >
                        重启
                      </a>
                      <a
                        onClick={() => { if (!stopDisabled) handleStopContainer(record); }}
                        className={stopDisabled ? 'home-action-link home-action-disabled' : 'home-action-link home-action-stop'}
                      >
                        停止
                      </a>
                      <a
                        onClick={() => { if (!sshRefreshLoading) refreshSshTimeForContainer(record?.key); }}
                        className={sshRefreshLoading ? 'home-action-link home-action-disabled' : 'home-action-link'}
                      >
                        {sshRefreshLoading ? '刷新中' : '刷新SSH'}
                      </a>
                    </Space>
                );

                // Show 查看详情 first, then role-specific links, then the action buttons
                const detailLink = <a onClick={() => openContainerDetail(record)}>查看详情</a>;
                if (myRole === 'ADMIN') {
                  return (
                    <Space size="middle">
                      {detailLink}
                      <a onClick={() => handleInvite(record)}>邀请</a>
                      <a onClick={() => handleDeleteContainer(record)}>删除容器</a>
                      {ActionButtons}
                    </Space>
                  );
                }
                if (myRole === 'COLLABORATOR') {
                  return (
                    <Space size="middle">
                      {detailLink}
                      <a onClick={() => handleLeave(record)}>退出</a>
                      {ActionButtons}
                    </Space>
                  );
                }
                // default actions for others
                return (
                  <Space size="middle">
                    {detailLink}
                    {ActionButtons}
                  </Space>
                );
              }}
            />
          </TableComponent>

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
    </div>
  );
};

export default Home;
