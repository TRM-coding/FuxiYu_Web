import React, { useState, useEffect, useRef } from 'react';
import { listAllMachineBrefInformation, getDetailInformation, addMachine, removeMachine, updateMachine } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, addCollaborator, removeCollaborator, updateRole, createContainer, deleteContainer, startContainer, stopContainer, restartContainer } from '../api/container_api';
import { SearchOutlined, DownOutlined, UpOutlined, ReloadOutlined, UserOutlined, TeamOutlined, ClockCircleOutlined, SettingOutlined, GlobalOutlined, CrownOutlined, UserAddOutlined, EditOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Space, Table, Tag, Modal, Descriptions, Avatar, List, Form, Select, message, Popconfirm, InputNumber, Radio, Pagination } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import TableComponent from '../components/TableComponent';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';
import ContainerDetailModal from '../components/ContainerDetailModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation } from '../api/user_api';
import { isAbortError } from '../utils/requestManager';
import { useNavigate } from 'react-router-dom';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
const { Column } = Table;
const { Option } = Select;

import { startContainerStatusHeartbeat, startMachineStatusHeartbeat } from '../utils/heartbeat';

import { listAllUserBrefInformation } from '../api/user_api';

import './ManageMachine.css';

// machines loaded from backend
const defaultPageSize = 100;


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
      const res = await listAllMachineBrefInformation({ page_number: 0, page_size: defaultPageSize });
      const items = (res && res.machines) || [];
      // map to existing shape with minimal defaults and keep machine_id
      const mapped = items.map((m, idx) => ({
        key: String(m.machine_id || idx + 1),
        machine_id: m.machine_id,
        machine_name: m.machine_name || '',
        machine_ip: m.machine_ip || '',
        machine_type: (m.machine_type || '').toUpperCase(),
        machine_status: (m.machine_status || '').toLowerCase(),
        cpu_core_number: null,
        memory_size_gb: null,
        gpu_number: null,
        gpu_type: null,
        disk_size_gb: null,
        machine_description: ''
      }));
      // 按机器ID并行获取详情以补全信息
      try {
        const detailPromises = mapped.map(it =>
          getDetailInformation(it.machine_id).catch(err => {
            console.warn('detail fetch failed for', it.machine_id, err && err.message);
            return null;
          })
        );
        const details = await Promise.all(detailPromises);
        const merged = mapped.map((it, i) => {
          const d = details[i];
          if (!d) return it;
          return {
            ...it,
            cpu_core_number: d.cpu_core_number ?? it.cpu_core_number,
            memory_size_gb: d.memory_size_gb ?? it.memory_size_gb,
            gpu_number: d.gpu_number ?? it.gpu_number,
            gpu_type: d.gpu_type ?? it.gpu_type,
            disk_size_gb: d.disk_size_gb ?? it.disk_size_gb,
            machine_description: d.machine_description ?? it.machine_description,
            machine_type: (d.machine_type ?? it.machine_type).toUpperCase(),
            machine_status: (d.machine_status ?? it.machine_status).toLowerCase()
          };
        });
        return merged;
      } catch (e) {
        return mapped;
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
    return <Tag color={color}>{status === 'online' ? '运行中' : status === 'offline' ? '已停止' : status === 'creating' ? '创建中' : status === 'starting' ? '启动中' : status === 'stopping' ? '停止中' : status === 'failed' ? '无限崩溃' : status}</Tag>;
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

  // 打开添加宿主机弹窗
  const openAddHostModal = () => {
    addHostForm.resetFields();
    // set defaults for add mode: default status = maintenance
    addHostForm.setFieldsValue({ machine_status: 'maintenance', machine_type: 'CPU', gpu_number: 0 });
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
    // prefill machine id and defaults
    const defaultUser = localStorage.getItem('currentUserName') || localStorage.getItem('currentUser') || '';
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [], root_user: defaultUser });
    setAddContainerVisible(true);
  };

  // 添加容器确认
  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
      setAddContainerLoading(true);
      const machineId = values.machine_id || addContainerMachineId;
      const toAddUserName = values.root_user || localStorage.getItem('currentUserName') || '';
      const payload = {
        user_name: toAddUserName,
        machine_id: machineId,
        container: {
          GPU_LIST: values.GPU_LIST || [],
          CPU_NUMBER: values.CPU_NUMBER || 1,
          MEMORY: values.MEMORY || 512,
          NAME: values.NAME || `container-${Date.now()}`,
          image: values.image || ''
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
  const openEditMachine = (machine) => {
    setIsEditMode(true);
    setEditTargetMachine(machine);
    // 预填表单
    addHostForm.setFieldsValue({
      machine_name: machine.machine_name || '',
      machine_ip: machine.machine_ip || '',
      machine_type: (machine.machine_type || 'CPU').toUpperCase() === 'GPU' ? 'GPU' : 'CPU',
      machine_status: (machine.machine_status || 'online').toLowerCase(),
      cpu_core_number: machine.cpu_core_number || null,
      gpu_number: machine.gpu_number ?? 0,
      gpu_type: machine.gpu_type || '',
      memory_size: machine.memory_size_gb || null,
      disk_size: machine.disk_size_gb || null,
      machine_description: machine.machine_description || ''
    });
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
        // send status as lowercase
        machine_status: (values.machine_status || 'online').toLowerCase(),
        machine_description: values.machine_description || '',
        cpu_core_number: values.cpu_core_number || null,
        gpu_number: values.gpu_number || 0,
        gpu_type: values.gpu_type || null,
        memory_size: values.memory_size || null,
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
          setIsEditMode(false);
          setEditTargetMachine(null);
          if (success) setAddHostVisible(false);
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
            <Column title="CPU核心数" dataIndex="cpu_core_number" key="cpu_core_number" />
            <Column title="内存(GB)" dataIndex="memory_size_gb" key="memory_size_gb" />
            <Column title="GPU数量" dataIndex="gpu_number" key="gpu_number" />
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
            initialValues={{ machine_type: 'CPU', gpu_number: 0, machine_status: 'maintenance' }}
              onValuesChange={(changedValues) => {
                if (changedValues.machine_type) {
                  if (changedValues.machine_type !== 'GPU') {
                    // when switching away from GPU, reset gpu-related fields
                    addHostForm.setFieldsValue({ gpu_number: 0, gpu_type: '' });
                  }
                }
              }}
          >
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

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="cpu_core_number" label="CPU 核心数">
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item shouldUpdate noStyle>
                  {() => {
                    const mt = addHostForm.getFieldValue('machine_type');
                    return (
                        <Form.Item name="gpu_number" label="GPU 数量">
                        <InputNumber min={0} className="mm-width-100" disabled={mt !== 'GPU'} />
                      </Form.Item>
                    );
                  }}
                </Form.Item>
              </Col>
            </Row>

            <Form.Item shouldUpdate noStyle>
              {({ getFieldValue }) => {
                const mt = getFieldValue('machine_type');
                const gnum = getFieldValue('gpu_number');
                if (mt === 'GPU' || (typeof gnum === 'number' && gnum > 0)) {
                  return (
                    <Row gutter={16}>
                      <Col span={12}>
                        <Form.Item name="gpu_type" label="GPU 型号">
                          <Input placeholder="例如：NVIDIA Tesla V100" maxLength={115} />
                        </Form.Item>
                      </Col>
                      <Col span={12} />
                    </Row>
                  );
                }
                return null;
              }}
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="memory_size" label="内存 (GB)">
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="disk_size" label="磁盘 (GB)">
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
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
      <ConfirmModal
        visible={addContainerVisible}
        title="添加容器"
        message="请填写容器信息并确认添加"
        onConfirm={handleAddContainerConfirm}
        onCancel={() => { setAddContainerVisible(false); setAddContainerMachineId(null); }}
        loading={addContainerLoading}
        confirmText="添加"
        confirmDisabled={addContainerUnsafe}
        content={
          <Form
            form={addContainerForm}
            layout="vertical"
            initialValues={{ CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [] }}
            onValuesChange={() => {
              try {
                const vals = addContainerForm.getFieldsValue();
                const name = vals.NAME || '';
                const image = vals.image || '';
                const pub = vals.public_key || '';
                import('../utils/validateCmdArg').then(mod => {
                  setAddContainerUnsafe(Boolean(mod.anyUnsafe(name, image, pub)));
                }).catch(() => setAddContainerUnsafe(false));
              } catch (e) {
                setAddContainerUnsafe(false);
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
                <Form.Item name="image" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }, { max: 195, message: '镜像名长度不得超过195个字符' }]}>
                  <Input placeholder="例如：nginx:latest" maxLength={195} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="CPU_NUMBER" label="CPU 数量">
                  <InputNumber min={1} className="mm-width-100" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="MEMORY" label="内存 (MB)">
                  <InputNumber min={128} className="mm-width-100" />
                </Form.Item>
              </Col>
            </Row>

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