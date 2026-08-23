import React, { useState, useEffect, useRef } from 'react';
import { listAllMachineBrefInformation, getDetailInformation, registerMachine, removeMachine, updateMachine, setMachineMaintenance, addMachinePermission, listMachinePermissions } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, addCollaborator, removeCollaborator, updateRole, createContainer, deleteContainer, startContainer, stopContainer, restartContainer, setLongTermContainer, refreshLastSshLoginTime, unpauseContainer } from '../api/container_api';
import { SearchOutlined, ReloadOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, SettingOutlined, GlobalOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SafetyCertificateOutlined, LoadingOutlined, DesktopOutlined, ContainerOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Space, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm, InputNumber, Radio, Slider, Checkbox } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';
import ContainerDetailModal from '../components/ContainerDetailModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation, listAllUserBrefInformation } from '../api/user_api';
import { isAbortError } from '../utils/requestManager';
import { useNavigate } from 'react-router-dom';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
import CopyChip from '../components/CopyChip';
const { Option } = Select;

import { startContainerStatusHeartbeat, startMachineStatusHeartbeat } from '../utils/heartbeat';
import { parseSshTimeToDate, formatDuration } from '../utils/timeFormat';


import './ManageMachine.css';

// machines loaded from backend
const defaultPageSize = 100;
const userPermissionPageSize = 20;


// ROLE枚举定义
const ROLE = {
  ADMIN: 'ADMIN',
  COLLABORATOR: 'COLLABORATOR',
  ROOT: 'ROOT'
};

// 远端获取的数据会被存在 `containerMap`

// 角色配置
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

const SSH_CLEANUP_WINDOW_DAYS = 7;

// ── SSH 清理时间 辅助函数 ──────────────────────────────────────────
// parseSshTimeToDate / formatDuration 由 ../utils/timeFormat 统一提供
// （ISO 形串按 UTC 解析，syslog/last 形串按节点口径解析），此处不再重复定义。

const formatBeijingDateTime = (date) => date.toLocaleString('zh-CN', {
  timeZone: 'Asia/Shanghai',
  hour12: false,
});

const formatLastSshTime = (raw) => {
  if (!raw) return '从未登录';
  const d = parseSshTimeToDate(raw);
  if (!d) return String(raw);
  return formatBeijingDateTime(d);
};

const formatCleanupCountdown = (raw, record = null) => {
  if (record?.is_long_term === true) return '长期容器';
  if (!raw && (!record || record.cleanup_status === 'unknown' || record.seconds_until_cleanup == null)) {
    return '从未登录';
  }
  if (record && typeof record === 'object') {
    const status = record.cleanup_status;
    const seconds = Number(record.seconds_until_cleanup);
    if (status === 'due') return '可清理';
    if (Number.isFinite(seconds) && seconds >= 0) {
      return formatDuration(seconds);
    }
  }

  const d = parseSshTimeToDate(raw);
  if (!d) return '从未登录';
  const expireAt = d.getTime() + SSH_CLEANUP_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const diff = expireAt - Date.now();
  if (diff <= 0) return '可清理';
  return formatDuration(Math.floor(diff / 1000));
};

const ManageMachine = () => {
  // 机器搜索状态
  const [searchName, setSearchName] = useState('');
  const [searchIP, setSearchIP] = useState('');
  const [searchContainerName, setSearchContainerName] = useState('');

  // machines from backend
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  // machine status transition loading flags: { [machineId]: boolean }
  const [machineStatusLoadingMap, setMachineStatusLoadingMap] = useState({});
  // 当前选中的行 key（用于高亮和关联展开面板）
  const [selectedRowKey, setSelectedRowKey] = useState(null);
  
  // 容器搜索状态
  const [containerSearch, setContainerSearch] = useState({});
  // containers per machine cache: { [machineId]: { loading: bool, data: [] } }
  const [containerMap, setContainerMap] = useState({});
  const [longTermUpdatingMap, setLongTermUpdatingMap] = useState({});
  const [sshRefreshingMap, setSshRefreshingMap] = useState({});
  // top-level container-name search loading
  const [containerSearchLoading, setContainerSearchLoading] = useState(false);
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

  useEffect(() => {
    const checkAuthAndPerm = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        if (!name || !id) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          handleAuthError(401, navigate);
          return;
        }

        const res = await getUserDetailInformation(Number(id));
        const info = (res && (res.user_info || res.data)) || res || {};
        const isOperator = info.is_operator === true || info.role === 'operator' || info.permission === 'operator' || (Array.isArray(info.permissions) && info.permissions.includes('operator')) || (typeof info.permissions === 'string' && info.permissions.includes('operator'));
        if (!isOperator) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '权限不足', message: '需要操作员权限', status: 403 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          handleAuthError(403, navigate);
        }
      } catch (e) {
        if (!sessionStorage.getItem('auth_modal_shown')) {
          try {
            sessionStorage.setItem('auth_modal_shown', '1');
            await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          } finally {
            sessionStorage.removeItem('auth_modal_shown');
          }
        }
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndPerm();
  }, [navigate]);

  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  // 高风险操作确认弹窗（停止/重启）
  const [actionModal, setActionModal] = useState({ visible: false, type: '', loading: false, data: null });
  // 添加宿主机弹窗
  const [addHostVisible, setAddHostVisible] = useState(false);
  const [addHostLoading, setAddHostLoading] = useState(false);
  const [addHostForm] = Form.useForm();
  // 添加容器弹窗
  const [addContainerVisible, setAddContainerVisible] = useState(false);
  const [addContainerLoading, setAddContainerLoading] = useState(false);
  const [addContainerForm] = Form.useForm();
  const [addContainerMachineId, setAddContainerMachineId] = useState(null);
  const [addContainerUnsafe, setAddContainerUnsafe] = useState(false);
  const [addContainerMachineType, setAddContainerMachineType] = useState('CPU');
  const [addContainerFieldErrors, setAddContainerFieldErrors] = useState({});
  const addContainerMachine = machines.find(m => String(m.machine_id || m.key) === String(addContainerMachineId));
  // 编辑模式
  const [isEditMode, setIsEditMode] = useState(false);
  const [editTargetMachine, setEditTargetMachine] = useState(null);
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
      if (type === 'stop') {
        await handleStopContainer(data.record || data);
        message.success(`容器 ${data.record?.container_name || ''} 停止请求已发送`);
      } else if (type === 'restart') {
        await handleRestartContainer(data.record || data);
        message.success(`容器 ${data.record?.container_name || ''} 重启请求已发送`);
      }
    } catch (err) {
      console.error('action confirm failed', err);
      await showErrorModal({ message: err?.body || err || '操作失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setActionModal({ visible: false, type: '', loading: false, data: null });
    }
  };

  const getActionModalConfig = () => {
    const { type, data } = actionModal;
    const configs = {
      stop: {
        title: '确认停止容器',
        message: `确定要停止容器 ${data?.record?.container_name || ''} 吗？`,
        content: (
          <div className="home-modal-danger">
            <Typography.Text type="danger">停止容器是高风险操作，可能导致服务中断或数据不可用。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认停止'
      },
      restart: {
        title: '确认重启容器',
        message: `确定要重启容器 ${data?.record?.container_name || ''} 吗？`,
        content: (
          <div className="home-modal-danger">
            <Typography.Text type="danger">重启容器是高风险操作，可能会中断正在运行的任务。</Typography.Text>
          </div>
        ),
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认重启'
      }
    };
    return configs[type] || {};
  };

  //加载机器列表
  const fetchMachinesFromApi = async () => {
    setMachinesLoading(true);
    try {
      // 获取机器列表
      const res = await listAllMachineBrefInformation({ page_number: 0, page_size: defaultPageSize });
      const items = (res && res.machines) || [];
      
      // 基础映射
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
                machine_status: (detail.machine_status ?? it.machine_status).toLowerCase()
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

  const baseFilteredMachineData = machines.filter(machine => {
    const matchName = (machine.machine_name || '').toLowerCase().includes(searchName.toLowerCase());
    const matchIP = (machine.machine_ip || '').includes(searchIP);
    return matchName && matchIP;
  });


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
        container_name: containerName,
        page_number: pageNumber,
        page_size: pageSize,
      });
      const items = (res && (res.containers_info || res.containers)) || [];
      const total_page = (res && (res.total_page || res.totalPages || res.total_pages)) || 1;
      const total_number = Number(res && (res.total_number ?? res.totalNumber ?? res.total)) || items.length;
      const mapped = items.map((c, idx) => ({
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

  // 顶部“容器名”搜索：由后端按机器和容器名分页过滤
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
      setContainerSearchLoading(true);
      Promise.all(baseFilteredMachineData.map(machine => fetchContainersForMachine(machine.key, 0, keyword)))
        .finally(() => setContainerSearchLoading(false));
      containerSearchTimerRef.current = null;
    }, 300);
    return () => {
      if (containerSearchTimerRef.current) {
        clearTimeout(containerSearchTimerRef.current);
        containerSearchTimerRef.current = null;
      }
    };
  }, [searchContainerName, searchName, searchIP, machines]);

  const filteredMachineData = baseFilteredMachineData.filter(machine => {
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
    if (mid && machineStatusLoadingMap[mid]) return <Tag color="processing">处理中</Tag>;
    const color = normalized === 'online' ? 'green' : normalized === 'offline' ? 'volcano' : 'orange';
    return <Tag color={color}>{normalized === 'online' ? '运行中' : normalized === 'offline' ? '已停止' : '维护中'}</Tag>;
  };

  const renderContainerStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    const color = normalized === 'online' ? 'green' : normalized === 'offline' ? 'volcano' : normalized === 'paused' ? 'volcano' : normalized === 'creating' ? 'blue' : normalized === 'starting' ? 'cyan' : normalized === 'restarting' ? 'purple' : normalized === 'stopping' ? 'orange' : normalized === 'failed' ? 'red' : 'default';
    const labelMap = { online: '运行中', offline: '已停止', paused: '磁盘已冻结', creating: '创建中', starting: '启动中', stopping: '停止中', restarting: '重启中', failed: '异常' };
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
  const handleContainerSearch = (machineId, value) => {
    setContainerSearch(prev => ({
      ...prev,
      [machineId]: value
    }));
  };

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
    setIsEditMode(false);
    setEditTargetMachine(null);
    setAddHostVisible(true);
  };

  // 打开添加容器弹窗（基于宿主机）
  const openAddContainerModal = (machine) => {
    // machine may be a record from table
    const mid = machine?.machine_id ?? machine?.key ?? null;
    setAddContainerMachineId(mid);
    addContainerForm.resetFields();
    setAddContainerFieldErrors({});
    // prefill machine id and defaults
    const defaultUser = localStorage.getItem('currentUserName') || localStorage.getItem('currentUser') || '';
    const mtype = (machine && (machine.machine_type || machine.machine_type === 0) ? (machine.machine_type || 'CPU') : 'CPU');
    setAddContainerMachineType((mtype || 'CPU').toUpperCase());
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 1, SHARED_MEM: 0, GPU_LIST: [], gpu_number: 0, root_user: defaultUser });
    setAddContainerVisible(true);
  };

  // 添加容器确认
  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
      // quick client-side guard: shared must not exceed memory
      try {
        const mem = Number(values.MEMORY || 0);
        const shared = Number(values.SHARED_MEM || 0);
        if (shared > mem) {
          setAddContainerFieldErrors(prev => ({ ...(prev || {}), SHARED_MEM: `共享空间不得大于内存 (${mem} GB)` }));
          message.error('共享空间不得大于内存');
          return;
        }
      } catch (e) {
        // ignore parse errors and continue to server-side validation
      }
      setAddContainerLoading(true);
      const machineId = values.machine_id || addContainerMachineId;
      const toAddUserName = values.root_user || localStorage.getItem('currentUserName') || '';
        // build GPU_LIST according to host type and requested gpu_number
        let gpuList = [];
        try {
          if ((addContainerMachineType || '').toUpperCase() === 'GPU') {
            const gnum = Number(values.gpu_number || 0);
            if (Number.isInteger(gnum) && gnum > 0) {
              gpuList = Array.from({ length: gnum }, (_, i) => i);
            } else {
              gpuList = values.GPU_LIST || [];
            }
          } else {
            gpuList = [];
          }
        } catch (e) {
          gpuList = values.GPU_LIST || [];
        }

        const payload = {
          user_name: toAddUserName,
          machine_id: machineId,
          container: {
            GPU_LIST: gpuList,
            CPU_NUMBER: values.CPU_NUMBER || 1,
            MEMORY: values.MEMORY || 1,
            NAME: values.NAME || `container-${Date.now()}`,
            image: values.image || '',
            shared_memory: values.SHARED_MEM || 0
          },
          public_key: values.public_key || ''
        };
      let success = false;
      try {
        const res = await createContainer(payload);
        // refresh container list for the machine（回到第一页）
        if (machineId) {
          const mid = String(machineId);
          await fetchContainersForMachine(mid, 0);
        }
        message.success('容器添加成功');
        // start heartbeat for this container (non-blocking) and update local container map when RUNNING
        try {
          startContainerStatusHeartbeat({
            machine_id: machineId,
            container_name: payload.container.NAME,
            onRunning: (data) => {
              const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
              if (st === 'failed') {
                try {
                  const mid = String(machineId);
                  setContainerMap(prev => {
                    const entry = prev[mid] || {};
                    const data2 = (entry.data || []).map(item => {
                      if (item.container_name === payload.container.NAME) {
                        return { ...item, container_status: 'failed' };
                      }
                      return item;
                    });
                    return { ...prev, [mid]: { ...(entry || {}), data: data2 } };
                  });
                } catch (e) {}
                message.error('容器创建失败');
                return;
              }
              try {
                const mid = String(machineId);
                setContainerMap(prev => {
                  const entry = prev[mid] || {};
                  const data2 = (entry.data || []).map(item => {
                    if (item.container_name === payload.container.NAME) {
                      return { ...item, container_status: 'online' };
                    }
                    return item;
                  });
                  return { ...prev, [mid]: { ...(entry || {}), data: data2 } };
                });
                message.success('容器已运行');
              } catch (e) {
                // ignore update errors
              }
            },
          });
        } catch (e) {
          // ignore heartbeat start errors
        }
        success = true;
      } catch (err) {
        console.error('createContainer failed', err);
        const status = err?.response?.status || err?.status;
        await showErrorModal({ message: err?.body || err || '添加容器失败，请重试', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
        if (status === 403) {
          handleAuthError(403, navigate);
        }
      } finally {
        setAddContainerLoading(false);
        if (success) {
          setAddContainerVisible(false);
          setAddContainerMachineId(null);
        }
      }
    } catch (err) {
      // validation failed
    }
  };

  // 打开编辑宿主机弹窗（与添加使用同一表单，但为编辑模式）
  const openEditMachine = async (machine) => {
    setIsEditMode(true);
    setEditTargetMachine(machine);
    setAddHostLoading(true);
    // try to fetch detailed info from backend to populate max_* fields
    try {
      const mid = machine.machine_id || machine.key;
      let detail = null;
      try {
        detail = await getDetailInformation(Number(mid));
      } catch (e) {
        // fallback to passed machine object if API call fails
        detail = null;
      }
      const src = detail || machine || {};
      addHostForm.setFieldsValue({
        machine_name: src.machine_name || machine.machine_name || '',
        machine_ip: src.machine_ip || machine.machine_ip || '',
        machine_type: (src.machine_type || machine.machine_type || 'CPU').toUpperCase() === 'GPU' ? 'GPU' : 'CPU',
        machine_status: (src.machine_status || machine.machine_status || 'online').toLowerCase(),
        maintenance_mode: (src.is_maintenance ?? machine.is_maintenance) ? 'maintenance' : 'normal',
        cpu_core_number: src.cpu_core_number ?? machine.cpu_core_number ?? null,
        gpu_number: src.gpu_number ?? machine.gpu_number ?? 0,
        gpu_type: src.gpu_type || machine.gpu_type || '',
        memory_size: src.memory_size_gb ?? machine.memory_size_gb ?? null,
        max_memory_gb: src.max_memory_gb ?? machine.max_memory_gb ?? 0,
        max_gpu_number: src.max_gpu_number ?? machine.max_gpu_number ?? 0,
        max_cpu_core_number: src.max_cpu_core_number ?? machine.max_cpu_core_number ?? 0,
        max_shared_gb: src.max_shared_gb ?? machine.max_shared_gb ?? null,
        disk_size: src.disk_size_gb ?? machine.disk_size_gb ?? null,
        machine_description: src.machine_description || machine.machine_description || ''
      });
      setAddHostVisible(true);
    } catch (err) {
      console.error('openEditMachine failed', err);
      await showErrorModal({ message: err?.body || err || '获取宿主机详情失败，请重试' });
    } finally {
      setAddHostLoading(false);
    }
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

      if (isEditMode && editTargetMachine) {
        // 编辑模式 -> 调用更新接口
        let success = false;
        try {
          const mid = editTargetMachine.machine_id || editTargetMachine.key;
          await updateMachine(mid, payload);
          const requestedMaintenance = values.maintenance_mode === 'maintenance';
          const oldMaintenance = Boolean(editTargetMachine.is_maintenance);
          if (requestedMaintenance !== oldMaintenance) {
            await setMachineMaintenance(mid, requestedMaintenance);
          }
          const realStatus = String(editTargetMachine.machine_status || 'offline').toLowerCase();
          const updatedMachine = {
            ...editTargetMachine,
            machine_name: payload.machine_name,
            machine_ip: payload.machine_ip,
            machine_type: (payload.machine_type || '').toUpperCase(),
            machine_status: realStatus,
            is_maintenance: requestedMaintenance,
            display_status: requestedMaintenance ? 'maintenance' : realStatus,
            cpu_core_number: payload.cpu_core_number,
            memory_size_gb: payload.memory_size,
            max_memory_gb: payload.max_memory_gb,
            max_gpu_number: payload.max_gpu_number,
            max_cpu_core_number: payload.max_cpu_core_number,
            max_shared_gb: payload.max_shared_gb,
            gpu_number: payload.gpu_number,
            gpu_type: payload.gpu_type,
            disk_size_gb: payload.disk_size,
            machine_description: payload.machine_description || ''
          };
          setMachines(prev => prev.map(m => (m.key === editTargetMachine.key ? updatedMachine : m)));
          message.success('宿主机已更新');
          success = true;
          } catch (err) {
          console.error('updateMachine failed', err);
          const status = err?.response?.status || err?.status;
          await showErrorModal({ message: err?.body || err || ('更新宿主机失败：' + (err?.message || '未知错误')), status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
          if (status === 403) {
            handleAuthError(403, navigate);
          }
        } finally {
          setAddHostLoading(false);
          if (success) {
            setIsEditMode(false);
            setEditTargetMachine(null);
            setAddHostVisible(false);
          }
        }
      } else {
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
      }
    } catch (err) {
      // validation failed
    }
  };

  // 打开删除确认弹窗
  const openDeleteConfirm = (machine) => {
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

  // 这里的容器操作函数（启动/停止/重启）有互锁的状态更新
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

  // 从编辑返回详情页（编辑为实时更新）——重新拉取容器详情并显示
  const handleStartContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'starting' } : c)) };
        }
        return copy;
      });
      message.loading({ content: `正在启动 ${container.container_name}...`, key: `start-${cid}` });
      await startContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          terminalState: 'online',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainerMap(prev => {
                const copy = { ...prev };
                if (copy[mid] && Array.isArray(copy[mid].data)) {
                  copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)) };
                }
                return copy;
              });
              message.error({ content: `容器 ${container.container_name} 创建失败`, key: `start-${cid}`, duration: 4 });
              return;
            }
            setContainerMap(prev => {
              const copy = { ...prev };
              if (copy[mid] && Array.isArray(copy[mid].data)) {
                copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)) };
              }
              return copy;
            });
            message.success({ content: `容器 ${container.container_name} 已启动`, key: `start-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `启动指令已发送`, key: `start-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('start container failed', e);
      // revert
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'offline' } : c)) };
        }
        return copy;
      });
      try { await showErrorModal({ message: e?.body || e || '启动失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('启动失败');
    }
  };

  const handleStopContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'stopping' } : c)) };
        }
        return copy;
      });
      message.loading({ content: `正在停止 ${container.container_name}...`, key: `stop-${cid}` });
      await stopContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          terminalState: 'offline',
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainerMap(prev => {
                const copy = { ...prev };
                if (copy[mid] && Array.isArray(copy[mid].data)) {
                  copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)) };
                }
                return copy;
              });
              message.error({ content: `容器 ${container.container_name} 状态异常`, key: `stop-${cid}`, duration: 4 });
              return;
            }
            setContainerMap(prev => {
              const copy = { ...prev };
              if (copy[mid] && Array.isArray(copy[mid].data)) {
                copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'offline' } : c)) };
              }
              return copy;
            });
            message.success({ content: `容器 ${container.container_name} 已停止`, key: `stop-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `停止指令已发送`, key: `stop-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('stop container failed', e);
      // revert
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)) };
        }
        return copy;
      });
      try { await showErrorModal({ message: e?.body || e || '停止失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('停止失败');
    }
  };

  const handleRestartContainer = async (container) => {
    if (!container) return;
    const cid = container.key;
    const mid = String(container.machine_id || container.machine_id || container.machine_ip || '');
    try {
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'restarting' } : c)) };
        }
        return copy;
      });
      message.loading({ content: `正在重启 ${container.container_name}...`, key: `restart-${cid}` });
      await restartContainer(Number(cid));
      try {
        startContainerStatusHeartbeat({
          machine_id: container.machine_id,
          machine_ip: container.machine_ip,
          container_name: container.container_name,
          terminalState: 'online',
          requiredProgressState: 'restarting',
          onProgress: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st && st !== 'online' && st !== 'failed') {
              setContainerMap(prev => {
                const copy = { ...prev };
                if (copy[mid] && Array.isArray(copy[mid].data)) {
                  copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: st } : c)) };
                }
                return copy;
              });
            }
          },
          onTerminal: (data) => {
            const st = (data && data.container_status) ? String(data.container_status).toLowerCase() : null;
            if (st === 'failed') {
              setContainerMap(prev => {
                const copy = { ...prev };
                if (copy[mid] && Array.isArray(copy[mid].data)) {
                  copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'failed' } : c)) };
                }
                return copy;
              });
              message.error({ content: `容器 ${container.container_name} 重启失败`, key: `restart-${cid}`, duration: 4 });
              return;
            }
            setContainerMap(prev => {
              const copy = { ...prev };
              if (copy[mid] && Array.isArray(copy[mid].data)) {
                copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)) };
              }
              return copy;
            });
            message.success({ content: `容器 ${container.container_name} 已重启`, key: `restart-${cid}`, duration: 2 });
          }
        });
      } catch (e) {
        message.success({ content: `重启指令已发送`, key: `restart-${cid}`, duration: 2 });
      }
    } catch (e) {
      console.error('restart container failed', e);
      // revert to online
      setContainerMap(prev => {
        const copy = { ...prev };
        if (copy[mid] && Array.isArray(copy[mid].data)) {
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'online' } : c)) };
        }
        return copy;
      });
      try { await showErrorModal({ message: e?.body || e || '重启失败', status: e?.status || e?.response?.status, route: e?.route || e?.response?.url }); } catch (er) {}
      message.error('重启失败');
    }
  };

  const formatLimitPair = (current, limit, unit = '') => {
    const cur = current === null || current === undefined || current === '' ? '-' : current;
    const max = limit === null || limit === undefined || limit === '' ? '-' : limit;
    return `${cur}${unit} / ${max}${unit}`;
  };

  const renderResourceMeter = (label, current, limit, className = '') => {
    const cur = Number(current || 0);
    const max = Number(limit || 0);
    const pct = max > 0 ? Math.min(Math.round((cur / max) * 100), 100) : 0;
    return (
      <div className="mm-resource-meter">
        <div className="mm-resource-meter-head">
          <Typography.Text type="secondary">{label}</Typography.Text>
          <Typography.Text>{formatLimitPair(current, limit)}</Typography.Text>
        </div>
        <div className="mm-resource-meter-track">
          <div className={`mm-resource-meter-fill ${className}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  const renderDiskUsage = (containerRecord) => {
    const total = containerRecord?.disk_total_gb;
    const limit = containerRecord?.disk_limit_gb;
    const pct = Number(containerRecord?.disk_usage_percent || 0);
    return (
      <div className="mm-container-disk-line">
        <span>{total == null ? '磁盘 -' : `磁盘 ${total}G / ${limit != null ? `${limit}G` : '-'}`}</span>
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

    return (
      <article className="mm-container-card" key={containerRecord.key || containerRecord.container_id}>
        <div className="mm-container-card-head">
          <button
            type="button"
            className="mm-card-title-button"
            onClick={() => openContainerDetail(containerRecord)}
            title={containerRecord.container_name}
          >
            {containerRecord.container_name || '未命名容器'}
          </button>
          {renderContainerStatus(status)}
        </div>
        <div className="mm-container-card-meta">
          <CopyChip value={containerRecord.port || ''}>{containerRecord.port ? `:${containerRecord.port}` : '-'}</CopyChip>
          <span>SSH {formatLastSshTime(containerRecord?.last_ssh_login_time)}</span>
        </div>
        {renderDiskUsage(containerRecord)}
        <div className="mm-container-card-actions">
          {status === 'paused' ? (
            <Button size="small" onClick={() => handleUnpauseContainer(containerRecord)}>
              解冻
            </Button>
          ) : (
            <Button size="small" type="primary" disabled={startDisabled} onClick={() => handleStartContainer(containerRecord)}>
              启动
            </Button>
          )}
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
            {renderResourceMeter('CPU', record.cpu_core_number, record.max_cpu_core_number, 'cpu')}
            {renderResourceMeter('内存', record.memory_size_gb, record.max_memory_gb, 'memory')}
            {renderResourceMeter('GPU', record.gpu_number, record.max_gpu_number, 'gpu')}
          </div>
          <div className="mm-machine-rail-actions">
            <Button size="small" icon={<SafetyCertificateOutlined />} onClick={(e) => { e.stopPropagation(); openPermissionModal(record); }}>
              权限
            </Button>
            <Button size="small" icon={<EditOutlined />} onClick={(e) => { e.stopPropagation(); openEditMachine(record); }}>
              编辑
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
                ? `${entry.total_number ?? containers.length ?? 0} 个匹配容器`
                : entry.loading ? '容器加载中' : `${entry.total_number ?? containers.length ?? 0} 个容器`}
            </Typography.Text>
            <Space size={6}>
              <Button size="small" icon={<PlusOutlined />} onClick={(e) => { e.stopPropagation(); openAddContainerModal(record); }}>
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
      <ConfirmModal
        visible={actionModal.visible}
        title={getActionModalConfig().title}
        message={getActionModalConfig().message}
        content={getActionModalConfig().content}
        danger={getActionModalConfig().danger}
        iconColor={getActionModalConfig().iconColor}
        confirmText={getActionModalConfig().confirmText}
        onConfirm={handleActionConfirm}
        onCancel={closeActionModal}
        loading={actionModal.loading}
      />
      <div className="mm-root">
        {/* 1. 搜索区域 */}
        <div ref={searchBarRef} style={searchBarStyle} className="mm-search-bar mm-auto-hide-bar">
          <Row gutter={[16, 0]} align="middle">
            <Col>
              <Typography.Text type="secondary">机器名：</Typography.Text>
              <Input
                placeholder="输入机器名"
                value={searchName}
                onChange={e => setSearchName(e.target.value)}
                allowClear
                className="mm-input-120"
              />
            </Col>
            <Col>
              <Typography.Text type="secondary">IP：</Typography.Text>
              <Input
                placeholder="输入IP"
                value={searchIP}
                onChange={e => setSearchIP(e.target.value)}
                allowClear
                className="mm-input-120"
              />
            </Col>
            <Col>
              <Typography.Text type="secondary">容器名：</Typography.Text>
              <Input
                placeholder="输入容器名"
                value={searchContainerName}
                onChange={e => setSearchContainerName(e.target.value)}
                allowClear
                className="mm-input-120"
              />
            </Col>
            <Col>
              <Button
                type="primary"
                icon={<SearchOutlined />}
                loading={containerSearchLoading}
                onClick={() => {
                  const keyword = (searchContainerName || '').trim();
                  setContainerSearchLoading(true);
                  Promise.all(baseFilteredMachineData.map(machine => fetchContainersForMachine(machine.key, 0, keyword)))
                    .finally(() => setContainerSearchLoading(false));
                }}
              >
                搜索
              </Button>
            </Col>
            <Col>
              <Button type="default" icon={<PlusOutlined />} onClick={openAddHostModal}>
                添加宿主机
              </Button>
            </Col>
          </Row>
        </div>

        {/* 2. 机器卡片网格 */}
        <div>
          <Typography.Title level={4}>机器与容器关系</Typography.Title>
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
        title={isEditMode ? "编辑宿主机" : "添加宿主机"}
        message={isEditMode ? "请修改宿主机信息并确认更新" : "请填写宿主机信息并确认"}
        loading={addHostLoading}
        confirmText={isEditMode ? '更新' : '添加'}
        content={
          !isEditMode ? (
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
          ) : (
          <Form
            form={addHostForm}
            layout="vertical"
            initialValues={{ machine_type: 'CPU', gpu_number: 0, maintenance_mode: 'normal', max_memory_gb: 0, max_gpu_number: 0, max_cpu_core_number: 0, max_shared_gb: 0 }}
              onValuesChange={(changedValues) => {
                if (changedValues.machine_type) {
                  if (changedValues.machine_type !== 'GPU') {
                    // when switching away from GPU, reset gpu-related fields
                    addHostForm.setFieldsValue({ gpu_number: 0, gpu_type: '' });
                  }
                }
              }}
          >
            <Typography.Text type="secondary">这些机器参数用于上限控制，请谨慎填写（系统会在创建容器时校验上限）。</Typography.Text>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_name" label="机器名" rules={[{ required: true, message: '请输入机器名' }, { max: 115, message: '机器名长度不得超过115个字符' }]}> 
                  <Input placeholder="机器名" maxLength={115} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item name="machine_ip" label="IP 地址" rules={[{ required: true, message: '请输入 IP 地址' }]}>
                  <Input placeholder="192.168.x.x" />
                </Form.Item>
              </Col>
            </Row>

            

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_type" label="机器类型" initialValue="CPU">
                  <Radio.Group
                    options={[
                      { label: 'CPU', value: 'CPU' },
                      { label: 'GPU', value: 'GPU' }
                    ]}
                    optionType="button"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="maintenance_mode" label="运行模式" initialValue="normal">
                  <Radio.Group
                    disabled={!isEditMode}
                    optionType="button"
                    buttonStyle="solid"
                    options={[
                      { label: '正常', value: 'normal' },
                      { label: '维护', value: 'maintenance' },
                    ]}
                  />
                </Form.Item>
              </Col>
            </Row>

            

            <Row gutter={16} align="middle">
              <Col xs={24} sm={18} md={18} lg={18} xl={18}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const cpuMax = addHostForm.getFieldValue('cpu_core_number') || 1;
                    const val = addHostForm.getFieldValue('max_cpu_core_number') || 0;
                    return (
                          <Form.Item name="max_cpu_core_number" label={`CPU 最大允许分配（整数，单位：核）`}>
                            <>
                              <div onTouchStart={stopEventPropagation} onTouchMove={stopEventPropagation} onTouchEnd={stopEventPropagation} onPointerDown={stopEventPropagation} onPointerMove={stopEventPropagation}>
                                <div style={{ minHeight: 22, marginBottom: 8 }}>
                                  {(cpuMax > 0 && val > Math.floor(cpuMax * 0.8)) ? (
                                    <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统</Typography.Text>
                                  ) : (
                                    <span style={{ visibility: 'hidden' }}>占位</span>
                                  )}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                                  <Slider
                                    min={0}
                                    max={Math.max(1, cpuMax)}
                                    step={1}
                                    value={typeof val === 'number' ? val : 0}
                                    onChange={(v) => addHostForm.setFieldsValue({ max_cpu_core_number: v })}
                                    style={{ flex: 1, minWidth: 0 }}
                                  />
                                  <div style={{ minWidth: 56, textAlign: 'right', fontWeight: 600 }}>{typeof val === 'number' ? `${val} 核` : '0 核'}</div>
                                </div>
                              </div>
                            </>
                          </Form.Item>
                        );
                  }}
                </Form.Item>
              </Col>
                  <Col xs={24} sm={6} md={6} lg={6} xl={6}>
                    <Form.Item name="cpu_core_number" label="CPU 核心数">
                      <InputNumber min={1} style={{ width: '100%', maxWidth: 110 }} />
                    </Form.Item>
                  </Col>
                </Row>
            <Form.Item shouldUpdate noStyle>
              {() => {
                const mt = addHostForm.getFieldValue('machine_type');
                const gpuMax = addHostForm.getFieldValue('gpu_number') || 0;
                const val = addHostForm.getFieldValue('max_gpu_number') || 0;
                if (mt === 'GPU' && gpuMax > 0 && val > Math.floor(gpuMax * 0.8)) {
                  return <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统</Typography.Text>;
                }
                return null;
              }}
            </Form.Item>

            <Row gutter={16} align="middle">
              <Col xs={24} sm={18} md={18} lg={18} xl={18}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const memMax = addHostForm.getFieldValue('memory_size') || 1;
                    const val = addHostForm.getFieldValue('max_memory_gb') || 0;
                    return (
                      <Form.Item name="max_memory_gb" label={`内存 最大允许分配（GB，整数）`}>
                        <>
                          <div onTouchStart={stopEventPropagation} onTouchMove={stopEventPropagation} onTouchEnd={stopEventPropagation} onPointerDown={stopEventPropagation} onPointerMove={stopEventPropagation}>
                            <div style={{ minHeight: 22, marginBottom: 8 }}>
                              {(memMax > 0 && val > Math.floor(memMax * 0.8)) ? (
                                <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统</Typography.Text>
                              ) : (
                                <span style={{ visibility: 'hidden' }}>占位</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                              <Slider
                                min={0}
                                max={Math.max(1, memMax)}
                                step={1}
                                value={typeof val === 'number' ? val : 0}
                                onChange={(v) => addHostForm.setFieldsValue({ max_memory_gb: v })}
                                style={{ flex: 1, minWidth: 0 }}
                              />
                              <div style={{ minWidth: 56, textAlign: 'right', fontWeight: 600 }}>{typeof val === 'number' ? `${val} GB` : '0 GB'}</div>
                            </div>
                          </div>
                        </>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col xs={24} sm={6} md={6} lg={6} xl={6}>
                <Form.Item name="memory_size" label="内存 (GB)">
                  <InputNumber min={1} style={{ width: '100%', maxWidth: 110 }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16} align="middle">
              <Col xs={24} sm={18} md={18} lg={18} xl={18}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const mt = addHostForm.getFieldValue('machine_type');
                    const gpuMax = addHostForm.getFieldValue('gpu_number') || 0;
                    const val = addHostForm.getFieldValue('max_gpu_number') || 0;
                    return (
                      <Form.Item name="max_gpu_number" label={`GPU 最大允许分配（整数）`}>
                        <>
                          <div onTouchStart={stopEventPropagation} onTouchMove={stopEventPropagation} onTouchEnd={stopEventPropagation} onPointerDown={stopEventPropagation} onPointerMove={stopEventPropagation}>
                            <div style={{ minHeight: 22, marginBottom: 8 }}>
                              {(mt === 'GPU' && gpuMax > 0 && val > Math.floor(gpuMax * 0.8)) ? (
                                <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统</Typography.Text>
                              ) : (
                                <span style={{ visibility: 'hidden' }}>占位</span>
                              )}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                              <Slider
                                min={0}
                                max={Math.max(0, gpuMax)}
                                step={1}
                                value={typeof val === 'number' ? val : 0}
                                onChange={(v) => addHostForm.setFieldsValue({ max_gpu_number: v })}
                                disabled={mt !== 'GPU'}
                                style={{ flex: 1, minWidth: 0 }}
                              />
                              <div style={{ minWidth: 56, textAlign: 'right', fontWeight: 600 }}>{typeof val === 'number' ? `${val}` : '0'}</div>
                            </div>
                          </div>
                        </>
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
              <Col xs={24} sm={6} md={6} lg={6} xl={6}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const mt = addHostForm.getFieldValue('machine_type');
                    return (
                      <Form.Item name="gpu_number" label="GPU 数量">
                        <InputNumber min={0} style={{ width: '100%', maxWidth: 110 }} disabled={mt !== 'GPU'} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>
            <Row>
              <Col span={24}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const mt = addHostForm.getFieldValue('machine_type');
                        const gnum = addHostForm.getFieldValue('gpu_number');
                        if (mt === 'GPU' || (typeof gnum === 'number' && gnum > 0)) {
                      return (
                        <Row gutter={16}>
                          <Col xs={24} sm={12} md={12} lg={12} xl={12}>
                            <Form.Item name="gpu_type" label="GPU 型号">
                              <Input placeholder="例如：NVIDIA Tesla V100" maxLength={115} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} sm={12} md={12} lg={12} xl={12} />
                        </Row>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="disk_size" label="磁盘 (GB)">
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
            </Row>

              <Row gutter={16} align="middle">
                <Col xs={24} sm={18} md={18} lg={18} xl={18}>
                  <Form.Item shouldUpdate noStyle>
                    {() => {
                      const base = addHostForm.getFieldValue('memory_size') || 1;
                      const val = addHostForm.getFieldValue('max_shared_gb') || 0;
                      const maxMemoryField = addHostForm.getFieldValue('max_memory_gb');
                      const sliderMax = (typeof maxMemoryField === 'number' && maxMemoryField > 0) ? Math.max(1, Math.floor(maxMemoryField)) : Math.max(1, Math.floor(base * 2));
                      return (
                        <Form.Item name="max_shared_gb" label={`共享空间 最大允许分配（GB，整数）`}>
                          <>
                            <div onTouchStart={stopEventPropagation} onTouchMove={stopEventPropagation} onTouchEnd={stopEventPropagation} onPointerDown={stopEventPropagation} onPointerMove={stopEventPropagation}>
                              <div style={{ minHeight: 22, marginBottom: 8 }}>
                                {(sliderMax > 0 && val > Math.floor(sliderMax * 0.8)) ? (
                                  <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统</Typography.Text>
                                ) : (
                                  <span style={{ visibility: 'hidden' }}>占位</span>
                                )}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, maxWidth: '100%' }}>
                                <Slider
                                  min={0}
                                  max={sliderMax}
                                  step={1}
                                  value={typeof val === 'number' ? val : 0}
                                  onChange={(v) => addHostForm.setFieldsValue({ max_shared_gb: v })}
                                  style={{ flex: 1, minWidth: 0 }}
                                />
                                <div style={{ minWidth: 56, textAlign: 'right', fontWeight: 600 }}>{typeof val === 'number' ? `${val} GB` : '0 GB'}</div>
                              </div>
                            </div>
                          </>
                        </Form.Item>
                      );
                    }}
                  </Form.Item>
                </Col>
                {/* removed individual shared_size field per API; only slider `max_shared_gb` is used */}
              </Row>

            <Row>
              <Col span={24}>
                <Form.Item name="machine_description" label="描述">
                  <Input.TextArea rows={3} placeholder="可选，机器描述" maxLength={115} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
          )
        }
      />

      {/* 删除宿主机 - 二次确认（敏感行为） */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="确认删除宿主机"
        icon={<DesktopOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
        message={deleteTargetMachine ? (
          <div>
            <div className="mm-delete-headline">你即将删除的是：<span className="mm-delete-headline-type">机器</span></div>
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
                  <Typography.Text type="secondary">鐘舵€侊細</Typography.Text>
                  <Typography.Text className="mm-ml-8">{(deleteTargetMachine.machine_status || '').toLowerCase()}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" className="mm-danger-text">
                此操作不可恢复！此操作将移除该机器及其所有容器。              </Typography.Text>
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
      <ConfirmModal
        visible={containerDeleteConfirmVisible}
        title="确认删除容器"
        icon={<ContainerOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
        message={deleteTargetContainer ? (
          <div>
            <div className="mm-delete-headline">你即将删除的是：<span className="mm-delete-headline-type">容器</span></div>
            <div className="mm-delete-name">名称：{deleteTargetContainer.container_name || deleteTargetContainer.key}</div>
          </div>
        ) : '确认删除该容器？'}
        content={
          deleteTargetContainer ? (
            <div className="mm-danger-box">
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Typography.Text type="secondary">容器ID：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetContainer.key || deleteTargetContainer.container_id}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">容器名：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetContainer.container_name}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">所属机器：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{deleteTargetContainer.machine_id || deleteTargetContainer.machine_ip}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" className="mm-danger-text">
                此操作不可恢复！此操作将永久删除该容器。              </Typography.Text>
            </div>
          ) : null
        }
        danger
        iconColor="#ff4d4f"
        onConfirm={handleDeleteContainerConfirm}
        onCancel={() => { setContainerDeleteConfirmVisible(false); setDeleteTargetContainer(null); setDetailModalVisible(true); }}
        loading={containerDeleteLoading}
        confirmText="删除"
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
                    <Typography.Text type="secondary">宸查€?{permissionUsersSelected.length} 浜</Typography.Text>
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

      <ConfirmModal
        visible={addContainerVisible}
        title="添加容器"
        message="请填写容器信息并确认添加"
        onConfirm={handleAddContainerConfirm}
        onCancel={() => { setAddContainerVisible(false); setAddContainerMachineId(null); setAddContainerFieldErrors({}); }}
        loading={addContainerLoading}
        confirmText="添加"
        confirmDisabled={addContainerUnsafe}
        content={
          <Form
            form={addContainerForm}
            layout="vertical"
            initialValues={{ CPU_NUMBER: 1, MEMORY: 1, SHARED_MEM: 0, GPU_LIST: [], gpu_number: 0 }}
            onValuesChange={(_changed, allVals) => {
              try {
                const vals = allVals || addContainerForm.getFieldsValue();
                const name = vals.NAME || '';
                const image = vals.image || '';
                const pub = vals.public_key || '';
                import('../utils/validateCmdArg').then(mod => {
                  setAddContainerUnsafe(Boolean(mod.anyUnsafe(name, image, pub)));
                }).catch(() => setAddContainerUnsafe(false));

                const errs = {};
                const m = addContainerMachine || {};
                const cpu = Number(vals.CPU_NUMBER || 0);
                const mem = Number(vals.MEMORY || 0);
                const shared = Number(vals.SHARED_MEM || 0);
                const gnum = Number(vals.gpu_number || 0);
                const maxCpu = m.max_cpu_core_number ?? m.cpu_core_number ?? null;
                const maxMem = m.max_memory_gb ?? m.memory_size_gb ?? null;
                const maxShared = m.max_shared_gb ?? m.max_shared_gb ?? null;
                const maxGpu = m.max_gpu_number ?? m.gpu_number ?? null;
                if (maxCpu != null && cpu > Number(maxCpu)) errs.CPU_NUMBER = `超出最大 CPU (${maxCpu})`;
                if (maxMem != null && mem > Number(maxMem)) errs.MEMORY = `超出最大内存 (${maxMem} GB)`;
                // shared should also not exceed requested memory
                if (maxShared != null && shared > Number(maxShared)) errs.SHARED_MEM = `超出最大共享空间 (${maxShared} GB)`;
                if (shared > mem) errs.SHARED_MEM = `共享空间不得大于内存 (${mem} GB)`;
                if ((addContainerMachineType || '').toUpperCase() === 'GPU' && maxGpu != null && gnum > Number(maxGpu)) errs.gpu_number = `超出最大 GPU (${maxGpu})`;
                setAddContainerFieldErrors(errs);
              } catch (e) {
                setAddContainerUnsafe(false);
                setAddContainerFieldErrors({});
              }
            }}
          >
            <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item name="NAME" label="容器名" rules={[{ required: true, message: '请输入容器名' }, { max: 115, message: '容器名长度不得超过115个字符' }, { validator: (_, value) => {
                      try { const mod = require('../utils/validateCmdArg'); return mod.isValidName(value) ? Promise.resolve() : Promise.reject(new Error('容器名仅允许英文、数字和下划线')); } catch (e) { return Promise.resolve(); }
                    } }]}>
                      <Input placeholder="容器名" maxLength={115} />
                    </Form.Item>
                  </Col>
              <Col span={12}>
                <Form.Item name="image" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }]}>
                  <Select placeholder="选择镜像" defaultValue="ubuntu:24.04" style={{ width: '100%' }}>
                    <Select.Option value="ubuntu:24.04">ubuntu:24.04</Select.Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Typography.Text type="secondary">请注意：下面的资源参数用于校验并限制容器申请，请不要超过宿主机的算力/内存/共享空间上限。</Typography.Text>
            <br />
            <br />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="CPU_NUMBER"
                  label={<span>CPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限 {addContainerMachine?.max_cpu_core_number ?? addContainerMachine?.cpu_core_number ?? '-'})</span></span>}
                  validateStatus={addContainerFieldErrors.CPU_NUMBER ? 'error' : undefined}
                  help={addContainerFieldErrors.CPU_NUMBER || null}
                >
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="MEMORY"
                  label={<span>内存 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限 {addContainerMachine?.max_memory_gb ?? addContainerMachine?.memory_size_gb ?? '-'})</span></span>}
                  validateStatus={addContainerFieldErrors.MEMORY ? 'error' : undefined}
                  help={addContainerFieldErrors.MEMORY || null}
                >
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
            </Row>

            {/* GPU count: shown only when the selected machine is a GPU machine */}
            {addContainerMachineType === 'GPU' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="gpu_number"
                    label={<span>请求 GPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限 {addContainerMachine?.max_gpu_number ?? addContainerMachine?.gpu_number ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.gpu_number ? 'error' : undefined}
                    help={addContainerFieldErrors.gpu_number || null}
                  >
                    <InputNumber min={0} className="mm-width-100" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="SHARED_MEM"
                    label={<span>共享空间 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限 {addContainerMachine?.max_shared_gb ?? addContainerMachine?.max_shared_gb ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.SHARED_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SHARED_MEM || null}
                  >
                    <InputNumber min={0} className="mm-width-100" />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {addContainerMachineType !== 'GPU' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="SHARED_MEM"
                    label={<span>共享空间 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限 {addContainerMachine?.max_shared_gb ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.SHARED_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SHARED_MEM || null}
                  >
                    <InputNumber min={0} className="mm-width-100" />
                  </Form.Item>
                </Col>
                <Col span={12} />
              </Row>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="root_user" label="Root 用户" rules={[{ required: true, message: '请选择Root用户' }]}>
                  <Select
                    placeholder="选择Root用户"
                    loading={usersLoading}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}
                  >
                    {(usersList || []).map(u => (
                      <Option key={u.id} value={u.username}>
                        <span>{u.name} (@{u.username})</span>
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="machine_id" label="宿主机ID">
                  <Input disabled value={addContainerMachineId || ''} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="public_key" label="公钥（可选）" rules={[{ max: 495, message: '公钥长度不得超过495个字符' }]}> 
                  <Input.TextArea rows={2} placeholder="可选，用于容器访问的公钥" maxLength={495} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        }
      />

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
