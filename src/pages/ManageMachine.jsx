import React, { useState, useEffect, useRef } from 'react';
import { listAllMachineBrefInformation, getDetailInformation, getMachineStatus, registerMachine, removeMachine, addMachinePermission, listMachinePermissions } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, addCollaborator, removeCollaborator, updateRole, createContainer, deleteContainer, startContainer, stopContainer, restartContainer, setLongTermContainer, refreshLastSshLoginTime, unpauseContainer } from '../api/container_api';
import { ReloadOutlined, UserOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SafetyCertificateOutlined, LoadingOutlined, DesktopOutlined, ContainerOutlined, UnlockOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Space, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm, InputNumber, Radio, Slider, Checkbox } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import ConfirmModal from '../components/ConfirmModal';
import ContainerActionConfirmModal from '../components/ContainerActionConfirmModal';
import EditUserModal from '../components/EditUserModal';
import ContainerDetailModal from '../components/ContainerDetailModal';
import { handleAuthError } from '../utils/authHelpers';
import { listAllUserBrefInformation } from '../api/user_api';
import { usePermission } from '../contexts/PermissionContext';
import { isAbortError } from '../utils/requestManager';
import { useNavigate } from 'react-router-dom';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
import CopyChip from '../components/CopyChip';
import EntitySearchBar from '../components/EntitySearchBar';
import { createContainerStatusTransition, deriveContainerDisplayStatus, getContainerActionState } from '../utils/containerActions';
const { Option } = Select;

import { startContainerStatusHeartbeat, startMachineStatusHeartbeat, watchIngContainerUntilTerminal, ING_CONTAINER_STATES } from '../utils/heartbeat';
import { formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';


import './ManageMachine.css';

// machines loaded from backend
const defaultPageSize = 100;
const userPermissionPageSize = 20;

const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

const ROLE_CONFIG = {
  [ROLE.ROOT]: {
    label: '超级管理员',
    color: 'red',
    icon: <CrownOutlined />,
    description: '拥有最高权限，可管理所有容器和用户'
  },
  [ROLE.ADMIN]: {
    label: '管理员',
    color: 'blue',
    icon: <UserOutlined />,
    description: '可管理指定容器的所有操作'
  },
  [ROLE.COLLABORATOR]: {
    label: '协作者',
    color: 'green',
    icon: <UserAddOutlined />,
    description: '可使用容器，但操作权限有限'
  }
};

const ManageMachine = () => {
  const [searchMachine, setSearchMachine] = useState('');
  const [searchContainerName, setSearchContainerName] = useState('');

  // machines from backend
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  // machine status transition loading flags: { [machineId]: boolean }
  const [machineStatusLoadingMap, setMachineStatusLoadingMap] = useState({});
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  // containers per machine cache: { [machineId]: { loading: bool, data: [] } }
  const [containerMap, setContainerMap] = useState({});
  const [longTermUpdatingMap, setLongTermUpdatingMap] = useState({});
  const [sshRefreshingMap, setSshRefreshingMap] = useState({});
  const pendingContainerTransitionRef = useRef(new Map());

  const applyContainerDisplayStatus = (container) => {
    const cid = container?.key || container?.container_id;
    if (!cid) return container;
    const key = String(cid);
    const result = deriveContainerDisplayStatus(
      container.container_status,
      pendingContainerTransitionRef.current.get(key),
    );
    if (result.pendingTransition) {
      pendingContainerTransitionRef.current.set(key, result.pendingTransition);
    } else if (result.cleared) {
      pendingContainerTransitionRef.current.delete(key);
    }
    return { ...container, container_status: result.status };
  };

  const markContainerTransition = (container, transitionStatus, targetStatus) => {
    const cid = container?.key || container?.container_id;
    if (!cid) return;
    pendingContainerTransitionRef.current.set(
      String(cid),
      createContainerStatusTransition(container?.container_status, transitionStatus, { targetStatus }),
    );
  };

  const clearContainerTransition = (cid) => {
    if (cid) pendingContainerTransitionRef.current.delete(String(cid));
  };

  const patchMachineContainerStatus = (mid, cid, status) => {
    setContainerMap(prev => {
      const key = String(mid || '');
      const copy = { ...prev };
      if (copy[key] && Array.isArray(copy[key].data)) {
        copy[key] = {
          ...copy[key],
          data: copy[key].data.map(c => (
            String(c.key) === String(cid)
              ? applyContainerDisplayStatus({ ...c, container_status: status })
              : c
          )),
        };
      }
      return copy;
    });
  };

  // 渲染侧 ing 看护（与 Home 同契约）：containerMap 出现 ing 态 → 自动轮询至终态，
  // 补手动刷新/他人操作后进页的缺口；动作驱动的操作心跳不受影响。
  const ingWatcherRef = useRef(new Map());
  useEffect(() => {
    const current = ingWatcherRef.current;
    for (const entry of Object.values(containerMap)) {
      for (const c of (entry?.data || [])) {
        const st = (c.container_status || '').toLowerCase();
        const cid = c.key ? String(c.key) : (c.container_id ? String(c.container_id) : null);
        // 数字 container_id + machine_id 齐备才看护（key 回退形如 <mid>-<page>-<idx> 时跳过）
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
            const st = data && data.container_status ? String(data.container_status).toLowerCase() : null;
            if (!st) return;
            setContainerMap(prev => {
              const next = { ...prev };
              for (const mid of Object.keys(next)) {
                next[mid] = {
                  ...next[mid],
                  data: (next[mid]?.data || []).map(x => (
                    String(x.key) === String(cid)
                      ? applyContainerDisplayStatus({ ...x, container_status: st })
                      : x
                  )),
                };
              }
              return next;
            });
          },
          onTerminal: (data) => {
            const finalSt = data && data.container_status ? String(data.container_status).toLowerCase() : null;
            if (!finalSt) return;
            current.delete(cid);
            setContainerMap(prev => {
              const next = { ...prev };
              for (const mid of Object.keys(next)) {
                next[mid] = {
                  ...next[mid],
                  data: (next[mid]?.data || []).map(x => (
                    String(x.key) === String(cid)
                      ? applyContainerDisplayStatus({ ...x, container_status: finalSt })
                      : x
                  )),
                };
              }
              return next;
            });
          },
        });
        current.set(cid, stop);
      }
    }
  }, [containerMap]);

  // 卸载时停止全部 ing watcher
  useEffect(() => {
    const current = ingWatcherRef.current;
    return () => {
      current.forEach(stop => stop());
      current.clear();
    };
  }, []);
  // top-level container-name search loading
  const containerSearchTimerRef = useRef(null);
  const lastContainerSearchKeywordRef = useRef('');

  const stopEventPropagation = (e) => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) {
      // ignore
    }
  };

  // users fetched from backend (used for selecting when adding users to a container)
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [permissionModalVisible, setPermissionModalVisible] = useState(false);
  const [permissionModalLoading, setPermissionModalLoading] = useState(false);
  const [permissionModalSubmitting, setPermissionModalSubmitting] = useState(false);
  const [permissionMachine, setPermissionMachine] = useState(null);
  const [permissionUsers, setPermissionUsers] = useState([]);
  const [permissionUsersPage, setPermissionUsersPage] = useState(1);
  const [permissionUsersHasMore, setPermissionUsersHasMore] = useState(true);
  const [permissionUsersSelected, setPermissionUsersSelected] = useState([]);
  const [permissionUsersLoadingMore, setPermissionUsersLoadingMore] = useState(false);
  const [permissionAssignedUserIds, setPermissionAssignedUserIds] = useState([]);
  const navigate = useNavigate();
  const { barRef: searchBarRef, barStyle: searchBarStyle } = useAutoHideTopBar();

  // auth + operator 门禁（PermissionContext 通配判定，替代旧 is_operator 字段猜测）
  const { hasPermission, loaded: permLoaded } = usePermission();
  useEffect(() => {
    const name = localStorage.getItem('currentUserName');
    const id = localStorage.getItem('currentUserId');
    if (!name || !id) {
      if (!sessionStorage.getItem('auth_modal_shown')) {
        try {
          sessionStorage.setItem('auth_modal_shown', '1');
          showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 })
        } finally {
          sessionStorage.removeItem('auth_modal_shown');
        }
      }
      handleAuthError(401, navigate);
      return;
    }
    if (!permLoaded) return;
    if (!hasPermission('bypass_auth_entity')) {
      if (!sessionStorage.getItem('auth_modal_shown')) {
        try {
          sessionStorage.setItem('auth_modal_shown', '1');
          showErrorModal({ title: '权限不足', message: '需要操作员权限', status: 403 });
        } finally {
          sessionStorage.removeItem('auth_modal_shown');
        }
      }
      handleAuthError(403, navigate);
    }
  }, [navigate, permLoaded, hasPermission]);

  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  // 对话框状态
  const [actionModal, setActionModal] = useState({ visible: false, type: '', loading: false, data: null });
  // 添加宿主机弹窗
  const [addHostVisible, setAddHostVisible] = useState(false);
  const [addHostLoading, setAddHostLoading] = useState(false);
  const [addHostForm] = Form.useForm();
  // 编辑模式
  // 删除机器的确认弹窗
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteTargetMachine, setDeleteTargetMachine] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  // 删除容器的二次确认状态
  const [containerDeleteConfirmVisible, setContainerDeleteConfirmVisible] = useState(false);
  const [deleteTargetContainer, setDeleteTargetContainer] = useState(null);
  const [containerDeleteLoading, setContainerDeleteLoading] = useState(false);

  const openActionConfirm = (type, data) => {
    setActionModal({ visible: true, type, loading: false, data });
  };
  const closeActionModal = () => {
    setActionModal({ visible: false, type: '', loading: false, data: null });
  };
  const handleActionConfirm = async () => {
    if (!actionModal.visible || !actionModal.data) return;
    setActionModal(prev => ({ ...prev, loading: true }));
    try {
      const { type, data } = actionModal;
      if (type === 'start') {
        await handleStartContainer(data.record || data);
      } else if (type === 'stop') {
        await handleStopContainer(data.record || data);
        message.success(`容器 ${data.record?.container_name || ''} 停止请求已发送`);
      } else if (type === 'restart') {
        await handleRestartContainer(data.record || data);
        message.success(`容器 ${data.record?.container_name || ''} 重启请求已发送`);
      } else if (type === 'unpause') {
        await handleUnpauseContainer(data.record || data);
      }
    } catch (err) {
      console.error('action confirm failed', err);
      await showErrorModal({ message: err?.body || err || '操作失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setActionModal({ visible: false, type: '', loading: false, data: null });
    }
  };

  //加载机器列表（machine_search 走后端过滤）
  const fetchMachinesFromApi = async (machineSearch = '') => {
    setMachinesLoading(true);
    try {
      // 获取机器列表
      const res = await listAllMachineBrefInformation({
        page_number: 0,
        page_size: defaultPageSize,
        machine_search: machineSearch || undefined,
      });
      const items = (res && res.machines) || [];
      
      // 获取机器列表
      const mapped = items.map((m, idx) => ({
        key: String(m.machine_id || idx + 1),
        machine_id: m.machine_id,
        machine_name: m.machine_name || '',
        machine_ip: m.machine_ip || '',
        machine_type: (m.machine_type || '').toUpperCase(),
        machine_status: (m.machine_status || '').toLowerCase(),
        cpu_core_number: null,
        memory_size_gb: null,
        max_memory_gb: null,
        max_gpu_number: null,
        max_cpu_core_number: null,
        max_shared_gb: null,
        gpu_number: null,
        gpu_type: null,
        disk_size_gb: null,
        runtime_snapshot: null,
        machine_description: ''
      }));

      // 并行获取详情
      try {
        const detailResults = await Promise.all(
          mapped.map(async (it) => {
            try {
              const detail = await getDetailInformation(it.machine_id);
              return {
                ...it,
                cpu_core_number: detail.cpu_core_number ?? it.cpu_core_number,
                memory_size_gb: detail.memory_size_gb ?? it.memory_size_gb,
                gpu_number: detail.gpu_number ?? it.gpu_number ?? 0,
                gpu_type: detail.gpu_type ?? it.gpu_type ?? '',
                disk_size_gb: detail.disk_size_gb ?? it.disk_size_gb,
                max_shared_gb: detail.max_shared_gb ?? it.max_shared_gb,
                max_memory_gb: detail.max_memory_gb ?? it.max_memory_gb,
                max_gpu_number: detail.max_gpu_number ?? it.max_gpu_number ?? 0,
                max_cpu_core_number: detail.max_cpu_core_number ?? it.max_cpu_core_number,
                machine_description: detail.machine_description ?? it.machine_description,
                machine_type: (detail.machine_type ?? it.machine_type).toUpperCase(),
                machine_status: (detail.machine_status ?? it.machine_status).toLowerCase(),
                runtime_snapshot: detail.runtime_snapshot ?? it.runtime_snapshot
              };
            } catch (err) {
              console.warn('detail fetch failed for', it.machine_id, err?.message);
              return it; // 如果获取详情失败，返回基础信息
            }
          })
        );
        
        return detailResults;
      } catch (e) {
        console.warn('Some details failed to load, returning basic info', e);
        return mapped; // 如果整体失败，返回基础信息
      }
    } catch (err) {
      console.error('Failed to load machines', err);
      return [];
    } finally {
      setMachinesLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    (async () => {
      const list = await fetchMachinesFromApi();
      if (mounted) setMachines(list);
    })();
    return () => { mounted = false; };
  }, []);

  // 机器实时数据轮询（runtime_snapshot 常新，与详情页同频 5s；无快照跳过）
  const machinesRef = useRef(machines);
  machinesRef.current = machines;
  useEffect(() => {
    if (!machinesRef.current.length) return undefined;
    let mounted = true;
    const timer = setInterval(async () => {
      const ids = machinesRef.current.map(m => Number(m.machine_id ?? m.key));
      const results = await Promise.allSettled(ids.map(id => getMachineStatus(id)));
      if (!mounted) return;
      setMachines(prev => prev.map((m, idx) => {
        const r = results[idx];
        if (r.status !== 'fulfilled' || !r.value?.runtime_snapshot) return m;
        return { ...m, runtime_snapshot: r.value.runtime_snapshot };
      }));
    }, 5000);
    return () => { mounted = false; clearInterval(timer); };
  }, []);

  // 机器框搜索：防抖后走后端 machine_search 重新拉取
  useEffect(() => {
    const keyword = (searchMachine || '').trim();
    const timer = setTimeout(async () => {
      const list = await fetchMachinesFromApi(keyword);
      setMachines(list);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchMachine]);

  // 选择要加入的用户
  useEffect(() => {
    let mounted = true;
    const loadUsers = async () => {
      setUsersLoading(true);
      try {
        const res = await listAllUserBrefInformation({ page_number: 1, page_size: 500 });
        const items = (res && (res.users || res.users_info || res.data || res.users_list)) || [];
        const mapped = items.map(u => ({ id: u.user_id || u.id || u.uid || u.userId, username: u.username || u.name || String(u.id), name: u.display_name || u.name || u.username }));
        if (mounted) setUsersList(mapped);
      } catch (err) {
        console.error('Failed to load users', err);
        if (mounted) setUsersList([]);
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };
    loadUsers();
    return () => { mounted = false; };
  }, []);

  const fetchContainersForMachine = async (machineId, pageNumber = 0, containerName = searchContainerName) => {
    // avoid duplicate fetch
    if (!machineId) return;
    const mid = String(machineId);
    // if same page already loaded, skip
    //if (containerMap[mid]?.loading || (containerMap[mid]?.data && containerMap[mid]?.page === pageNumber)) return;
    // mark loading
    setContainerMap(prev => ({ ...prev, [mid]: { ...(prev[mid] || {}), loading: true, data: [], page: pageNumber, total_page: prev[mid]?.total_page || 1 } }));
    try {
      const pageSize = 4;
      const res = await listAllContainerBrefInformation({
        machine_id: mid,
        container_search: containerName,
        page_number: pageNumber,
        page_size: pageSize,
      });
      const items = (res && (res.containers_info || res.containers)) || [];
      const total_page = (res && (res.total_page || res.totalPages || res.total_pages)) || 1;
      const total_number = Number(res && (res.total_number ?? res.totalNumber ?? res.total)) || items.length;
      const mapped = items.map((c, idx) => applyContainerDisplayStatus({
        key: c.container_id ? String(c.container_id) : `${mid}-${pageNumber}-${idx}`,
        container_name: c.container_name || c.name || `container-${idx}`,
        container_image: c.container_image || '',
        port: c.port ? String(c.port) : (c.port_str || ''),
        container_status: (c.container_status || '').toLowerCase(),
        machine_id: mid,
        machine_ip: c.machine_ip || '',
        owners: c.owners || [],
        accounts: c.accounts || [],
        is_long_term: c.is_long_term === true,
        long_term_container_can_enable: c.long_term_container_can_enable !== false,
        long_term_container_blocked_user_ids: c.long_term_container_blocked_user_ids || [],
        long_term_container_remaining_by_user: c.long_term_container_remaining_by_user || {},
        last_ssh_login_time: c.last_ssh_login_time ?? null,
        cleanup_after_days: c.cleanup_after_days ?? null,
        cleanup_at: c.cleanup_at ?? null,
        seconds_until_cleanup: c.seconds_until_cleanup ?? null,
        cleanup_status: c.cleanup_status ?? null,
        disk_total_gb: c.disk_total_gb ?? null,
        disk_limit_gb: c.disk_limit_gb ?? null,
        disk_usage_percent: c.disk_usage_percent ?? null,
      }));
      setContainerMap(prev => ({
        ...prev,
        [mid]: {
          loading: false,
          data: mapped,
          page: pageNumber,
          total_page: total_page,
          total_number,
          page_size: pageSize,
          container_name: String(containerName || '').trim(),
        },
      }));
    } catch (err) {
      console.error('fetchContainersForMachine failed', machineId, err);
      // fallback: keep loading false but no data so UI will use local mock
      setContainerMap(prev => ({ ...prev, [mid]: { loading: false, data: [], page: pageNumber, total_page: 1 } }));
    }
  };

  const handleLongTermChange = async (containerRecord, checked) => {
    const cid = containerRecord?.key || containerRecord?.container_id;
    const mid = containerRecord?.machine_id;
    if (!cid) return;
    setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: true }));
    try {
      const res = await setLongTermContainer({ container_id: Number(cid), is_long_term: checked });
      const nextIsLongTerm = res?.is_long_term === true;
      const nextCanEnable = res?.long_term_container_can_enable !== false;
      const nextBlockedUserIds = res?.long_term_container_blocked_user_ids || [];
      const nextRemainingByUser = res?.long_term_container_remaining_by_user || {};
      setContainerMap(prev => {
        const machineEntry = prev[String(mid)];
        if (!machineEntry) return prev;
        return {
          ...prev,
          [String(mid)]: {
            ...machineEntry,
            data: (machineEntry.data || []).map(c => (
              String(c.key) === String(cid)
                ? {
                  ...c,
                  is_long_term: nextIsLongTerm,
                  long_term_container_can_enable: nextCanEnable,
                  long_term_container_blocked_user_ids: nextBlockedUserIds,
                  long_term_container_remaining_by_user: nextRemainingByUser,
                }
                : c
            )),
          },
        };
      });
      message.success(nextIsLongTerm ? '已设为长期容器' : '已取消长期容器');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '设置长期容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: false }));
    }
  };

  // ── SSH 刷新 ─────────────────────────────────────────────

  const refreshSshTimeForContainer = async (containerRecord) => {
    const cid = containerRecord?.key || containerRecord?.container_id;
    const mid = String(containerRecord?.machine_id || '');
    if (!cid) return;
    setSshRefreshingMap(prev => ({ ...prev, [String(cid)]: true }));
    try {
      const res = await refreshLastSshLoginTime(Number(cid));
      const value = Object.prototype.hasOwnProperty.call(res || {}, 'last_ssh_login_time') ? res.last_ssh_login_time : null;
      const cleanup_after_days = res?.cleanup_after_days ?? null;
      const cleanup_at = res?.cleanup_at ?? null;
      const seconds_until_cleanup = res?.seconds_until_cleanup ?? null;
      const cleanup_status = res?.cleanup_status ?? null;
      setContainerMap(prev => {
        const entry = prev[mid];
        if (!entry) return prev;
        return {
          ...prev,
          [mid]: {
            ...entry,
            data: (entry.data || []).map(c => (
              String(c.key) === String(cid)
                ? { ...c, last_ssh_login_time: value, cleanup_after_days, cleanup_at, seconds_until_cleanup, cleanup_status }
                : c
            )),
          },
        };
      });
      message.success('SSH time refreshed');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '刷新 SSH 登录时间失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setSshRefreshingMap(prev => ({ ...prev, [String(cid)]: false }));
    }
  };

  // 机器状态标签
  useEffect(() => {
    const keyword = (searchContainerName || '').trim();
    if (containerSearchTimerRef.current) clearTimeout(containerSearchTimerRef.current);
    containerSearchTimerRef.current = setTimeout(() => {
      const previousKeyword = lastContainerSearchKeywordRef.current;
      if (!keyword && !previousKeyword) {
        containerSearchTimerRef.current = null;
        return;
      }
      lastContainerSearchKeywordRef.current = keyword;
      Promise.all(machines.map(machine => fetchContainersForMachine(machine.key, 0, keyword)))
      containerSearchTimerRef.current = null;
    }, 300);
    return () => {
      if (containerSearchTimerRef.current) {
        clearTimeout(containerSearchTimerRef.current);
        containerSearchTimerRef.current = null;
      }
    };
  }, [searchContainerName, searchMachine, machines]);

  const filteredMachineData = machines.filter(machine => {
    const keyword = (searchContainerName || '').trim().toLowerCase();
    if (!keyword) return true;
    const entry = containerMap[String(machine.key)];
    if (!entry || entry.loading) return true;
    return Number(entry.total_number ?? (entry.data || []).length) > 0;
  });

  const renderStatusTag = (status, record = null) => {
    const displayStatus = record?.display_status || (record?.is_maintenance ? 'maintenance' : status);
    const normalized = String(displayStatus || status || '').toLowerCase();
    const mid = String(record?.machine_id || record?.key || '');
    if (mid && machineStatusLoadingMap[mid]) return <Tag color="processing">澶勭悊涓</Tag>;
    const color = normalized === 'online' ? 'green' : normalized === 'offline' ? 'volcano' : 'orange';
    return <Tag color={color}>{normalized === 'online' ? '运行中' : normalized === 'offline' ? '已停止' : '维护中'}</Tag>;
  };

  const renderContainerStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    const color = normalized === 'online' ? 'green' : normalized === 'offline' ? 'volcano' : normalized === 'paused' ? 'volcano' : normalized === 'building' ? 'geekblue' : normalized === 'creating' ? 'blue' : normalized === 'starting' ? 'cyan' : normalized === 'restarting' ? 'purple' : normalized === 'stopping' ? 'orange' : normalized === 'failed' ? 'red' : 'default';
    const labelMap = { online: '运行中', offline: '已停止', paused: '磁盘已冻结', building: '构建中', creating: '创建中', starting: '启动中', restarting: '重启中', stopping: '停止中', pausing: '冻结中', unpausing: '解冻中', failed: '异常', unknown: '未知' };
    return <Tag color={color}>{labelMap[normalized] || status}</Tag>;
  };

  // 机器列表加载后：每台机器拉取第一页容器（4 卡预览 + 翻页）
  useEffect(() => {
    machines.forEach(machine => {
      const mid = String(machine.key);
      const entry = containerMap[mid];
      if (entry && Array.isArray(entry.data)) return; // 已有数据不重复拉
      fetchContainersForMachine(mid, 0);
    });
  }, [machines]);

  // 处理容器搜索输入

  // 打开容器详情弹窗: 先从后端获取详情数据再展示
  const openContainerDetail = async (container) => {
    if (!container) return;
    const cid = container.key || container.container_id || container.container_id === 0 ? container.key || container.container_id : null;
    try {
      // show small loading state by clearing selection
      setSelectedContainer(null);
      // fetch detail from server
      const res = await getContainerDetailInformation(cid);
      // support multiple possible response shapes
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
        cpu_number: detail.cpu_number ?? container.cpu_number ?? null,
        gpu_number: detail.gpu_number ?? container.gpu_number ?? 0,
        memory_gb: detail.memory_gb ?? container.memory_gb ?? 0,
        shared_gb: detail.shared_gb ?? container.shared_gb ?? 0,
        owners: detail.owners || detail.owner_list || container.owners || [],
        accounts: detail.accounts || detail.account_list || container.accounts || []
      };
      setSelectedContainer(mapped);
      setDetailModalVisible(true);
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

  const loadPermissionUsers = async (page = 1, append = false) => {
    if (!append) {
      setPermissionModalLoading(true);
      setPermissionUsers([]);
      setPermissionUsersPage(1);
      setPermissionUsersHasMore(true);
      setPermissionUsersSelected([]);
    } else {
      setPermissionUsersLoadingMore(true);
    }
    try {
      const res = await listAllUserBrefInformation({ page_number: page, page_size: userPermissionPageSize });
      const items = (res && (res.users || res.users_info || res.data || res.users_list)) || [];
      const mapped = items.map(u => ({
        id: Number(u.user_id || u.id || u.uid || u.userId),
        username: u.username || u.name || String(u.user_id || u.id || u.uid || u.userId || ''),
        email: u.email || '',
      })).filter(u => u.id);
      setPermissionUsers(prev => append ? [...prev, ...mapped] : mapped);
      const totalPages = Number(res?.total_pages || res?.total_page || res?.totalPages || 0);
      const hasMore = totalPages ? page < totalPages : mapped.length === userPermissionPageSize;
      setPermissionUsersHasMore(hasMore);
      setPermissionUsersPage(page);
    } catch (err) {
      console.error('loadPermissionUsers failed', err);
      if (!append) {
        await showErrorModal({ message: '加载用户列表失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      }
      setPermissionUsersHasMore(false);
    } finally {
      setPermissionModalLoading(false);
      setPermissionUsersLoadingMore(false);
    }
  };

  const openPermissionModal = async (machine) => {
    if (!machine) return;
    setPermissionMachine(machine);
    setPermissionModalVisible(true);
    try {
      setPermissionModalLoading(true);
      const res = await listMachinePermissions(Number(machine.machine_id || machine.key));
      const assigned = Array.isArray(res?.user_ids) ? res.user_ids.map(v => Number(v)).filter(Boolean) : [];
      setPermissionAssignedUserIds(assigned);
    } catch (err) {
      console.error('listMachinePermissions failed', err);
      setPermissionAssignedUserIds([]);
    } finally {
      setPermissionModalLoading(false);
    }
    await loadPermissionUsers(1, false);
  };

  const loadMorePermissionUsers = async () => {
    if (permissionModalLoading || permissionUsersLoadingMore || !permissionUsersHasMore) return;
    await loadPermissionUsers(permissionUsersPage + 1, true);
  };

  const handleGrantMachinePermission = async () => {
    if (!permissionMachine || !permissionUsersSelected || permissionUsersSelected.length === 0) return;
    setPermissionModalSubmitting(true);
    try {
      const machineId = Number(permissionMachine.machine_id || permissionMachine.key);
      const selectedIds = Array.from(new Set(permissionUsersSelected.map(v => Number(v)).filter(Boolean)));
      const pendingIds = selectedIds.filter(uid => !permissionAssignedUserIds.includes(uid));
      if (!pendingIds.length) {
        message.info('所选用户都已拥有权限');
        setPermissionUsersSelected([]);
        return;
      }
      for (const uid of pendingIds) {
        await addMachinePermission({ machine_id: machineId, user_id: uid });
      }
      setPermissionAssignedUserIds(prev => Array.from(new Set([...prev, ...pendingIds])));
      message.success(`已添加 ${pendingIds.length} 个用户的机器权限`);
      setPermissionUsersSelected([]);
    } catch (err) {
      await showErrorModal({ message: err?.body || err?.message || '添加机器权限失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setPermissionModalSubmitting(false);
    }
  };

  // 打开添加宿主机弹窗
  const openAddHostModal = () => {
    addHostForm.resetFields();
    // set defaults for add mode: default status = maintenance
    addHostForm.setFieldsValue({ maintenance_mode: 'normal', machine_type: 'CPU', gpu_number: 0, max_shared_gb: 0 });
    setAddHostVisible(true);
  };

  // 添加宿主机确认
  const handleAddHostConfirm = async () => {
    try {
      const values = await addHostForm.validateFields();
      setAddHostLoading(true);
      const payload = {
        machine_name: values.machine_name,
        machine_ip: values.machine_ip,
        // send machine_type as uppercase (per request)
        machine_type: (values.machine_type || 'CPU').toUpperCase(),
        machine_description: values.machine_description || '',
        cpu_core_number: values.cpu_core_number || null,
        gpu_number: values.gpu_number || 0,
        gpu_type: values.gpu_type || null,
        memory_size: values.memory_size || null,
        max_memory_gb: values.max_memory_gb || 0,
        max_gpu_number: values.max_gpu_number || 0,
        max_cpu_core_number: values.max_cpu_core_number || 0,
        max_shared_gb: values.max_shared_gb || null,
        disk_size: values.disk_size || null,
      };


      // 添加模式：机器建档走 register_machine，硬件信息由 node 首连返回。
      let success = false;
      try {
        await registerMachine({
          machine_name: payload.machine_name,
          machine_ip: payload.machine_ip,
          machine_description: payload.machine_description || '',
        });
        const refreshed = await fetchMachinesFromApi();
        setMachines(refreshed);
        message.success('机器已完成注册建档');
        success = true;
      } catch (err) {
        console.error('registerMachine failed', err);
        const status = err?.response?.status || err?.status;
        await showErrorModal({ message: err?.body || err || '注册机器失败，请检查 node 是否可达', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
        if (status === 403) {
          handleAuthError(403, navigate);
        }
      } finally {
        setAddHostLoading(false);
        if (success) setAddHostVisible(false);
      }
    } catch (err) {
      // validation failed
    }
  };

  // 打开删除确认弹窗（2026-09：机器上仍有容器 → 提前拦截，提示先手动清理；后端 409 兜底）
  const openDeleteConfirm = (machine) => {
    const mid = String(machine.machine_id ?? machine.key);
    const entry = containerMap[mid] || {};
    const containerCount = entry.total_number ?? (entry.data ? entry.data.length : 0);
    if (containerCount > 0) {
      message.warning(`该机器仍有 ${containerCount} 个容器，请先手动清理后再删除`);
      return;
    }
    setDeleteTargetMachine(machine);
    setDeleteConfirmVisible(true);
  };

  // 确认删除机器
  const handleDeleteConfirm = () => {
    (async () => {
      if (!deleteTargetMachine) return;
      setDeleteLoading(true);
      const ids = [];
      if (deleteTargetMachine.machine_id) ids.push(deleteTargetMachine.machine_id);
      else ids.push(deleteTargetMachine.key);
      let success = false;
      try {
        await removeMachine(ids);
        setMachines(prev => prev.filter(m => m.key !== deleteTargetMachine.key && m.machine_id !== deleteTargetMachine.machine_id));
        setContainerMap(prev => {
          const copy = { ...prev };
          delete copy[deleteTargetMachine.key];
          if (deleteTargetMachine.machine_id) delete copy[String(deleteTargetMachine.machine_id)];
          return copy;
        });
        message.success('宿主机已删除');
        success = true;
      } catch (err) {
        console.error('removeMachine failed', err);
        // prefer structured body message when available
        const bodyMsg = err?.body?.message || err?.body || null;
        const messageText = bodyMsg ? `删除宿主机失败: ${bodyMsg}` : '删除宿主机失败，请重试';
        const status = err?.status || err?.response?.status || err?.status;
        await showErrorModal({ message: err?.body || err || messageText, status: status, route: err?.route || err?.response?.url });
        if (status === 403) {
          handleAuthError(403, navigate);
        }
      } finally {
        setDeleteLoading(false);
        if (success) {
          setDeleteConfirmVisible(false);
          setDeleteTargetMachine(null);
        }
      }
    })();
  };

  // 打开删除容器的确认弹窗
  const handleUnpauseContainer = async (container) => {
    const cid = Number(container?.key || container?.container_id);
    if (!cid) return;
    try {
      await unpauseContainer(cid);
      message.success('容器已解冻');
      // refresh container list
      const mid = container?.machine_id;
      if (mid) fetchContainersForMachine(mid);
    } catch (err) {
      message.error('解冻失败');
      await showErrorModal({ message: err?.body || err || '解冻失败' });
    }
  };

  const openDeleteContainerConfirm = (container) => {
    setDeleteTargetContainer(container);
    // 隐藏详情弹窗以展示二次确认
    setDetailModalVisible(false);
    setContainerDeleteConfirmVisible(true);
  };

  // 确认删除容器
  const handleDeleteContainerConfirm = async () => {
    if (!deleteTargetContainer) return;
    setContainerDeleteLoading(true);
    const cid = deleteTargetContainer.key || deleteTargetContainer.container_id;
    let success = false;
    try {
      await deleteContainer(cid);
      const mid = String(deleteTargetContainer.machine_id || deleteTargetContainer.machine_ip || deleteTargetContainer.machine_id || '');
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.filter(c => c.key !== deleteTargetContainer.key && String(c.container_id) !== String(cid)) };
        }
        return copy;
      });
      if (selectedContainer && (selectedContainer.key === deleteTargetContainer.key || selectedContainer.container_id === deleteTargetContainer.container_id)) {
        closeAllModals();
      }
      message.success('容器已删除');
      success = true;
    } catch (err) {
      console.error('deleteContainer failed', err);
      const status = err?.response?.status || err?.status;
      await showErrorModal({ message: err?.body || err || '删除容器失败，请重试', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      if (status === 403) {
        handleAuthError(403, navigate);
      }
    } finally {
      setContainerDeleteLoading(false);
      if (success) {
        setContainerDeleteConfirmVisible(false);
        setDeleteTargetContainer(null);
        setDetailModalVisible(false);
        setSelectedContainer(null);
      }
    }
  };

  // 打开编辑弹窗
  const openEditModal = (container) => {
    setSelectedContainer(container);
    setDetailModalVisible(false);
    setEditModalVisible(true);
  };

  // 从编辑返回详情页（编辑为实时更新）——重新拉取容器详情并显示
  const returnToDetail = async () => {
    setEditModalVisible(false);
    if (!selectedContainer) {
      setDetailModalVisible(true);
      return;
    }
    try {
      await openContainerDetail(selectedContainer);
    } catch (e) {
      // fallback: still show detail modal
      setDetailModalVisible(true);
    }
  };

  // 打开编辑弹窗
  const closeAllModals = () => {
    setDetailModalVisible(false);
    setEditModalVisible(false);
    setSelectedContainer(null);
  };

  // 这里的容器操作函数（启动/停止/重启）有互锁的状态更新
  const handleStartContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      markContainerTransition(container, 'starting', 'online');
      patchMachineContainerStatus(mid, cid, 'starting');
      message.loading({ content: `正在启动 ${container.container_name}...`, key: `start-${cid}` });
      await startContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          container_id: container.key ?? container.container_id,
          terminalState: 'online',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchMachineContainerStatus(mid, cid, 'failed');
              message.error({ content: `容器 ${container.container_name} 创建失败`, key: `start-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchMachineContainerStatus(mid, cid, 'online');
            message.success({ content: `容器 ${container.container_name} 已启动`, key: `start-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `启动指令已发送`, key: `start-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('start container failed', e);
      // revert
      clearContainerTransition(cid);
      patchMachineContainerStatus(mid, cid, 'offline');
      try { await showErrorModal({ message: e?.body || e || '启动失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('启动失败');
    }
  };

  const handleStopContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      markContainerTransition(container, 'stopping', 'offline');
      patchMachineContainerStatus(mid, cid, 'stopping');
      message.loading({ content: `正在停止 ${container.container_name}...`, key: `stop-${cid}` });
      await stopContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          container_id: container.key ?? container.container_id,
          terminalState: 'offline',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchMachineContainerStatus(mid, cid, 'failed');
              message.error({ content: `容器 ${container.container_name} 状态异常`, key: `stop-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchMachineContainerStatus(mid, cid, 'offline');
            message.success({ content: `容器 ${container.container_name} 已停止`, key: `stop-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `停止指令已发送`, key: `stop-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('stop container failed', e);
      // revert
      clearContainerTransition(cid);
      patchMachineContainerStatus(mid, cid, 'online');
      try { await showErrorModal({ message: e?.body || e || '停止失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('停止失败');
    }
  };

  const handleRestartContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      markContainerTransition(container, 'restarting', 'online');
      patchMachineContainerStatus(mid, cid, 'restarting');
      message.loading({ content: `正在重启 ${container.container_name}...`, key: `restart-${cid}` });
      await restartContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          container_id: container.key ?? container.container_id,
          terminalState: 'online',
          requiredProgressState: 'restarting',
          onProgress: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st && st !== 'online' && st !== 'failed') {
              patchMachineContainerStatus(mid, cid, st);
            }
          },
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              clearContainerTransition(cid);
              patchMachineContainerStatus(mid, cid, 'failed');
              message.error({ content: `容器 ${container.container_name} 重启失败`, key: `restart-${cid}`, duration: 4 });
              return;
            }
            clearContainerTransition(cid);
            patchMachineContainerStatus(mid, cid, 'online');
            message.success({ content: `容器 ${container.container_name} 已重启`, key: `restart-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `重启指令已发送`, key: `restart-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('restart container failed', e);
      // revert to online
      clearContainerTransition(cid);
      patchMachineContainerStatus(mid, cid, 'online');
      try { await showErrorModal({ message: e?.body || e || '重启失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('重启失败');
    }
  };

  // 机器实时数据 meter（runtime_snapshot 使用率）；无快照显示 '-'
  const renderLiveMeter = (label, usagePercent, className = '') => {
    const num = Number(usagePercent);
    const pct = Number.isFinite(num) ? Math.min(Math.max(num, 0), 100) : null;
    return (
      <div className="mm-resource-meter">
        <div className="mm-resource-meter-head">
          <Typography.Text type="secondary">{label}</Typography.Text>
          <Typography.Text>{pct != null ? `${Math.round(pct)}%` : '-'}</Typography.Text>
        </div>
        <div className="mm-resource-meter-track">
          <div className={`mm-resource-meter-fill ${className}`} style={{ width: pct != null ? `${pct}%` : '0%' }} />
        </div>
      </div>
    );
  };

  const renderDiskUsage = (containerRecord) => {
    const total = containerRecord?.disk_total_gb;
    const limit = containerRecord?.disk_limit_gb;
    const pct = Number(containerRecord?.disk_usage_percent || 0);
    const actionState = getContainerActionState(containerRecord?.container_status, containerRecord?.display_status);
    return (
      <div className="mm-container-disk-line">
        <span>{total == null ? '磁盘 -' : `磁盘 ${total}G / ${limit != null ? `${limit}G` : '-'}`}</span>
        <div className="mm-container-disk-actions">
          {hasPermission('container:manage') && (
            <Button
              size="small"
              icon={<UnlockOutlined />}
              disabled={!actionState.canUnpause}
              onClick={(event) => {
                event.stopPropagation();
                openActionConfirm('unpause', { record: containerRecord });
              }}
            >
              解冻
            </Button>
          )}
          <Checkbox
            checked={containerRecord?.is_long_term === true}
            disabled={
              !!longTermUpdatingMap[String(containerRecord?.key)] ||
              (containerRecord?.is_long_term !== true && containerRecord?.long_term_container_can_enable === false)
            }
            onChange={e => handleLongTermChange(containerRecord, e.target.checked)}
            onClick={e => e.stopPropagation()}
          >
            长期
          </Checkbox>
        </div>
        <div className="mm-container-disk-track">
          <div
            className={pct >= 90 ? 'mm-container-disk-fill danger' : pct >= 75 ? 'mm-container-disk-fill warn' : 'mm-container-disk-fill'}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  const renderContainerCard = (containerRecord, machine) => {
    if (!containerRecord) {
      return (
        <div className="mm-container-card mm-container-card-empty">
          <Typography.Text type="secondary">空位</Typography.Text>
        </div>
      );
    }

    const status = String(containerRecord?.container_status || '').toLowerCase();
    const startDisabled = status !== 'offline';
    const restartDisabled = status !== 'online';
    const stopDisabled = status !== 'online';
    const sshRefreshLoading = !!sshRefreshingMap[String(containerRecord?.key)];
    const cleanupText = formatCleanupCountdown(containerRecord?.last_ssh_login_time, containerRecord);

    return (
      <article className="mm-container-card" key={containerRecord.key || containerRecord.container_id}>
        <div className="mm-container-card-head">
          <button
            type="button"
            className="mm-card-title-button"
            onClick={() => navigate(`/index/containers/${containerRecord.key || containerRecord.container_id}`)}
            title={containerRecord.container_name}
          >
            {containerRecord.container_name || '未命名容器'}
          </button>
          {renderContainerStatus(status)}
        </div>
        <div className="mm-container-card-meta">
          <CopyChip value={containerRecord.port || ''}>{containerRecord.port ? `:${containerRecord.port}` : '-'}</CopyChip>
          <span title={formatLastSshTime(containerRecord?.last_ssh_login_time)}>上次SSH {formatLastSshTime(containerRecord?.last_ssh_login_time)}</span>
          <span>清理倒计时 {cleanupText}</span>
        </div>
        {renderDiskUsage(containerRecord)}
        <div className="mm-container-card-actions">
          <Button size="small" type="primary" disabled={startDisabled} onClick={() => openActionConfirm('start', { record: containerRecord })}>
            启动
          </Button>
          <Button size="small" danger disabled={stopDisabled} onClick={() => openActionConfirm('stop', { record: containerRecord })}>
            停止
          </Button>
          <Button size="small" disabled={restartDisabled} onClick={() => openActionConfirm('restart', { record: containerRecord })}>
            重启
          </Button>
          <Button size="small" loading={sshRefreshLoading} onClick={() => refreshSshTimeForContainer(containerRecord)}>
            SSH
          </Button>
        </div>
      </article>
    );
  };

  const renderMachineCard = (record) => {
    const mid = String(record.key);
    const entry = containerMap[mid] || {};
    const containerKeyword = (searchContainerName || '').trim().toLowerCase();
    const isContainerSearchMode = !!containerKeyword;
    const containers = entry.data || [];
    const preview = containers.slice(0, 4);
    const slots = [...preview, ...Array.from({ length: Math.max(0, 4 - preview.length) }, () => null)];
    const selected = String(record.key) === String(selectedRowKey);

    return (
      <article
        className={`mm-machine-card ${selected ? 'mm-machine-card-selected' : ''}`}
        key={record.key}
        onClick={() => setSelectedRowKey(record.key)}
      >
        <aside className="mm-machine-rail">
          <div>
            <Typography.Text type="secondary">机器</Typography.Text>
            <CopyChip value={record.machine_name || `机器 ${record.key}`} size="title" block>
              {record.machine_name || `机器 ${record.key}`}
            </CopyChip>
            {renderStatusTag(record.machine_status, record)}
            <CopyChip value={record.machine_ip || ''} className="mm-machine-ip" size="meta" tone="soft">
              {record.machine_ip || '-'}
            </CopyChip>
          </div>
          <div className="mm-machine-rail-meters">
            {(() => {
              // 实时数据（runtime_snapshot 使用率）；GPU 取多卡平均利用率
              const snap = record?.runtime_snapshot || {};
              const cpuLive = Number(snap?.cpu?.usage_percent);
              const memLive = Number(snap?.memory?.usage_percent);
              const gpuArr = Array.isArray(snap?.gpu) ? snap.gpu : [];
              const gpuLive = gpuArr.length
                ? gpuArr.reduce((sum, g) => sum + Number(g?.utilization_gpu_percent || 0), 0) / gpuArr.length
                : null;
              return (
                <>
                  {renderLiveMeter('CPU', Number.isFinite(cpuLive) ? cpuLive : null, 'cpu')}
                  {renderLiveMeter('内存', Number.isFinite(memLive) ? memLive : null, 'memory')}
                  {renderLiveMeter('GPU', gpuLive, 'gpu')}
                </>
              );
            })()}
          </div>
          <div className="mm-machine-rail-actions">
            <Button size="small" icon={<DesktopOutlined />} onClick={(e) => { e.stopPropagation(); navigate(`/index/machines/${record.machine_id ?? record.key}`); }}>
              详情
            </Button>
            <Button size="small" icon={<SafetyCertificateOutlined />} onClick={(e) => { e.stopPropagation(); openPermissionModal(record); }}>
              权限
            </Button>
            <Button size="small" danger icon={<DeleteOutlined />} onClick={(e) => { e.stopPropagation(); openDeleteConfirm(record); }}>
              删除
            </Button>
          </div>
        </aside>

        <section className="mm-machine-main">
          <div className="mm-machine-main-head">
            <Typography.Text type="secondary">
              {isContainerSearchMode
                ? `${entry.total_number ?? containers.length ?? 0} 个容器`
                : entry.loading ? '容器加载中' : `${entry.total_number ?? containers.length ?? 0} 个容器`}
            </Typography.Text>
            <Space size={6}>
              <Button size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); navigate('/index/create', { state: { machineId: record.machine_id ?? record.key } }); }}>
                添加容器
              </Button>
              <Button size="small" icon={<ReloadOutlined />} onClick={(e) => { e.stopPropagation(); fetchContainersForMachine(record.key); }} />
            </Space>
          </div>
          <div className="mm-container-card-grid">
            {slots.map((containerRecord, index) => (
              <React.Fragment key={containerRecord?.key || `empty-${record.key}-${index}`}>
                {renderContainerCard(containerRecord, record)}
              </React.Fragment>
            ))}
          </div>
          <div className="mm-machine-pager">
            <Button
              size="small"
              disabled={entry.loading || (entry.page ?? 0) <= 0}
              onClick={(e) => { e.stopPropagation(); fetchContainersForMachine(record.key, (entry.page || 0) - 1); }}
            >
              上一页
            </Button>
            <Typography.Text type="secondary">
              {(entry.page ?? 0) + 1} / {entry.total_page || 1}
            </Typography.Text>
            <Button
              size="small"
              disabled={entry.loading || (entry.page ?? 0) + 1 >= (entry.total_page || 1)}
              onClick={(e) => { e.stopPropagation(); fetchContainersForMachine(record.key, (entry.page || 0) + 1); }}
            >
              下一页
            </Button>
          </div>
        </section>
      </article>
    );
  };

  return (
    <>
      <ContainerActionConfirmModal
        visible={actionModal.visible}
        action={actionModal.type}
        container={actionModal.data?.record || actionModal.data}
        onConfirm={handleActionConfirm}
        onCancel={closeActionModal}
        loading={actionModal.loading}
      />
      <div className="mm-root">
        {/* 1. 搜索区域 */}
        <div ref={searchBarRef} style={searchBarStyle} className="mm-search-bar mm-auto-hide-bar">
          <EntitySearchBar
            primaryLabel="机器"
            primaryPlaceholder="搜索机器名 / IP / 机器ID"
            primaryValue={searchMachine}
            onPrimaryChange={setSearchMachine}
            secondaryLabel="容器"
            secondaryPlaceholder="搜索容器名 / ID / 端口 / 机器IP"
            secondaryValue={searchContainerName}
            onSecondaryChange={setSearchContainerName}
            actions={
              <Space size={6}>
                <Button type="default" icon={<PlusOutlined />} onClick={openAddHostModal}>
                  添加宿主机
                </Button>
              </Space>
            }
          />
        </div>

        {/* 2. 机器卡片网格 */}
        <div>
          <Typography.Title level={4}>机器列表</Typography.Title>
        </div>
        {machinesLoading ? (
          <div className="mm-grid-empty">机器加载中...</div>
        ) : filteredMachineData.length > 0 ? (
          <div className="mm-machine-grid">
            {filteredMachineData.map(record => renderMachineCard(record))}
          </div>
        ) : (
          <div className="mm-grid-empty">没有匹配的机器</div>
        )}
      </div>

      <ConfirmModal
        visible={addHostVisible}
        title="添加宿主机"
        message="请填写宿主机信息并确认"
        loading={addHostLoading}
        confirmText='添加'
        onConfirm={handleAddHostConfirm}
        onCancel={() => {
          setAddHostVisible(false);
          addHostForm.resetFields();
        }}
        content={
          <Form form={addHostForm} layout="vertical">
              <Typography.Text type="secondary">
                新机器通过 register_machine 建档。这里只填写最小信任锚，硬件信息由 node 首连返回，资源上限由 ctrl 默认策略生成。
              </Typography.Text>
              <Row gutter={16} className="mm-add-machine-anchor-row">
                <Col span={12}>
                  <Form.Item name="machine_name" label="机器名" rules={[{ required: true, message: '请输入机器名' }, { max: 115, message: '机器名长度不得超过115个字符' }]}>
                    <Input placeholder="例如 GPU-A100-01" maxLength={115} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="machine_ip" label="IP 地址" rules={[{ required: true, message: '请输入 IP 地址' }]}>
                    <Input placeholder="192.168.x.x" />
                  </Form.Item>
                </Col>
              </Row>
              <Form.Item name="machine_description" label="描述">
                <Input.TextArea rows={3} placeholder="可选，机器位置、用途或维护说明" maxLength={115} />
              </Form.Item>
            </Form>
        }
      />

      {/* 删除宿主机 - 二次确认（敏感行为） */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="确认删除宿主机"
        icon={<DesktopOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
        message={deleteTargetMachine ? (
          <div>
            <div className="mm-delete-headline">你即将<span className="mm-action-verb">删除</span>的是：<span className="mm-delete-headline-type">机器</span></div>
            <div className="mm-delete-name">名称：{deleteTargetMachine.machine_name || deleteTargetMachine.key}</div>
          </div>
        ) : '确认删除该宿主机？'}
        content={
          deleteTargetMachine ? (
            <div className="mm-danger-box">
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Typography.Text type="secondary">机器ID：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetMachine.machine_id || deleteTargetMachine.key}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">机器名：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetMachine.machine_name}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">IP：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetMachine.machine_ip}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">类型：</Typography.Text>
                  <Tag className="mm-ml-8">{(deleteTargetMachine.machine_type || '').toUpperCase()}</Tag>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">状态：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{(deleteTargetMachine.machine_status || '').toLowerCase()}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" className="mm-danger-text">
                此操作不可恢复！此操作将移除该机器及其所有容器。             </Typography.Text>
            </div>
          ) : null
        }
        danger
        iconColor="#ff4d4f"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setDeleteConfirmVisible(false); setDeleteTargetMachine(null); }}
        loading={deleteLoading}
        confirmText="删除"
      />

      {/* 删除容器 - 二次确认 */}
      <ContainerActionConfirmModal
        visible={containerDeleteConfirmVisible}
        action="delete"
        container={deleteTargetContainer}
        onConfirm={handleDeleteContainerConfirm}
        onCancel={() => { setContainerDeleteConfirmVisible(false); setDeleteTargetContainer(null); setDetailModalVisible(true); }}
        loading={containerDeleteLoading}
      />

      {/* 容器详情弹窗 */}
      <ContainerDetailModal
        visible={detailModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onEdit={openEditModal}
        onUnpause={handleUnpauseContainer}
        onDelete={openDeleteContainerConfirm}
        usersList={usersList}
        currentUserName={localStorage.getItem('currentUserName')}
        currentUserId={localStorage.getItem('currentUserId')}
        forceSystemAdmin={true}
        />

      {/* 添加容器 确认弹窗（包含表单） */}
      <Modal
        open={permissionModalVisible}
        title={permissionMachine ? '机器权限 - ' + (permissionMachine.machine_name || permissionMachine.machine_ip || permissionMachine.key) : '机器权限'}
        onCancel={() => setPermissionModalVisible(false)}
        footer={null}
        width={760}
        destroyOnClose
      >
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Typography.Text type="secondary">为这台机器分配可访问的用户。下拉列表支持继续加载更多用户。</Typography.Text>
          <Space wrap style={{ width: '100%', justifyContent: 'space-between' }}>
            <Select
              mode="multiple"
              showSearch
              allowClear
              placeholder="选择用户（可多选）"
              style={{ minWidth: 360, flex: 1 }}
              value={permissionUsersSelected}
              loading={permissionModalLoading}
              onChange={(value) => setPermissionUsersSelected(value || [])}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(String(input).toLowerCase())}
              maxTagCount="responsive"
              dropdownRender={(menu) => (
                <div>
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
                    <Checkbox
                      checked={permissionUsers.length > 0 && permissionUsers.filter(u => !permissionAssignedUserIds.includes(u.id)).every(u => permissionUsersSelected.includes(u.id))}
                      indeterminate={permissionUsers.some(u => permissionUsersSelected.includes(u.id)) && !permissionUsers.filter(u => !permissionAssignedUserIds.includes(u.id)).every(u => permissionUsersSelected.includes(u.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const selectable = permissionUsers.map(u => u.id).filter(uid => !permissionAssignedUserIds.includes(uid));
                          setPermissionUsersSelected(Array.from(new Set([...(permissionUsersSelected || []), ...selectable])));
                        } else {
                          setPermissionUsersSelected([]);
                        }
                      }}
                    >
                      全选当前页
                    </Checkbox>
                    <Typography.Text type="secondary">已选 {permissionUsersSelected.length} 人</Typography.Text>
                  </div>
                  {menu}
                  <div style={{ padding: 8, textAlign: 'center' }}>
                    {permissionUsersLoadingMore ? <LoadingOutlined /> : permissionUsersHasMore ? <Button type="link" onClick={loadMorePermissionUsers}>加载更多用户</Button> : <Typography.Text type="secondary">没有更多用户了</Typography.Text>}
                  </div>
                </div>
              )}
              options={permissionUsers.map(u => ({
                value: u.id,
                label: u.username + (u.email ? ' <' + u.email + '>' : ''),
                disabled: permissionAssignedUserIds.includes(u.id),
              }))}
            />
            <Button type="primary" icon={<PlusOutlined />} loading={permissionModalSubmitting} onClick={handleGrantMachinePermission} disabled={!permissionUsersSelected.length}>添加权限</Button>
          </Space>
          <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, padding: 12, background: '#fafafa' }}>
            <Typography.Text strong>已授权用户</Typography.Text>
            <div style={{ marginTop: 12 }}>
              {permissionAssignedUserIds.length ? (
                <Space wrap>
                  {permissionAssignedUserIds.map(uid => {
                    const user = permissionUsers.find(u => u.id === uid);
                    return <Tag key={uid} color="blue">{user ? user.username : '用户 #' + uid}</Tag>;
                  })}
                </Space>
              ) : (
                <Typography.Text type="secondary">暂无授权用户</Typography.Text>
              )}
            </div>
          </div>
        </Space>
      </Modal>


      {/* 编辑用户弹窗 */}
      <EditUserModal
        visible={editModalVisible}
        container={selectedContainer}
        onClose={closeAllModals}
        onBack={returnToDetail}
        usersList={usersList}
        usersLoading={usersLoading}
        forceSystemAdmin={true}
      />
    </>
  );
};

export default ManageMachine;
