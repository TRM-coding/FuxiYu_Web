import React, { useState, useEffect, useRef } from 'react';
import { listAllMachineBrefInformation, getDetailInformation, addMachine, removeMachine, updateMachine, addMachinePermission, listMachinePermissions } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, addCollaborator, removeCollaborator, updateRole, createContainer, deleteContainer, startContainer, stopContainer, restartContainer } from '../api/container_api';
import { SearchOutlined, DownOutlined, UpOutlined, ReloadOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, SettingOutlined, GlobalOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined, SafetyCertificateOutlined, LoadingOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Space, Table, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm, InputNumber, Radio, Pagination, Slider } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import TableComponent from '../components/TableComponent';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';
import ContainerDetailModal from '../components/ContainerDetailModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation, listAllUserBrefInformation } from '../api/user_api';
import { isAbortError } from '../utils/requestManager';
import { useNavigate } from 'react-router-dom';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
const { Column } = Table;
const { Option } = Select;

import { startContainerStatusHeartbeat, startMachineStatusHeartbeat } from '../utils/heartbeat';


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

const ManageMachine = () => {
  // 机器搜索状态
  const [searchName, setSearchName] = useState('');
  const [searchIP, setSearchIP] = useState('');
  const [searchContainerName, setSearchContainerName] = useState('');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
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
  // cache machine's container names for top-level search: { [machineId]: string[] }
  const [machineContainerNamesMap, setMachineContainerNamesMap] = useState({});
  // top-level container-name search loading
  const [containerSearchLoading, setContainerSearchLoading] = useState(false);
  const containerSearchTimerRef = useRef(null);

  const stopEventPropagation = (e) => {
    try {
      if (e && typeof e.stopPropagation === 'function') e.stopPropagation();
    } catch (err) {
      // ignore
    }
  };

  const performMachineContainerSearch = async (keyword) => {
    const k = (keyword || '').trim().toLowerCase();
    if (!k) return;
    // cancel any pending timer
    if (containerSearchTimerRef.current) {
      clearTimeout(containerSearchTimerRef.current);
      containerSearchTimerRef.current = null;
    }
    setContainerSearchLoading(true);
    try {
      const pageSize = 1000;
      const res = await listAllContainerBrefInformation({ machine_id: '', page_number: 0, page_size: pageSize });
      const items = (res && (res.containers_info || res.containers)) || [];
      const map = {};
      for (const c of items) {
        const name = String(c.container_name || c.name || '').toLowerCase();
        if (!name) continue;
        if (!name.includes(k)) continue;
        const mid = String(c.machine_id || c.machine || c.machine_id || '');
        if (!mid) continue;
        map[mid] = map[mid] || [];
        map[mid].push(name);
      }
      const updates = {};
      machines.forEach(m => {
        const midKey = String(m.key);
        updates[midKey] = map[midKey] || [];
      });
      setMachineContainerNamesMap(prev => ({ ...prev, ...updates }));
    } catch (e) {
      console.warn('container name global search failed', e);
    } finally {
      setContainerSearchLoading(false);
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
  const [permissionUsersSelected, setPermissionUsersSelected] = useState(null);
  const [permissionUsersLoadingMore, setPermissionUsersLoadingMore] = useState(false);
  const [permissionAssignedUserIds, setPermissionAssignedUserIds] = useState([]);
  const navigate = useNavigate();
  const { barRef: searchBarRef, barStyle: searchBarStyle } = useAutoHideTopBar();

  // auth + permission check: ensure logged in and operator permission
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
          // 401: clear auth and navigate to login
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
          // 403: do NOT clear auth; only navigate to /index
          handleAuthError(403, navigate);
          return;
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
        // 401: clear auth and navigate to login
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndPerm();
  }, [navigate]);

  // 弹窗状态
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
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
        max_swap_gb: null,
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
        const res = await listAllUserBrefInformation({ page_number: 0, page_size: 500 });
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

  // 基础过滤（不含容器名）
  const baseFilteredMachineData = machines.filter(machine => {
    const matchName = (machine.machine_name || '').toLowerCase().includes(searchName.toLowerCase());
    const matchIP = (machine.machine_ip || '').includes(searchIP);
    return matchName && matchIP;
  });


  const fetchContainersForMachine = async (machineId, pageNumber = 0) => {
    // avoid duplicate fetch
    if (!machineId) return;
    const mid = String(machineId);
    // if same page already loaded, skip
    //if (containerMap[mid]?.loading || (containerMap[mid]?.data && containerMap[mid]?.page === pageNumber)) return;
    // mark loading
    setContainerMap(prev => ({ ...prev, [mid]: { ...(prev[mid] || {}), loading: true, data: [], page: pageNumber, total_page: prev[mid]?.total_page || 1 } }));
    try {
      const pageSize = 5;
      const res = await listAllContainerBrefInformation({ machine_id: mid, page_number: pageNumber, page_size: pageSize });
      const items = (res && (res.containers_info || res.containers)) || [];
      const total_page = (res && (res.total_page || res.totalPages || res.total_pages)) || 1;
      const mapped = items.map((c, idx) => ({
        key: c.container_id ? String(c.container_id) : `${mid}-${pageNumber}-${idx}`,
        container_name: c.container_name || c.name || `container-${idx}`,
        container_image: c.container_image || '',
        port: c.port ? String(c.port) : (c.port_str || ''),
        container_status: (c.container_status || '').toLowerCase(),
        machine_id: mid,
        machine_ip: c.machine_ip || '',
        owners: c.owners || [],
        accounts: c.accounts || []
      }));
      setContainerMap(prev => ({ ...prev, [mid]: { loading: false, data: mapped, page: pageNumber, total_page: total_page, page_size: pageSize } }));
    } catch (err) {
      console.error('fetchContainersForMachine failed', machineId, err);
      // fallback: keep loading false but no data so UI will use local mock
      setContainerMap(prev => ({ ...prev, [mid]: { loading: false, data: [], page: pageNumber, total_page: 1 } }));
    }
  };

  // 顶部“容器名”搜索：按机器维度缓存容器名
  useEffect(() => {
    const keyword = (searchContainerName || '').trim().toLowerCase();
    if (!keyword) {
      // clear previous per-machine matches when search cleared
      return;
    }

    let cancelled = false;
    // debounce via ref timer
    if (containerSearchTimerRef.current) clearTimeout(containerSearchTimerRef.current);
    containerSearchTimerRef.current = setTimeout(() => {
      performMachineContainerSearch(keyword);
      containerSearchTimerRef.current = null;
    }, 300);

    return () => {
      cancelled = true;
      if (containerSearchTimerRef.current) {
        clearTimeout(containerSearchTimerRef.current);
        containerSearchTimerRef.current = null;
      }
    };
  }, [searchContainerName, machines]);

  // 最终过滤（含容器名）
  const filteredMachineData = baseFilteredMachineData.filter(machine => {
    const keyword = (searchContainerName || '').trim().toLowerCase();
    if (!keyword) return true;
    const names = machineContainerNamesMap[String(machine.key)] || [];
    return names.some(n => n.includes(keyword));
  });

  // 机器状态标签
  const renderStatusTag = (status, record) => {
    const mid = String(record?.machine_id || record?.key || '');
    if (mid && machineStatusLoadingMap[mid]) {
      return <Tag color="processing">处理中</Tag>;
    }
    const color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : 'orange';
    return <Tag color={color}>{status === 'online' ? '运行中' : status === 'offline' ? '已停止' : '维护中'}</Tag>;
  };

  // 容器状态标签
  const renderContainerStatus = (status) => {
    const color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : status === 'creating' ? 'blue' : status === 'starting' ? 'cyan' : status === 'stopping' ? 'orange' : status === 'failed' ? 'red' : 'default';
    return <Tag color={color}>{status === 'online' ? '运行中' : status === 'offline' ? '已停止' : status === 'creating' ? '创建中' : status === 'starting' ? '启动中' : status === 'stopping' ? '停止中' : status === 'failed' ? '异常' : status}</Tag>;
  };

  // 切换展开状态并关联选中态
  const toggleExpand = (machineId) => {
    setExpandedRowKeys(prev => {
      const mid = machineId;
      const exists = prev.includes(mid);
      if (exists) {
        // collapse: remove from expanded list
        // if collapsing the selected row, clear selection
        setSelectedRowKey(prevSel => (String(prevSel) === String(mid) ? null : prevSel));
        return prev.filter(key => key !== mid);
      } else {
        // expand: add and mark as selected
        setSelectedRowKey(String(mid));
        return [...prev, mid];
      }
    });
  };

  // When rows expand, fetch containers for those machines.
  useEffect(() => {
    if (!expandedRowKeys || expandedRowKeys.length === 0) return;
    expandedRowKeys.forEach(mid => {
      if (mid) fetchContainersForMachine(String(mid), 0);
    });
  }, [expandedRowKeys]);

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
        swap_gb: detail.swap_gb ?? container.swap_gb ?? 0,
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
      setPermissionUsersSelected(null);
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
    if (!permissionMachine || !permissionUsersSelected) return;
    setPermissionModalSubmitting(true);
    try {
      await addMachinePermission({ machine_id: Number(permissionMachine.machine_id || permissionMachine.key), user_id: Number(permissionUsersSelected) });
      if (!permissionAssignedUserIds.includes(Number(permissionUsersSelected))) {
        setPermissionAssignedUserIds(prev => [...prev, Number(permissionUsersSelected)]);
      }
      message.success('机器权限已添加');
      setPermissionUsersSelected(null);
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
    addHostForm.setFieldsValue({ machine_status: 'maintenance', machine_type: 'CPU', gpu_number: 0, max_swap_gb: 0 });
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
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 1, SWAP_MEM: 0, GPU_LIST: [], gpu_number: 0, root_user: defaultUser });
    setAddContainerVisible(true);
  };

  // 添加容器确认
  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
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
            swap_memory: values.SWAP_MEM || 0
          },
          public_key: values.public_key || ''
        };
      let success = false;
      try {
        const res = await createContainer(payload);
        // refresh container list for the machine and ensure row expanded
        if (machineId) {
          const mid = String(machineId);
          setExpandedRowKeys(prev => (prev.includes(mid) ? prev : [...prev, mid]));
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
        cpu_core_number: src.cpu_core_number ?? machine.cpu_core_number ?? null,
        gpu_number: src.gpu_number ?? machine.gpu_number ?? 0,
        gpu_type: src.gpu_type || machine.gpu_type || '',
        memory_size: src.memory_size_gb ?? machine.memory_size_gb ?? null,
        max_memory_gb: src.max_memory_gb ?? machine.max_memory_gb ?? 0,
        max_gpu_number: src.max_gpu_number ?? machine.max_gpu_number ?? 0,
        max_cpu_core_number: src.max_cpu_core_number ?? machine.max_cpu_core_number ?? 0,
        max_swap_gb: src.max_swap_gb ?? machine.max_swap_gb ?? null,
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
        // send status as lowercase
        machine_status: (values.machine_status || 'online').toLowerCase(),
        machine_description: values.machine_description || '',
        cpu_core_number: values.cpu_core_number || null,
        gpu_number: values.gpu_number || 0,
        gpu_type: values.gpu_type || null,
        memory_size: values.memory_size || null,
        max_memory_gb: values.max_memory_gb || 0,
        max_gpu_number: values.max_gpu_number || 0,
        max_cpu_core_number: values.max_cpu_core_number || 0,
        max_swap_gb: values.max_swap_gb || null,
        disk_size: values.disk_size || null,
      };

      if (isEditMode && editTargetMachine) {
        // 编辑模式 -> 调用更新接口
        let success = false;
        try {
          const mid = editTargetMachine.machine_id || editTargetMachine.key;
          await updateMachine(mid, payload);
          const oldStatus = String(editTargetMachine.machine_status || '').toLowerCase();
          const requestedStatus = String(values.machine_status || editTargetMachine.machine_status || 'online').toLowerCase();
          const isOnlineToMaintenance = oldStatus === 'online' && requestedStatus === 'maintenance';
          const updatedMachine = {
            ...editTargetMachine,
            machine_name: payload.machine_name,
            machine_ip: payload.machine_ip,
            machine_type: (payload.machine_type || '').toUpperCase(),
            // ONLINE -> MAINTENANCE is async on Ctrl; keep current UI status until heartbeat confirms terminal status.
            machine_status: isOnlineToMaintenance ? oldStatus : requestedStatus,
            cpu_core_number: payload.cpu_core_number,
            memory_size_gb: payload.memory_size,
            max_memory_gb: payload.max_memory_gb,
            max_gpu_number: payload.max_gpu_number,
            max_cpu_core_number: payload.max_cpu_core_number,
            max_swap_gb: payload.max_swap_gb,
            gpu_number: payload.gpu_number,
            gpu_type: payload.gpu_type,
            disk_size_gb: payload.disk_size,
            machine_description: payload.machine_description || ''
          };
          setMachines(prev => prev.map(m => (m.key === editTargetMachine.key ? updatedMachine : m)));
          // ONLINE -> MAINTENANCE transition is handled by Ctrl; web only starts machine-status heartbeat.
          try {
            if (isOnlineToMaintenance) {
              const midStr = String(mid);
              setMachineStatusLoadingMap(prev => ({ ...prev, [midStr]: true }));
              // safety timeout: clear loading even if heartbeat times out silently
              setTimeout(() => {
                setMachineStatusLoadingMap(prev => {
                  if (!prev[midStr]) return prev;
                  const copy = { ...prev };
                  delete copy[midStr];
                  return copy;
                });
              }, 250000);
              startMachineStatusHeartbeat({
                machine_id: mid,
                terminalState: 'maintenance',
                onTerminal: async (m) => {
                  try {
                    const finalStatus = String(m?.machine_status || 'maintenance').toLowerCase();
                    setMachineStatusLoadingMap(prev => {
                      const copy = { ...prev };
                      delete copy[String(mid)];
                      return copy;
                    });
                    setMachines(prev => prev.map(item => (
                      String(item.machine_id || item.key) === String(mid)
                        ? { ...item, machine_status: finalStatus }
                        : item
                    )));
                    // also refresh this machine's containers after transition converges
                    await fetchContainersForMachine(String(mid), 0);
                  } catch (e) {
                    // ignore
                  }
                }
              });
            }
          } catch (e) {
            // ignore heartbeat start errors
          }
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
        // 添加模式
        let success = false;
        try {
          const res = await addMachine(payload);
          // after successful add, reload the machine list from backend to avoid showing a mocked id
          const refreshed = await fetchMachinesFromApi();
          setMachines(refreshed);
          message.success('宿主机已添加');
          success = true;
        } catch (err) {
          console.error('addMachine failed', err);
          const status = err?.response?.status || err?.status;
          await showErrorModal({ message: err?.body || err || '添加宿主机失败，请重试', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
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

  // 关闭所有弹窗
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
          copy[mid] = { ...copy[mid], data: copy[mid].data.map(c => (String(c.key) === String(cid) ? { ...c, container_status: 'starting' } : c)) };
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


  // 展开行的配置
  const expandable = {
    expandedRowKeys,
    onExpandedRowsChange: (expandedKeys) => {
      setExpandedRowKeys(expandedKeys);
    },
    expandedRowRender: (record) => {
      const mid = String(record.key);
      const entry = containerMap[mid] || {};
      const containers = entry.data || [];

      return (
        <div className={`mm-expand-container ${String(record.key) === String(selectedRowKey) ? 'mm-expanded-selected' : ''}`}>
          <Row gutter={[16, 16]} className="mm-row-bottom">
            <Col flex="auto">
              <Input
                placeholder={`在 ${record.machine_name} 中搜索容器`}
                value={containerSearch[record.key] || ''}
                onChange={(e) => handleContainerSearch(record.key, e.target.value)}
                allowClear
                prefix={<SearchOutlined />}
              />
            </Col>
            <Col>
              <Button type="primary" icon={<SearchOutlined />}>搜索</Button>
            </Col>
          </Row>
          <Typography.Title level={5} className="mm-typography-title">
            <span>容器列表 - {record.machine_name}</span>
            <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => openAddContainerModal(record)} className="mm-btn-ml">
              添加
            </Button>
            <Button size="small" icon={<ReloadOutlined />} onClick={() => fetchContainersForMachine(record.key)} className="mm-btn-ml" />
          </Typography.Title>
          <TableComponent
            dataSource={containers}
            rowKey="key"
            pagination={containers.length > 5 ? { pageSize: entry.page_size || 5 } : false}
            bordered
            size="middle"
            loading={entry.loading || false}
          >
            <Column title="容器ID" dataIndex="key" key="key" />
            <Column title="容器名" dataIndex="container_name" key="container_name" />
            <Column title="端口" dataIndex="port" key="port" />
            <Column 
              title="状态" 
              dataIndex="container_status" 
              key="container_status" 
              render={renderContainerStatus} 
            />
            <Column
              title="操作"
              key="action"
              render={(_, containerRecord) => {
                const status = (containerRecord?.container_status || '').toLowerCase();
                const startDisabled = status !== 'offline';
                const restartDisabled = status !== 'online';
                const stopDisabled = status !== 'online';
                return (
                  <Space size="middle">
                    <Button type="primary" size="small" onClick={() => handleStartContainer(containerRecord)} disabled={startDisabled}>启动</Button>
                    <Button danger size="small" onClick={() => handleStopContainer(containerRecord)} disabled={stopDisabled}>停止</Button>
                    <Button size="small" onClick={() => handleRestartContainer(containerRecord)} disabled={restartDisabled}>重启</Button>
                    <Button 
                      size="small" 
                      type="primary"
                      ghost
                      onClick={() => openContainerDetail(containerRecord)}
                    >
                      详情
                    </Button>
                  </Space>
                );
              }}
            />
          </TableComponent>
          {/* 内侧列表的分页 */}
          {(() => {
            const mid = String(record.key);
            const entry = containerMap[mid];
            const pages = entry?.total_page || 0;
            if (pages > 1) {
              return (
                  <div className="mm-pagination-wrapper">
                  <Pagination
                    current={(entry?.page || 0) + 1}
                    total={pages * (entry?.page_size || 5)}
                    pageSize={entry?.page_size || 5}
                    onChange={(p) => fetchContainersForMachine(record.key, p - 1)}
                    size="small"
                  />
                </div>
              );
            }
            return null;
          })()}
        </div>
      );
    },
    expandIcon: () => null // 隐藏默认的展开图标，使用自定义按钮
  };

  return (
    <>
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
              <Button type="primary" icon={<SearchOutlined />} loading={containerSearchLoading} onClick={() => performMachineContainerSearch(searchContainerName)}>
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

        {/* 2. 下方区域：机器表格 */}
        <div className="mm-table-padding">
          <TableComponent
            dataSource={filteredMachineData}
            rowKey="key"
            pagination={{ pageSize: 5 }}
            loading={machinesLoading}
            bordered
            scroll={{ x: true }}
            rowClassName={(record) => String(record.key) === String(selectedRowKey) ? 'mm-selected-row' : ''}
            onRow={(record) => ({ onClick: () => setSelectedRowKey(record.key) })}
            expandable={expandable}
          >
            <Column title="机器ID" dataIndex="key" key="key" />
            <Column title="机器名" dataIndex="machine_name" key="machine_name" />
            <Column title="机器IP" dataIndex="machine_ip" key="machine_ip" />
            <Column title="机器类型" dataIndex="machine_type" key="machine_type" />
            <Column
              title="机器状态"
              dataIndex="machine_status"
              key="machine_status"
              render={(status, record) => renderStatusTag(status, record)}
            />
            <Column
              title="CPU核心数"
              dataIndex="cpu_core_number"
              key="cpu_core_number"
              render={(num, record) => {
                const cur = (num === null || num === undefined) ? '-' : String(num);
                const max = (record?.max_cpu_core_number === null || record?.max_cpu_core_number === undefined) ? '-' : String(record.max_cpu_core_number);
                const ratio = (Number(num) && Number(record?.max_cpu_core_number)) ? (Number(num) / Number(record.max_cpu_core_number)) : 0;
                const warn = ratio > 0.8;
                return (
                  <span style={{ display: 'flex', flexDirection: 'column'}}>
                    <span>{cur}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 13, color: warn ? '#ff4d4f' : undefined }}>(限: {max})</Typography.Text>
                  </span>
                );
              }}
            />
            <Column
              title="内存(GB)"
              dataIndex="memory_size_gb"
              key="memory_size_gb"
              render={(num, record) => {
                const cur = (num === null || num === undefined) ? '-' : String(num);
                const max = (record?.max_memory_gb === null || record?.max_memory_gb === undefined) ? '-' : String(record.max_memory_gb);
                const ratio = (Number(num) && Number(record?.max_memory_gb)) ? (Number(num) / Number(record.max_memory_gb)) : 0;
                const warn = ratio > 0.8;
                return (
                  <span style={{ display: 'flex', flexDirection: 'column'}}>
                    <span>{cur}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 13, color: warn ? '#ff4d4f' : undefined }}>(限: {max})</Typography.Text>
                  </span>
                );
              }}
            />
            <Column title="最大Swap(GB)" dataIndex="max_swap_gb" key="max_swap_gb" />
            <Column
              title="GPU数量"
              dataIndex="gpu_number"
              key="gpu_number"
              render={(num, record) => {
                const cur = (num === null || num === undefined) ? '-' : String(num);
                const max = (record?.max_gpu_number === null || record?.max_gpu_number === undefined) ? '-' : String(record.max_gpu_number);
                const ratio = (Number(num) && Number(record?.max_gpu_number)) ? (Number(num) / Number(record.max_gpu_number)) : 0;
                const warn = ratio > 0.8;
                return (
                  <span style={{ display: 'flex', flexDirection: 'column'}}>
                    <span>{cur}</span>
                    <Typography.Text type="secondary" style={{ fontSize: 13, color: warn ? '#ff4d4f' : undefined }}>(限: {max})</Typography.Text>
                  </span>
                );
              }}
            />
            <Column title="GPU型号" dataIndex="gpu_type" key="gpu_type" />
            <Column title="磁盘(GB)" dataIndex="disk_size_gb" key="disk_size_gb" />
            <Column
              title="机器描述"
              dataIndex="machine_description"
              key="machine_description"
              ellipsis
            />
            <Column
              title="操作"
              key="action"
              render={(_, record) => {
                const isExpanded = expandedRowKeys.includes(record.key);
                return (
                  <Space size="small">
                    <Button
                      type="text"
                      icon={isExpanded ? <UpOutlined /> : <DownOutlined />}
                      onClick={() => toggleExpand(record.key)}
                      className="mm-btn-text-blue"
                    >
                      {isExpanded ? '收起容器' : '查看容器'}
                    </Button>
                    <Button onClick={() => openPermissionModal(record)} icon={<SafetyCertificateOutlined />}>权限</Button>
                    <Button onClick={() => openEditMachine(record)}><a>编辑</a></Button>
                    <Button onClick={() => openDeleteConfirm(record)}><a className="mm-link-danger">删除</a></Button>
                  </Space>
                );
              }}
            />
          </TableComponent>
        </div>
      </div>

      {/* 添加宿主机 确认弹窗（包含表单） */}
      <ConfirmModal
        visible={addHostVisible}
        title={isEditMode ? "编辑宿主机" : "添加宿主机"}
        message={isEditMode ? "请修改宿主机信息并确认更新" : "请填写宿主机信息并确认"}
        onConfirm={handleAddHostConfirm}
        onCancel={() => { setAddHostVisible(false); setIsEditMode(false); setEditTargetMachine(null); }}
        loading={addHostLoading}
        confirmText={isEditMode ? '更新' : '添加'}
        content={
          <Form
            form={addHostForm}
            layout="vertical"
            initialValues={{ machine_type: 'CPU', gpu_number: 0, machine_status: 'maintenance', max_memory_gb: 0, max_gpu_number: 0, max_cpu_core_number: 0 }}
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
                <Form.Item name="machine_ip" label="IP 地址" rules={[{ required: true, message: '请输入IP地址' }]}> 
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

              <Form.Item shouldUpdate={(prevValues, currentValues) => prevValues.machine_status !== currentValues.machine_status} noStyle>
                {() => (
                  <Col span={12}>
                    <Form.Item name="machine_status" label="状态">
                      {
                        // If the loaded machine is offline, lock the field to offline and prevent changing
                        isEditMode && editTargetMachine && String(editTargetMachine.machine_status).toLowerCase() === 'offline' ? (
                          <Select disabled value="offline">
                            <Option value="offline">已停止</Option>
                          </Select>
                        ) : (
                          // Otherwise allow selecting online/maintenance while editing; disabled when not editing
                          <Select disabled={!isEditMode}>
                            <Option value="online">运行中</Option>
                            <Option value="maintenance">维护中</Option>
                          </Select>
                        )
                      }
                    </Form.Item>
                  </Col>
                )}
              </Form.Item>
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
                                    <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统。</Typography.Text>
                                  ) : (
                                    <span style={{ visibility: 'hidden' }}>占位</span>
                                  )}
                                </div>
                                <Slider
                                  min={0}
                                  max={Math.max(1, cpuMax)}
                                  step={1}
                                  value={typeof val === 'number' ? val : 0}
                                  onChange={(v) => addHostForm.setFieldsValue({ max_cpu_core_number: v })}
                                />
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
                  return <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统。</Typography.Text>;
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
                                <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统。</Typography.Text>
                              ) : (
                                <span style={{ visibility: 'hidden' }}>占位</span>
                              )}
                            </div>
                            <Slider
                              min={0}
                              max={Math.max(1, memMax)}
                              step={1}
                              value={typeof val === 'number' ? val : 0}
                              onChange={(v) => addHostForm.setFieldsValue({ max_memory_gb: v })}
                            />
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
                                <Typography.Text style={{ color: '#ff4d4f' }}>过量分配性能是危险的！预留一些性能给控制系统。</Typography.Text>
                              ) : (
                                <span style={{ visibility: 'hidden' }}>占位</span>
                              )}
                            </div>
                            <Slider
                              min={0}
                              max={Math.max(0, gpuMax)}
                              step={1}
                              value={typeof val === 'number' ? val : 0}
                              onChange={(v) => addHostForm.setFieldsValue({ max_gpu_number: v })}
                              disabled={mt !== 'GPU'}
                            />
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

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="max_swap_gb" label="交换空间 (GB)">
                    <InputNumber min={0} className="mm-width-100" />
                  </Form.Item>
                </Col>
                <Col span={12} />
              </Row>

            <Row>
              <Col span={24}>
                <Form.Item name="machine_description" label="描述">
                  <Input.TextArea rows={3} placeholder="可选，机器描述" maxLength={115} />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        }
      />

      {/* 删除宿主机 - 二次确认（敏感行为） */}
      <ConfirmModal
        visible={deleteConfirmVisible}
        title="确认删除宿主机"
        message={deleteTargetMachine ? `请确认以下信息并删除宿主机 ${deleteTargetMachine.machine_name || deleteTargetMachine.key}` : '确认删除该宿主机？'}
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
                此操作不可恢复！此操作将移除该机器及其所有容器。
              </Typography.Text>
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
        message={deleteTargetContainer ? `请确认以下信息并删除容器 ${deleteTargetContainer.container_name || deleteTargetContainer.key}` : '确认删除该容器？'}
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
                此操作不可恢复！此操作将永久删除该容器。
              </Typography.Text>
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
        onDelete={openDeleteContainerConfirm}
        usersList={usersList}
        currentUserName={localStorage.getItem('currentUserName')}
        currentUserId={localStorage.getItem('currentUserId')}
        forceSystemAdmin={true} // 此时currentUserName/id无意义
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
              showSearch
              allowClear
              placeholder="选择用户"
              style={{ minWidth: 360, flex: 1 }}
              value={permissionUsersSelected}
              loading={permissionModalLoading}
              onChange={(value) => setPermissionUsersSelected(value)}
              filterOption={(input, option) => String(option?.label || '').toLowerCase().includes(String(input).toLowerCase())}
              dropdownRender={(menu) => (
                <div>
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
            <Button type="primary" icon={<PlusOutlined />} loading={permissionModalSubmitting} onClick={handleGrantMachinePermission} disabled={!permissionUsersSelected}>添加权限</Button>
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
            initialValues={{ CPU_NUMBER: 1, MEMORY: 1, SWAP_MEM: 0, GPU_LIST: [], gpu_number: 0 }}
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
                const swap = Number(vals.SWAP_MEM || 0);
                const gnum = Number(vals.gpu_number || 0);
                const maxCpu = m.max_cpu_core_number ?? m.cpu_core_number ?? null;
                const maxMem = m.max_memory_gb ?? m.memory_size_gb ?? null;
                const maxSwap = m.max_swap_gb ?? m.max_swap_gb ?? null;
                const maxGpu = m.max_gpu_number ?? m.gpu_number ?? null;
                if (maxCpu != null && cpu > Number(maxCpu)) errs.CPU_NUMBER = `超出最大 CPU (${maxCpu})`;
                if (maxMem != null && mem > Number(maxMem)) errs.MEMORY = `超出最大内存 (${maxMem} GB)`;
                if (maxSwap != null && swap > Number(maxSwap)) errs.SWAP_MEM = `超出最大交换空间 (${maxSwap} GB)`;
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

            <Typography.Text type="secondary">请注意：下面的资源参数用于校验并限制容器申请，请不要超过宿主机的算力/内存/交换空间上限。</Typography.Text>
            <br />
            <br />

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="CPU_NUMBER"
                  label={<span>CPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_cpu_core_number ?? addContainerMachine?.cpu_core_number ?? '-'})</span></span>}
                  validateStatus={addContainerFieldErrors.CPU_NUMBER ? 'error' : undefined}
                  help={addContainerFieldErrors.CPU_NUMBER || null}
                >
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="MEMORY"
                  label={<span>内存 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_memory_gb ?? addContainerMachine?.memory_size_gb ?? '-'})</span></span>}
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
                    label={<span>请求 GPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_gpu_number ?? addContainerMachine?.gpu_number ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.gpu_number ? 'error' : undefined}
                    help={addContainerFieldErrors.gpu_number || null}
                  >
                    <InputNumber min={0} className="mm-width-100" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="SWAP_MEM"
                    label={<span>交换空间 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_swap_gb ?? addContainerMachine?.max_swap_gb ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.SWAP_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SWAP_MEM || null}
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
                    name="SWAP_MEM"
                    label="交换空间 (GB)"
                    validateStatus={addContainerFieldErrors.SWAP_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SWAP_MEM || null}
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
                <Form.Item name="public_key" label="公钥 (可选)" rules={[{ max: 495, message: '公钥长度不得超过495个字符' }]}>
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