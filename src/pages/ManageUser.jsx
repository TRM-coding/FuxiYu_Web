import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckOutlined, ReloadOutlined, UnlockOutlined, TeamOutlined } from '@ant-design/icons';
import { Flex, Typography, Row, Col, Button, Input, Space, Form, Tag, message, InputNumber, Segmented, Checkbox, Modal } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import ConfirmModal from '../components/ConfirmModal';
import ContainerActionConfirmModal from '../components/ContainerActionConfirmModal';
import { handleAuthError } from '../utils/authHelpers';
import { listAllUserBrefInformation, deleteUser, updateUser, resetPassword } from '../api/user_api';
import { getRbacMatrix, getUserRbacGroups, setUserRbacGroups } from '../api/rbac_api';
import { usePermission } from '../contexts/PermissionContext';
import { listAllContainerBrefInformation, getContainerDetailInformation, removeCollaborator, setLongTermContainer, startContainer, stopContainer, restartContainer, unpauseContainer } from '../api/container_api';
import './ManageUser.css';
import NestedEntityGrid from '../components/NestedEntityGrid';
import CopyChip from '../components/CopyChip';
import ContainerDetailModal from '../components/ContainerDetailModal';
import ManageUserInTable from './ManageUserInTable';
import { startContainerStatusHeartbeat, watchIngContainerUntilTerminal, ING_CONTAINER_STATES } from '../utils/heartbeat';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';
import { isDiskOverLimit, DISK_OVER_LIMIT_MESSAGE } from '../utils/diskLimit';
import EntitySearchBar from '../components/EntitySearchBar';
import { createContainerStatusTransition, deriveContainerEffectiveStatus, getContainerActionState } from '../utils/containerActions';
import { formatLastSshTime, formatCleanupCountdown } from '../utils/timeFormat';
import { LIST_REFRESH_INTERVAL_MS, canRunListRefresh, containerListFingerprint, userListFingerprint } from '../utils/listRefresh';

// users and containers will be fetched from backend
const initialUsers = [];

const ManageUser = () => {
  // Inline editor for expanded rows（邮箱不可改，仅展示）
  const EditUserRow = ({ record }) => {
    const [values, setValues] = React.useState({
      username: record.username ?? '',
      graduation_year: record.graduation_year ?? ''
    });

    const original = React.useRef({ username: record.username ?? '', graduation_year: record.graduation_year ?? '' });

    const changedFields = React.useMemo(() => {
      const out = {};
      if (String(values.username) !== String(original.current.username)) out.username = values.username;
      if (String(values.graduation_year) !== String(original.current.graduation_year)) {
        let v = values.graduation_year;
        if (v === '' || v === undefined || v === null) {
          v = null;
        } else {
          v = parseInt(v, 10);
        }
        out.graduation_year = Number.isNaN(v) ? values.graduation_year : v;
      }
      return out;
    }, [values]);

    const hasChanged = Object.keys(changedFields).length > 0;

    const onReset = () => {
      setValues({ ...original.current });
    };

    const onSave = () => {
      // open modal for confirmation with changedFields
      openModal('save', { record, changedFields });
    };

    const labelClass = (field) => (String(values[field]) !== String(original.current[field]) ? 'manage-user-label-changed' : '');

    return (
      <div className="manage-user-edit-row">
        <Form layout="inline" initialValues={{ username: values.username, graduation_year: values.graduation_year }}>
          <Row gutter={[16, 0]} align="middle" className="manage-user-row">
            <Col flex="auto">
              <Form.Item label={<span className={labelClass('username')}>用户名</span>} className="manage-user-form-item">
                <Input value={values.username} onChange={e => setValues(v => ({ ...v, username: e.target.value }))} className="manage-user-input-150" />
              </Form.Item>
            </Col>
            <Col flex="auto">
              <Form.Item label="邮箱" className="manage-user-form-item">
                <Input value={record.email || ''} disabled className="manage-user-input-200" />
              </Form.Item>
            </Col>
            <Col flex="auto">
              <Form.Item label={<span className={labelClass('graduation_year')}>毕业年份</span>} className="manage-user-form-item">
                <InputNumber
                  value={values.graduation_year === '' || values.graduation_year === null ? undefined : Number(values.graduation_year)}
                  onChange={v => setValues(val => ({ ...val, graduation_year: v }))}
                  className="manage-user-input-120"
                  min={1900}
                  max={2100}
                  precision={0}
                  step={1}
                  parser={(val) => String(val || '').replace(/[^\d]/g, '')}
                />
              </Form.Item>
            </Col>
            <Col>
              <Space size="small">
                <Button type="primary" size="small" onClick={onSave} disabled={!hasChanged}>保存</Button>
                <Button size="small" onClick={onReset}>{hasChanged ? '重置' : '重置'}</Button>
              </Space>
            </Col>
          </Row>
        </Form>
      </div>
    );
  };

  // 用户搜索状态（用户框：用户名/邮箱/ID/毕业年份 并集；容器框：该用户拥有的容器命中）
  const [searchUsername, setSearchUsername] = useState('');
  const [searchContainerName, setSearchContainerName] = useState('');
  const [viewMode, setViewMode] = useState('card');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  // 选中的行 key（用于高亮当前选中行及其展开部分）
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  // fetched users
  const [users, setUsers] = useState(initialUsers);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userCardDrafts, setUserCardDrafts] = useState({});

  // container cache per user id: { [userId]: { loading, data } }
  const [containerMap, setContainerMap] = useState({});
  const pendingContainerTransitionRef = useRef(new Map());
  const userListFingerprintRef = useRef('');
  const containerListFingerprintRef = useRef({});
  const usersRef = useRef(users);
  const containerMapRef = useRef(containerMap);
  const searchContainerNameRef = useRef(searchContainerName);

  usersRef.current = users;
  containerMapRef.current = containerMap;
  searchContainerNameRef.current = searchContainerName;

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

  // 渲染侧 ing 看护（与 Home/ManageMachine 同契约）：containerMap 出现 ing 态 →
  // 自动轮询至终态，补手动刷新/他人操作后进页的缺口；动作驱动的操作心跳不受影响。
  const ingWatcherRef = useRef(new Map());
  useEffect(() => {
    const current = ingWatcherRef.current;
    for (const entry of Object.values(containerMap)) {
      for (const c of (entry?.data || [])) {
        const st = (c.effective_status || '').toLowerCase();
        const cid = c.key ? String(c.key) : (c.container_id ? String(c.container_id) : null);
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
            if (!st) return;
            setContainerMap(prev => {
              const next = { ...prev };
              for (const uid of Object.keys(next)) {
                next[uid] = { ...next[uid], data: (next[uid]?.data || []).map(x => (
                  String(x.key) === String(cid)
                    ? applyContainerEffectiveStatus({ ...x, effective_status: st })
                    : x
                )) };
              }
              return next;
            });
          },
          onTerminal: (data) => {
            const finalSt = data && data.effective_status ? String(data.effective_status).toLowerCase() : null;
            if (!finalSt) return;
            current.delete(cid);
            setContainerMap(prev => {
              const next = { ...prev };
              for (const uid of Object.keys(next)) {
                next[uid] = { ...next[uid], data: (next[uid]?.data || []).map(x => (
                  String(x.key) === String(cid)
                    ? applyContainerEffectiveStatus({ ...x, effective_status: finalSt })
                    : x
                )) };
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
  const [longTermUpdatingMap, setLongTermUpdatingMap] = useState({});
  const [containerActionMap, setContainerActionMap] = useState({});
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedContainer, setSelectedContainer] = useState(null);
  // matched user ids from top-level container name search
  const [matchedUserIds, setMatchedUserIds] = useState(null);
  const { barRef: searchBarRef, barStyle: searchBarStyle } = useAutoHideTopBar();

  const navigate = useNavigate();

  // auth + operator 门禁（PermissionContext 通配判定，替代旧 is_operator 字段猜测）
  const { hasPermission, loaded: permLoaded } = usePermission();
  // 用户 ↔ 权限组 弹窗（生效权限 = 各组并集；入口仅 rbac:manage 可见）
  const [userGroupModal, setUserGroupModal] = useState({
    visible: false,
    user: null,
    allGroups: [],
    selectedIds: [],
    loading: false,
    saving: false,
  });
  React.useEffect(() => {
    const name = localStorage.getItem('currentUserName');
    const id = localStorage.getItem('currentUserId');
    if (!name || !id) {
      if (!sessionStorage.getItem('auth_modal_shown')) {
        try {
          sessionStorage.setItem('auth_modal_shown', '1');
          showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
        } finally {
          sessionStorage.removeItem('auth_modal_shown');
        }
      }
      // 401: clear auth and navigate to login
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
      // For 403 do NOT clear login info; only navigate to /index
      handleAuthError(403, navigate);
      return;
    }
  }, [navigate, permLoaded, hasPermission]);

  React.useEffect(() => {
    let mounted = true;
    let refreshing = false;
    const load = async ({ silent = false } = {}) => {
      if (refreshing) return;
      refreshing = true;
      if (!silent) setUsersLoading(true);
      try {
        const res = await listAllUserBrefInformation({ page_number: 1, page_size: 200 });
        const items = (res && (res.users || res.items || res.data)) || [];
        const mapped = items.map(u => ({
          key: String(u.user_id || u.id || u.uid || u.userId || u.key || ''),
          username: u.username || u.name || u.display_name || String(u.user_id || u.id || u.userId || ''),
          email: u.email || '',
          graduation_year: u.graduation_year || u.year || '',
          amount_of_container: u.amount_of_container ?? u.amount_of_containers ?? 0,
          amount_of_functional_container: u.amount_of_functional_container ?? 0,
          amount_of_managed_container: u.amount_of_managed_container ?? 0,
          amount_of_long_term_container: u.amount_of_long_term_container ?? 0,
        }));
        const fingerprint = userListFingerprint(mapped, { page_number: 1, page_size: 200 });
        if (mounted && (!silent || fingerprint !== userListFingerprintRef.current)) {
          userListFingerprintRef.current = fingerprint;
          setUsers(mapped);
        }
      } catch (err) {
        console.error('load users failed', err);
        const msg = err && err.message ? String(err.message) : '';
        if (msg.toLowerCase().includes('invalid or missing token') || msg.includes('401')) {
          handleAuthError(401, navigate);
          return;
        }
        if (!silent) {
          await showErrorModal({ message: err?.body || err || (msg ? `加载用户列表失败: ${msg}` : '加载用户列表失败'), status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
        }
      } finally {
        refreshing = false;
        if (mounted && !silent) setUsersLoading(false);
      }
    };
    const refreshIfVisible = () => {
      if (canRunListRefresh()) load({ silent: true });
    };
    load();
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
  }, [navigate]);

  // 通用弹窗状态
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'save' | 'delete' | 'resetPassword' | 'removeAssociation'
    loading: false,
    data: null,
  });

  // 基础过滤（用户框：用户名/邮箱/ID/毕业年份 并集）
  const baseFilteredUserData = users.filter(user => {
    const keyword = (searchUsername || '').trim().toLowerCase();
    if (!keyword) return true;
    const username = String(user.username || '').toLowerCase();
    const email = String(user.email || '').toLowerCase();
    const id = String(user.key || '');
    const year = String(user.graduation_year || '');
    return username.includes(keyword) || email.includes(keyword) || id.includes(keyword) || year.includes(keyword);
  });

  // 打开弹窗
  const openModal = (type, data) => {
    setModal({ visible: true, type, loading: false, data });
  };

  // 关闭弹窗
  const closeModal = () => {
    setModal({ visible: false, type: '', loading: false, data: null });
  };

  // 处理弹窗确认
  const handleModalConfirm = async () => {
    setModal(prev => ({ ...prev, loading: true }));
    const { type, data } = modal;

    try {
      if (type === 'save') {
        // data should contain { record, changedFields }
        const uid = Number(data?.record?.key || data?.record?.user_id || data?.record?.id);
        const fields = data?.changedFields || {};
        if (!uid) throw new Error('缺少用户ID');
        if (Object.keys(fields).length === 0) {
          // nothing to do
        } else {
          await updateUser({ user_id: uid, fields });
          // update local list: only update provided fields
          setUsers(prev => prev.map(u => (String(u.key) === String(uid) ? { ...u, ...fields } : u)));
          setUserCardDrafts(prev => {
            const next = { ...prev };
            delete next[String(uid)];
            return next;
          });
          message.success('用户信息已更新');
        }
      } else if (type === 'delete') {
        // call delete user API
        const uid = Number(data?.key || data?.user_id || data?.id);
        if (!uid) throw new Error('缺少用户ID');
        await deleteUser(uid);
        setUsers(prev => prev.filter(u => String(u.key) !== String(data.key)));
        message.success('用户已删除');
      } else if (type === 'resetPassword') {
        const uid = Number(data?.key || data?.user_id || data?.id);
        if (!uid) throw new Error('缺少用户ID');
        const res = await resetPassword({ user_id: uid });
        const newPwd = res && (res.new_password || res.newPassword || res.data?.new_password);
        if (newPwd) {
          await showErrorModal({ title: '密码已重置', message: `新密码：${newPwd}`, status: 200 });
        } else {
          message.success('密码已重置');
        }
      } else if (type === 'removeAssociation') {
        // remove user-container association via API
        const username = data?.username;
        const container = data?.container;
        const userObj = users.find(u => u.username === username);
        const uid = Number(userObj?.key || data?.user_id || data?.id);
        const cid = Number(container?.key || container?.container_id || container?.id);
        if (!uid || !cid) throw new Error('缺少用户ID或容器ID');
        await removeCollaborator({ user_id: uid, container_id: cid });
        // update cache: remove container from this user's container list if present
        setContainerMap(prev => {
          const id = String(uid);
          const entry = prev[id] || { data: [] };
          const newData = (entry.data || []).filter(c => String(c.key) !== String(cid));
          return { ...prev, [id]: { ...(entry || {}), loading: false, data: newData } };
        });
        message.success('关联已移除');
      } else if (type === 'startContainer') {
        await handleStartContainer(data?.userRecord, data?.containerRecord);
      } else if (type === 'stopContainer') {
        await handleStopContainer(data?.userRecord, data?.containerRecord);
      } else if (type === 'restartContainer') {
        await handleRestartContainer(data?.userRecord, data?.containerRecord);
      } else if (type === 'unpauseContainer') {
        await handleUnpauseUserContainer(data?.userRecord, data?.containerRecord);
      }
    } catch (err) {
      console.error('modal action failed', err);
      // Prefer structured error body.message provided by backend (e.g. wild container notice)
      const status = err?.status || err?.response?.status;
      let messageText = (err && err.message) ? err.message : '操作失败，请重试';
      try {
        if (err && err.body && typeof err.body === 'object') {
          if (err.body.message) messageText = String(err.body.message);
          if (err.body.wild_containers) {
            const wc = err.body.wild_containers;
            const list = Array.isArray(wc) ? wc.join(', ') : String(wc);
            messageText = `${messageText}。受影响容器: ${list}`;
          }
        }
      } catch (e) {
        // fall back to err.message
      }
      await showErrorModal({ message:  messageText, status, route: err?.route || err?.response?.url });
    } finally {
      setModal({ visible: false, type: '', loading: false, data: null });
    }
  };

  // 打开"权限组"弹窗：拉取全量权限组 + 该用户当前绑定
  const openUserGroupsModal = async (record) => {
    if (!record) return;
    setUserGroupModal(prev => ({ ...prev, visible: true, user: record, selectedIds: [], allGroups: [], loading: true }));
    try {
      const [matrix, mine] = await Promise.all([
        getRbacMatrix(),
        getUserRbacGroups(Number(record.key)),
      ]);
      const groups = Array.isArray(matrix?.groups) ? matrix.groups : [];
      const bound = Array.isArray(mine?.group_ids) ? mine.group_ids.map(Number) : [];
      setUserGroupModal(prev => ({
        ...prev,
        allGroups: groups.map(g => ({
          id: Number(g.id),
          name: g.name,
          description: g.description || '',
          entityCount: Array.isArray(g.entity_codes) ? g.entity_codes.length : 0,
        })),
        selectedIds: groups.map(g => Number(g.id)).filter(gid => bound.includes(gid)),
        loading: false,
      }));
    } catch (err) {
      console.error('load rbac groups failed', err);
      message.error(err?.body?.message || '加载权限组失败');
      setUserGroupModal(prev => ({ ...prev, loading: false }));
    }
  };

  // 保存整组替换（后端自锁护栏：不能移除自己持有的 rbac:manage 组）
  const handleSaveUserGroups = async () => {
    const { user, selectedIds } = userGroupModal;
    if (!user) return;
    setUserGroupModal(prev => ({ ...prev, saving: true }));
    try {
      await setUserRbacGroups(Number(user.key), selectedIds);
      message.success(`已更新用户 ${user.username || ('#' + user.key)} 的权限组`);
      setUserGroupModal(prev => ({ ...prev, visible: false, user: null, saving: false }));
    } catch (err) {
      const reason = err?.body?.error_reason || '';
      const friendly = reason === 'cannot_remove_own_manage'
        ? '不能移除自己持有的 rbac:manage 权限组（会把自己锁死）'
        : (err?.body?.message || '更新权限组失败');
      message.error(friendly);
      setUserGroupModal(prev => ({ ...prev, saving: false }));
    }
  };

  const closeUserGroupsModal = () => {
    if (userGroupModal.saving) return;
    setUserGroupModal(prev => ({ ...prev, visible: false, user: null }));
  };

  // 处理删除用户
  const handleDeleteUser = (user) => {
    openModal('delete', user);
  };

  // 处理重置密码
  const handleResetPassword = (user) => {
    openModal('resetPassword', user);
  };

  // 处理移除用户与容器的关联
  const handleRemoveUserFromContainer = (username, container) => {
    openModal('removeAssociation', { username, container });
  };

  // 容器状态标签
  const renderContainerStatus = (status) => {
    const normalized = String(status || '').toLowerCase();
    const color = normalized === 'online'
      ? 'green'
      : normalized === 'offline'
        ? 'volcano'
        : normalized === 'paused'
          ? 'volcano'
          : normalized === 'building'
            ? 'geekblue'
            : normalized === 'creating'
            ? 'blue'
            : normalized === 'starting'
              ? 'cyan'
              : normalized === 'restarting'
                ? 'purple'
                : normalized === 'stopping'
                  ? 'orange'
                  : normalized === 'failed'
                    ? 'red'
                    : 'default';
    const labelMap = {
      online: '运行中',
      offline: '已停止',
      paused: '磁盘已冻结',
      building: '构建中',
      creating: '创建中',
      starting: '启动中',
      restarting: '重启中',
      stopping: '停止中',
      pausing: '冻结中',
      unpausing: '解冻中',
      failed: '异常',
      unknown: '未知',
      status_unknown: '状态未知',
      host_offline: '宿主机离线',
      host_maintenance: '宿主机维护',
    };
    return <Tag color={color}>{labelMap[normalized] || status || '未知'}</Tag>;
  };

  // 容器中用户角色标签
  const renderContainerRoleTag = (role) => {
    let color = '';
    let roleText = '';
    switch (String(role || '').toUpperCase()) {
      case 'ADMIN':
        color = 'volcano';
        roleText = '管理员';
        break;
      case 'COLLABORATOR':
        color = 'green';
        roleText = '普通用户';
        break;
      case 'ROOT':
        color = 'purple';
        roleText = 'ROOT';
        break;
      default:
        color = 'default';
        roleText = '未知';
    }
    return <Tag color={color}>{roleText}</Tag>;
  };

  // 获取用户在某个容器中的角色
  const getUserRoleInContainer = (accounts, username) => {
    if (!accounts || !Array.isArray(accounts)) return null;
    for (const account of accounts) {
      if (Array.isArray(account) && account[0] === username) {
        return account[1];
      }
    }
    return null;
  };

  // 获取用户的所有容器（带角色信息）
  const fetchContainersForUser = async (userId, pageNumber = 0, containerName = searchContainerName, options = {}) => {
    const { silent = false } = options;
    if (!userId) return;
    const id = String(userId);
    // avoid duplicate fetch
    //if (containerMap[id]?.loading || containerMap[id]?.data) return;
    if (!silent) {
      setContainerMap(prev => ({
        ...prev,
        [id]: {
          ...(prev[id] || {}),
          loading: true,
          data: [],
          page: pageNumber,
          total_page: prev[id]?.total_page || 1,
        },
      }));
    }
    try {
      const pageSize = 4;
      const res = await listAllContainerBrefInformation({
        machine_id: null,
        user_id: Number(userId),
        container_search: containerName,
        page_number: pageNumber,
        page_size: pageSize,
      });
      const items = (res && (res.containers_info || res.containers)) || [];
      const total_page = (res && (res.total_page || res.totalPages || res.total_pages)) || 1;
      const total_number = Number(res && (res.total_number ?? res.totalNumber ?? res.total)) || items.length;
      const longTermRemaining = Object.prototype.hasOwnProperty.call(res || {}, 'long_term_container_remaining')
        ? Number(res.long_term_container_remaining)
        : null;
      const longTermLimit = Object.prototype.hasOwnProperty.call(res || {}, 'long_term_container_limit')
        ? Number(res.long_term_container_limit)
        : null;
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
        runtime_metrics: c.runtime_metrics ?? null,
      }));
      // bref 已含卡片所需全部字段（image/machine_ip/accounts/资源/磁盘/长期态），
      // 不再逐容器拉 detail；userRole 按当前查看用户从 accounts 直接判定
      const userObj = usersRef.current.find(u => String(u.key) === String(userId));
      const username = userObj?.username;
      const data = mapped.map(c => {
        const accounts = c.accounts || [];
        let userRole = null;
        if (username) {
          const found = accounts.find(a => {
            if (!a || typeof a !== 'object') return false;
            return a.username === username
              || String(a.user_id) === String(userId)
              || String(a.user_id) === String(userObj?.key);
          });
          if (found) userRole = found.role ?? null;
        }
        return { ...c, accounts, userRole };
      });
      const fingerprint = containerListFingerprint(data, {
        user_id: id,
        page: pageNumber,
        page_size: pageSize,
        total_page,
        total_number,
        container_name: String(containerName || '').trim(),
        long_term_container_remaining: longTermRemaining,
        long_term_container_limit: longTermLimit,
      });
      if (silent && fingerprint === containerListFingerprintRef.current[id]) return;
      containerListFingerprintRef.current = {
        ...containerListFingerprintRef.current,
        [id]: fingerprint,
      };
      setContainerMap(prev => ({
        ...prev,
        [id]: {
          loading: false,
          data: data.map(applyContainerEffectiveStatus),
          page: pageNumber,
          total_page,
          total_number,
          page_size: pageSize,
          container_name: String(containerName || '').trim(),
          long_term_container_remaining: longTermRemaining,
          long_term_container_limit: longTermLimit,
        },
      }));
    } catch (err) {
      console.error('fetchContainersForUser failed', userId, err);
      if (!silent) {
        setContainerMap(prev => ({ ...prev, [id]: { loading: false, data: [], page: pageNumber, total_page: 1 } }));
      }
    }
  };

  React.useEffect(() => {
    let mounted = true;
    let refreshing = false;
    const refreshLoadedContainers = async () => {
      if (!mounted || refreshing || !canRunListRefresh()) return;
      const entries = Object.entries(containerMapRef.current)
        .filter(([, entry]) => Array.isArray(entry?.data) && !entry.loading);
      if (!entries.length) return;
      refreshing = true;
      try {
        await Promise.allSettled(entries.map(([userId, entry]) => (
          fetchContainersForUser(
            userId,
            entry.page ?? 0,
            entry.container_name ?? searchContainerNameRef.current,
            { silent: true },
          )
        )));
      } finally {
        refreshing = false;
      }
    };
    const timer = setInterval(refreshLoadedContainers, LIST_REFRESH_INTERVAL_MS);
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', refreshLoadedContainers);
    }
    return () => {
      mounted = false;
      clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', refreshLoadedContainers);
      }
    };
  }, []);

  const getUserContainers = (username) => {
    const user = users.find(u => u.username === username);
    if (!user) return [];
    const id = String(user.key);
    // do not trigger fetch during render — return empty until data present
    if (!containerMap[id]) {
      return [];
    }
    const data = containerMap[id].data || [];
    return data; // `userRole` is provided by detail fetch and stored in cache
  };

  const openContainerDetail = async (container) => {
    if (!container) return;
    const cid = container.key || container.container_id;
    if (!cid) return;
    try {
      setSelectedContainer(null);
      const res = await getContainerDetailInformation(Number(cid));
      const detail = (res && (res.container_info || res.container || res.data || res.container_detail)) || res || null;
      if (!detail) {
        await showErrorModal({ message: '未能获取容器详情' });
        return;
      }
      setSelectedContainer({
        key: detail.container_id ? String(detail.container_id) : String(cid),
        container_name: detail.container_name || detail.name || container.container_name || '',
        container_image: detail.container_image || detail.image || container.container_image || '',
        port: detail.port ? String(detail.port) : (detail.port_str || container.port || ''),
        effective_status: (detail.effective_status || '').toLowerCase(),
        machine_ip: detail.machine_ip || container.machine_ip || '',
        machine_id: detail.machine_id ? String(detail.machine_id) : (container.machine_id ? String(container.machine_id) : ''),
        cpu_number: detail.cpu_number ?? container.cpu_number ?? null,
        gpu_number: detail.gpu_number ?? container.gpu_number ?? 0,
        memory_gb: detail.memory_gb ?? container.memory_gb ?? 0,
        shared_gb: detail.shared_gb ?? container.shared_gb ?? 0,
        accounts: detail.accounts || detail.account_list || container.accounts || [],
      });
      setDetailModalVisible(true);
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取容器详情失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    }
  };

  const handleLongTermChange = async (userRecord, containerRecord, checked) => {
    const cid = containerRecord?.key || containerRecord?.container_id;
    const uid = userRecord?.key || userRecord?.user_id;
    if (!cid || !uid) return;
    const currentlyLongTerm = containerRecord?.is_long_term === true;
    setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: true }));
    try {
      const res = await setLongTermContainer({ container_id: Number(cid), is_long_term: checked });
      const nextIsLongTerm = res?.is_long_term === true;
      const nextCanEnable = res?.long_term_container_can_enable !== false;
      const nextBlockedUserIds = res?.long_term_container_blocked_user_ids || [];
      const nextRemainingByUser = res?.long_term_container_remaining_by_user || {};
      const userRemaining = Object.prototype.hasOwnProperty.call(nextRemainingByUser, String(uid))
        ? Number(nextRemainingByUser[String(uid)])
        : (Object.prototype.hasOwnProperty.call(nextRemainingByUser, Number(uid))
          ? Number(nextRemainingByUser[Number(uid)])
          : null);
      setContainerMap(prev => {
        const entry = prev[String(uid)] || { data: [] };
        return {
          ...prev,
          [String(uid)]: {
            ...entry,
            long_term_container_remaining: userRemaining === null ? entry.long_term_container_remaining : userRemaining,
            data: (entry.data || []).map(c => (
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
      setUsers(prev => prev.map(u => {
        if (String(u.key) !== String(uid)) return u;
        let nextCount = Number(u.amount_of_long_term_container || 0);
        if (nextIsLongTerm && !currentlyLongTerm) nextCount += 1;
        if (!nextIsLongTerm && currentlyLongTerm) nextCount = Math.max(0, nextCount - 1);
        return { ...u, amount_of_long_term_container: nextCount };
      }));
      message.success(nextIsLongTerm ? '已设为长期容器' : '已取消长期容器');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '设置长期容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setLongTermUpdatingMap(prev => ({ ...prev, [String(cid)]: false }));
    }
  };

  const patchUserContainer = (userId, containerId, patch) => {
    if (!userId || !containerId) return;
    setContainerMap(prev => {
      const id = String(userId);
      const entry = prev[id] || { data: [] };
      return {
        ...prev,
        [id]: {
          ...entry,
          data: (entry.data || []).map(c => (
            String(c.key) === String(containerId)
              ? applyContainerEffectiveStatus({ ...c, ...patch })
              : c
          )),
        },
      };
    });
  };

  const runContainerHeartbeat = ({ userRecord, containerRecord, actionKey, terminalState, requiredProgressState = '' }) => {
    startContainerStatusHeartbeat({
      machine_id: containerRecord.machine_id,
      machine_ip: containerRecord.machine_ip,
      container_name: containerRecord.container_name,
      container_id: containerRecord.key ?? containerRecord.container_id,
      terminalState,
      requiredProgressState,
      onProgress: (data) => {
        const st = data?.effective_status ? String(data.effective_status).toLowerCase() : null;
        if (st && st !== terminalState && st !== 'failed') {
          patchUserContainer(userRecord.key, containerRecord.key, { effective_status: st });
        }
      },
      onTerminal: (data) => {
        const st = data?.effective_status ? String(data.effective_status).toLowerCase() : terminalState;
        const nextStatus = st === 'failed' ? 'failed' : terminalState;
        clearContainerTransition(containerRecord.key);
        patchUserContainer(userRecord.key, containerRecord.key, { effective_status: nextStatus });
        setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
        if (nextStatus === 'failed') {
          message.error(`容器 ${containerRecord.container_name} 状态异常`);
        } else {
          message.success(`容器 ${containerRecord.container_name} 已${terminalState === 'online' ? '运行' : '停止'}`);
        }
      },
    });
  };

  const handleUnpauseUserContainer = async (userRecord, containerRecord) => {
    const cid = containerRecord?.key;
    if (!cid) return;
    const actionKey = `unpause-${cid}`;
    setContainerActionMap(prev => ({ ...prev, [actionKey]: true }));
    markContainerTransition(containerRecord, 'unpausing', 'online');
    patchUserContainer(userRecord.key, cid, { effective_status: 'unpausing' });
    try {
      message.loading({ content: `正在解冻 ${containerRecord.container_name}...`, key: actionKey });
      await unpauseContainer(Number(cid));
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      runContainerHeartbeat({ userRecord, containerRecord, actionKey, terminalState: 'online' });
      message.success({ content: '解冻指令已发送', key: actionKey, duration: 2 });
    } catch (err) {
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      patchUserContainer(userRecord.key, cid, { effective_status: 'paused' });
      await showErrorModal({ message: err?.body || err || '解冻失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    }
  };

  const handleStartContainer = async (userRecord, containerRecord) => {
    const cid = containerRecord?.key;
    if (!cid) return;
    const actionKey = `start-${cid}`;
    setContainerActionMap(prev => ({ ...prev, [actionKey]: true }));
    markContainerTransition(containerRecord, 'starting', 'online');
    patchUserContainer(userRecord.key, cid, { effective_status: 'starting' });
    try {
      message.loading({ content: `正在启动 ${containerRecord.container_name}...`, key: actionKey });
      await startContainer(Number(cid));
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      runContainerHeartbeat({ userRecord, containerRecord, actionKey, terminalState: 'online' });
      message.success({ content: '启动指令已发送', key: actionKey, duration: 2 });
    } catch (err) {
      clearContainerTransition(cid);
      patchUserContainer(userRecord.key, cid, { effective_status: 'offline' });
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      await showErrorModal({ message: err?.body || err || '启动失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    }
  };

  const handleStopContainer = async (userRecord, containerRecord) => {
    const cid = containerRecord?.key;
    if (!cid) return;
    const actionKey = `stop-${cid}`;
    setContainerActionMap(prev => ({ ...prev, [actionKey]: true }));
    markContainerTransition(containerRecord, 'stopping', 'offline');
    patchUserContainer(userRecord.key, cid, { effective_status: 'stopping' });
    try {
      message.loading({ content: `正在停止 ${containerRecord.container_name}...`, key: actionKey });
      await stopContainer(Number(cid));
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      runContainerHeartbeat({ userRecord, containerRecord, actionKey, terminalState: 'offline' });
      message.success({ content: '停止指令已发送', key: actionKey, duration: 2 });
    } catch (err) {
      clearContainerTransition(cid);
      patchUserContainer(userRecord.key, cid, { effective_status: 'online' });
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      await showErrorModal({ message: err?.body || err || '停止失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    }
  };

  const handleRestartContainer = async (userRecord, containerRecord) => {
    const cid = containerRecord?.key;
    if (!cid) return;
    const actionKey = `restart-${cid}`;
    setContainerActionMap(prev => ({ ...prev, [actionKey]: true }));
    markContainerTransition(containerRecord, 'restarting', 'online');
    patchUserContainer(userRecord.key, cid, { effective_status: 'restarting' });
    try {
      message.loading({ content: `正在重启 ${containerRecord.container_name}...`, key: actionKey });
      await restartContainer(Number(cid));
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      runContainerHeartbeat({ userRecord, containerRecord, actionKey, terminalState: 'online', requiredProgressState: 'restarting' });
      message.success({ content: '重启指令已发送', key: actionKey, duration: 2 });
    } catch (err) {
      clearContainerTransition(cid);
      patchUserContainer(userRecord.key, cid, { effective_status: 'online' });
      setContainerActionMap(prev => ({ ...prev, [actionKey]: false }));
      await showErrorModal({ message: err?.body || err || '重启失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    }
  };

  const getUserCardDraft = (record) => {
    const id = String(record.key);
    return userCardDrafts[id] || {
      username: record.username ?? '',
      graduation_year: record.graduation_year ?? '',
    };
  };

  const updateUserCardDraft = (record, field, value) => {
    const id = String(record.key);
    setUserCardDrafts(prev => ({
      ...prev,
      [id]: {
        ...getUserCardDraft(record),
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const getUserCardChangedFields = (record) => {
    const draft = getUserCardDraft(record);
    const fields = {};
    if (String(draft.username ?? '') !== String(record.username ?? '')) fields.username = draft.username;
    if (String(draft.graduation_year ?? '') !== String(record.graduation_year ?? '')) {
      const raw = draft.graduation_year;
      if (raw === '' || raw === null || raw === undefined) {
        fields.graduation_year = null;
      } else {
        const parsed = parseInt(raw, 10);
        fields.graduation_year = Number.isNaN(parsed) ? raw : parsed;
      }
    }
    return fields;
  };

  const renderEditChip = (record, field, fallback, className = '') => {
    const draft = getUserCardDraft(record);
    const value = draft[field] ?? '';
    const changed = String(value ?? '') !== String(record[field] ?? '');
    return (
      <input
        className={`manage-user-edit-chip ${changed ? 'changed' : ''} ${className}`}
        value={value}
        placeholder={fallback}
        title={String(value || fallback || '')}
        onClick={(event) => event.stopPropagation()}
        onChange={(event) => updateUserCardDraft(record, field, event.target.value)}
      />
    );
  };

  const openUserCardSave = (record) => {
    const changedFields = getUserCardChangedFields(record);
    if (!Object.keys(changedFields).length) return;
    openModal('save', { record, changedFields });
  };

  const renderDiskUsage = (containerRecord, trailing = null) => {
    const total = containerRecord?.disk_total_gb;
    const limit = containerRecord?.disk_limit_gb;
    const pct = Number(containerRecord?.disk_usage_percent || 0);
    return (
      <div className="fuxi-nested-child-disk-line">
        <span>{total == null ? '磁盘 -' : `磁盘 ${total}G / ${limit != null ? `${limit}G` : '-'}`}</span>
        {trailing}
        <div className="fuxi-nested-child-disk-track">
          <div
            className={pct >= 90 ? 'fuxi-nested-child-disk-fill danger' : pct >= 75 ? 'fuxi-nested-child-disk-fill warn' : 'fuxi-nested-child-disk-fill'}
            style={{ width: `${Math.min(pct, 100)}%` }}
          />
        </div>
      </div>
    );
  };

  // 容器框搜索：走后端 container_search 过滤，再从 bref 的 accounts 收集 user_id
  const userContainerSearchTokenRef = useRef(0);
  const performUserContainerSearch = async (keywordRaw) => {
    const keyword = (keywordRaw || '').trim();
    if (!keyword) {
      setMatchedUserIds(null);
      return;
    }
    const myToken = ++userContainerSearchTokenRef.current;
    try {
      const res = await listAllContainerBrefInformation({ container_search: keyword, page_number: 0, page_size: 1000 });
      const items = (res && (res.containers_info || res.containers)) || [];
      const foundUserIds = new Set();
      for (const c of items) {
        const accounts = c.accounts || [];
        for (const a of accounts) {
          const uid = a?.user_id ?? a?.userId ?? a?.id ?? a?.uid ?? null;
          if (uid !== null && uid !== undefined && String(uid) !== '') foundUserIds.add(String(uid));
        }
      }
      if (userContainerSearchTokenRef.current === myToken) {
        setMatchedUserIds(foundUserIds.size ? foundUserIds : new Set());
      }
    } catch (e) {
      console.warn('container search failed', e);
      if (userContainerSearchTokenRef.current === myToken) setMatchedUserIds(new Set());
    }
  };

  React.useEffect(() => {
    performUserContainerSearch(searchContainerName);
    return () => { userContainerSearchTokenRef.current += 1; };
  }, [searchContainerName]);

  // 最终过滤（含容器名)
  const filteredUserData = baseFilteredUserData.filter(user => {
    const keyword = (searchContainerName || '').trim().toLowerCase();
    if (!keyword) return true;
    // if matchedUserIds is null, we haven't finished global search yet -> optimistically include user (or you may choose to exclude)
    if (matchedUserIds === null) return true;
    const id = String(user.key);
    return matchedUserIds.has(id);
  });

  const visibleUserKeys = filteredUserData.map(user => String(user.key)).join('|');
  React.useEffect(() => {
    filteredUserData.forEach(user => {
      const id = String(user.key);
      const total = Number(user.amount_of_container ?? user.amountOfContainer ?? 0);
      if (!containerMap[id] && total > 0) {
        fetchContainersForUser(id);
      }
    });
  }, [visibleUserKeys]);

  // 切换展开状态
  const toggleExpand = (userId) => {
    const willExpand = !expandedRowKeys.includes(userId);
    setExpandedRowKeys(prev => {
      if (prev.includes(userId)) {
        return prev.filter(key => key !== userId);
      } else {
        return [...prev, userId];
      }
    });
    // trigger fetch when user explicitly expands a row (avoids setState during render)
    if (willExpand) fetchContainersForUser(userId);
  };

  // 生成弹窗内容
  const getModalContent = () => {
    const { type, data } = modal;
    
    switch (type) {
      case 'save': {
        const rec = data?.record || {};
        const changed = data?.changedFields || {};
        return (
          <div className="manage-user-modal-save">
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">用户：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{rec?.username}</Typography.Text>
              </Col>
              {Object.keys(changed).map((k) => (
                <Col span={24} key={k}>
                  <Typography.Text type="secondary">{k}：</Typography.Text>
                  <Typography.Text className="manage-user-text-gap">{String(changed[k])}</Typography.Text>
                </Col>
              ))}
            </Row>
          </div>
        );
      }
      case 'delete': {
        const user = data;
        return (
          <div className="manage-user-modal-delete">
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">用户ID：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{user?.key}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">用户名：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{user?.username}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">邮箱：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{user?.email}</Typography.Text>
              </Col>
            </Row>
            <Typography.Text type="danger" className="manage-user-danger-text">
              此操作不可恢复！
            </Typography.Text>
          </div>
        );
      }
      case 'resetPassword': {
        const user = data || {};
        return (
          <div className="manage-user-modal-reset">
            <Typography.Text type="secondary">
              系统将为用户 {user?.username || user?.key} 重置密码，确认后会显示新密码，请提醒用户尽快修改。
            </Typography.Text>
          </div>
        );
      }
      case 'removeAssociation': {
        const { username, container } = data || {};
        return (
          <div className="manage-user-modal-remove">
            <Row gutter={[0, 12]}>
              <Col span={24}>
                <Typography.Text type="secondary">容器ID：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{container?.key}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">容器名称：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{container?.container_name}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">容器镜像：</Typography.Text>
                <Typography.Text className="manage-user-text-gap">{container?.container_image}</Typography.Text>
              </Col>
              <Col span={24}>
                <Typography.Text type="secondary">当前角色：</Typography.Text>
                <Tag className="manage-user-text-gap" color={
                  container?.userRole === 'ADMIN' ? 'volcano' : 
                  container?.userRole === 'COLLABORATOR' ? 'green' : 
                  'purple'
                }>
                  {container?.userRole === 'ADMIN' ? '管理员' : 
                   container?.userRole === 'COLLABORATOR' ? '协作者' : 
                   '超级管理员'}
                </Tag>
              </Col>
            </Row>
          </div>
        );
      }
      default:
        return null;
    }
  };

  // 生成弹窗标题
  const getModalTitle = () => {
    const { type, data } = modal;
    
    switch (type) {
      case 'save':
        return `确定要保存用户 ${data?.record?.username} 的信息吗？`;
      case 'delete':
        return `确定要删除用户 ${data?.username} 吗？这将会同时解除用户与所有容器的关联！`;
      case 'resetPassword':
        return `确定要重置用户 ${data?.username} 的密码吗？`;
      case 'removeAssociation':
        return `确定要将用户 ${data?.username} 从容器 ${data?.container?.container_name} 中移除吗？`;
      default:
        return '';
    }
  };

  // 获取弹窗配置
  const getModalConfig = () => {
    const { type } = modal;
    
    const config = {
      save: {
        title: '确认保存用户信息',
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认保存'
      },
      delete: {
        title: '确认删除用户',
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认删除'
      },
      resetPassword: {
        title: '确认重置密码',
        danger: false,
        iconColor: '#faad14',
        confirmText: '确认重置'
      },
      removeAssociation: {
        title: '确认移除关联',
        danger: true,
        iconColor: '#ff4d4f',
        confirmText: '确认移除'
      }
    };
    
    return config[type] || {};
  };

  return (
    <>
      {/* 通用确认弹窗 */}
      {['startContainer', 'stopContainer', 'restartContainer', 'unpauseContainer'].includes(modal.type) ? (
        <ContainerActionConfirmModal
          visible={modal.visible}
          action={{
            startContainer: 'start',
            stopContainer: 'stop',
            restartContainer: 'restart',
            unpauseContainer: 'unpause',
          }[modal.type]}
          container={modal.data?.containerRecord}
          onConfirm={handleModalConfirm}
          onCancel={closeModal}
          loading={modal.loading}
        />
      ) : (
        <ConfirmModal
          visible={modal.visible}
          title={getModalConfig().title}
          message={getModalTitle()}
          content={getModalContent()}
          danger={getModalConfig().danger}
          iconColor={getModalConfig().iconColor}
          confirmText={getModalConfig().confirmText}
          onConfirm={handleModalConfirm}
          onCancel={closeModal}
          loading={modal.loading}
        />
      )}

      <ContainerDetailModal
        visible={detailModalVisible}
        container={selectedContainer}
        onClose={() => {
          setDetailModalVisible(false);
          setSelectedContainer(null);
        }}
        usersList={users.map(u => ({ id: u.key, name: u.username, username: u.username }))}
        currentUserName={localStorage.getItem('currentUserName')}
        currentUserId={localStorage.getItem('currentUserId')}
        readOnly
      />

      <div className="manage-user-root">
        {/* 1. 搜索区域（固定顶部） */}
        <div ref={searchBarRef} style={searchBarStyle} className="manage-user-search-bar manage-user-auto-hide-bar">
          <EntitySearchBar
            primaryPlaceholder="搜索用户名 / 邮箱 / ID / 毕业年份"
            primaryValue={searchUsername}
            onPrimaryChange={setSearchUsername}
            secondaryPlaceholder="搜索容器名"
            secondaryValue={searchContainerName}
            onSecondaryChange={setSearchContainerName}
          />
        </div>

      {/* 2. 下方区域：用户表格 */}
        <section className="manage-user-card-overview">
          <div className="manage-user-section-heading">
            <div>
              <Typography.Title level={4}>用户与容器关系</Typography.Title>
            </div>
            <Space size={12}>
              <Typography.Text type="secondary">{filteredUserData.length} 个用户</Typography.Text>
              <Segmented
                size="small"
                value={viewMode}
                onChange={setViewMode}
                options={[
                  { label: '卡片', value: 'card' },
                  { label: '表格', value: 'table' },
                ]}
              />
            </Space>
          </div>

          {viewMode === 'card' ? (
          <NestedEntityGrid
            items={filteredUserData}
            selectedKey={selectedRowKey}
            className="manage-user-nested-grid"
            emptyText={usersLoading ? '用户加载中' : '暂无用户'}
            emptySlotText="空位"
            onSelect={(record) => setSelectedRowKey(String(record.key))}
            getKey={(record) => record.key}
            getChildren={(record) => getUserContainers(record.username)}
            renderRail={(record) => {
              const totalContainers = record.amount_of_container ?? record.amountOfContainer ?? 0;
              const runningContainers = record.amount_of_functional_container ?? record.amountOfFunctionalContainer ?? 0;
              const managedContainers = record.amount_of_managed_container ?? record.amountOfManagedContainer ?? 0;
              const longTermContainers = record.amount_of_long_term_container ?? record.amountOfLongTermContainer ?? 0;
              const changedFields = getUserCardChangedFields(record);
              const hasChanged = Object.keys(changedFields).length > 0;

              return (
                <>
                  <div className="manage-user-rail-head">
                    <Typography.Text type="secondary">用户</Typography.Text>
                    {renderEditChip(record, 'username', '用户名', 'manage-user-edit-chip-title')}
                    <CopyChip value={record.key} size="meta" tone="soft" className="manage-user-id">ID {record.key}</CopyChip>
                    <span className="manage-user-edit-chip manage-user-email-readonly" title={record.email || '未记录邮箱'}>
                      {record.email || '未记录邮箱'}
                    </span>
                    {renderEditChip(record, 'graduation_year', '未记录毕业年份')}
                  </div>

                  <div className="manage-user-rail-stats">
                    <div><span>容器</span><strong>{totalContainers}</strong></div>
                    <div><span>正常</span><strong>{runningContainers}</strong></div>
                    <div><span>管理</span><strong>{managedContainers}</strong></div>
                    <div><span>长期</span><strong>{longTermContainers}</strong></div>
                  </div>

                  <div className="manage-user-rail-actions">
                    <Button
                      size="small"
                      type={hasChanged ? 'primary' : 'default'}
                      icon={<CheckOutlined />}
                      disabled={!hasChanged}
                      onClick={(event) => {
                        event.stopPropagation();
                        openUserCardSave(record);
                      }}
                    >
                      保存
                    </Button>
                    {hasPermission('rbac:manage') && (
                      <Button
                        size="small"
                        icon={<TeamOutlined />}
                        onClick={(event) => {
                          event.stopPropagation();
                          openUserGroupsModal(record);
                        }}
                      >
                        权限组
                      </Button>
                    )}
                    <Button
                      size="small"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleResetPassword(record);
                      }}
                    >
                      重置
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={(event) => {
                        event.stopPropagation();
                        handleDeleteUser(record);
                      }}
                    >
                      删除
                    </Button>
                  </div>
                </>
              );
            }}
            renderHeader={(record, containers) => {
              const entry = containerMap[String(record.key)] || {};
              const totalContainers = record.amount_of_container ?? record.amountOfContainer ?? containers.length ?? 0;
              return (
                <>
                  <Typography.Text type="secondary">
                    {entry.loading ? '容器加载中' : `${totalContainers} 个容器`}
                  </Typography.Text>
                  <Space size={6}>
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      onClick={(event) => {
                        event.stopPropagation();
                        fetchContainersForUser(record.key, (containerMap[String(record.key)] || {}).page ?? 0);
                      }}
                    />
                  </Space>
                </>
              );
            }}
            renderChild={(containerRecord, userRecord) => (
              <article className="fuxi-nested-child-card manage-user-nested-container-card" key={containerRecord.key}>
                <div className="fuxi-nested-child-card-head">
                  <button
                    type="button"
                    className="fuxi-nested-child-title-button"
                    title={containerRecord.container_name}
                    onClick={(event) => {
                      event.stopPropagation();
                      navigate(`/index/containers/${containerRecord.key || containerRecord.container_id}`);
                    }}
                  >
                    {containerRecord.container_name || '未命名容器'}
                  </button>
                  <Space size={6} className="fuxi-nested-child-card-tags">
                    {renderContainerStatus(containerRecord.effective_status)}
                    {renderContainerRoleTag(containerRecord.userRole)}
                  </Space>
                </div>
                <div className="fuxi-nested-child-card-meta">
                  <CopyChip value={containerRecord.machine_ip || containerRecord.machine_id || ''}>{containerRecord.machine_ip || containerRecord.machine_id || '-'}</CopyChip>
                  <CopyChip value={containerRecord.port || ''}>{containerRecord.port ? `:${containerRecord.port}` : '无端口'}</CopyChip>
                  <span title={formatLastSshTime(containerRecord?.last_ssh_login_time)}>上次SSH {formatLastSshTime(containerRecord?.last_ssh_login_time)}</span>
                  <span>清理倒计时 {formatCleanupCountdown(containerRecord?.last_ssh_login_time, containerRecord)}</span>
                </div>
                {renderDiskUsage(containerRecord, (
                  <div className="fuxi-nested-child-disk-actions">
                    {hasPermission('container:manage') && (
                      <Button
                        size="small"
                        icon={<UnlockOutlined />}
                        disabled={String(containerRecord.effective_status || '').toLowerCase() !== 'paused' || !!containerActionMap[`unpause-${String(containerRecord.key)}`]}
                        loading={!!containerActionMap[`unpause-${String(containerRecord.key)}`]}
                        onClick={(event) => {
                          event.stopPropagation();
                          openModal('unpauseContainer', { userRecord, containerRecord });
                        }}
                      >
                        解冻
                      </Button>
                    )}
                    <Checkbox
                      checked={containerRecord.is_long_term === true}
                      disabled={
                        !!longTermUpdatingMap[String(containerRecord.key)] ||
                        !getContainerActionState(containerRecord.effective_status).canSetLongTerm ||
                        (!containerRecord.is_long_term && (containerRecord.long_term_container_can_enable === false || isDiskOverLimit(containerRecord)))
                      }
                      title={
                        containerRecord.is_long_term ? undefined
                          : isDiskOverLimit(containerRecord) ? DISK_OVER_LIMIT_MESSAGE
                            : containerRecord.long_term_container_can_enable === false ? '绑定用户已达到长期容器上限'
                              : undefined
                      }
                      onClick={(event) => event.stopPropagation()}
                      onChange={(event) => handleLongTermChange(userRecord, containerRecord, event.target.checked)}
                    >
                      长期
                    </Checkbox>
                  </div>
                ))}
                <div className="fuxi-nested-child-card-actions">
                  {(() => {
                    const status = String(containerRecord.effective_status || '').toLowerCase();
                    const cid = String(containerRecord.key);
                    return (
                      <>
                        <Button
                          size="small"
                          type="primary"
                          disabled={status !== 'offline' || !!containerActionMap[`start-${cid}`]}
                          loading={!!containerActionMap[`start-${cid}`]}
                          onClick={(event) => {
                            event.stopPropagation();
                            openModal('startContainer', { userRecord, containerRecord });
                          }}
                        >
                          启动
                        </Button>
                        <Button
                          size="small"
                          danger
                          disabled={status !== 'online' || !!containerActionMap[`stop-${cid}`]}
                          loading={!!containerActionMap[`stop-${cid}`]}
                          onClick={(event) => {
                            event.stopPropagation();
                            openModal('stopContainer', { userRecord, containerRecord });
                          }}
                        >
                          停止
                        </Button>
                        <Button
                          size="small"
                          disabled={status !== 'online' || !!containerActionMap[`restart-${cid}`]}
                          loading={!!containerActionMap[`restart-${cid}`]}
                          onClick={(event) => {
                            event.stopPropagation();
                            openModal('restartContainer', { userRecord, containerRecord });
                          }}
                        >
                          重启
                        </Button>
                      </>
                    );
                  })()}
                  {String(containerRecord.userRole || '').toUpperCase() === 'ROOT' ? (
                    <Button size="small" disabled>不可解除</Button>
                  ) : (
                    <Button
                      size="small"
                      danger
                      onClick={(event) => {
                        event.stopPropagation();
                        handleRemoveUserFromContainer(userRecord.username, containerRecord);
                      }}
                    >
                      解除
                    </Button>
                  )}
                </div>
              </article>
            )}
            renderEmptySlot={(record, index) => {
              const entry = containerMap[String(record.key)] || {};
              const label = entry.loading ? '加载容器中' : (index === 0 ? '暂无容器' : '空位');
              return (
                <div className="fuxi-nested-child-card fuxi-nested-child-card-empty">
                  <Typography.Text type="secondary">{label}</Typography.Text>
                </div>
              );
            }}
            renderFooter={(record) => {
              const entry = containerMap[String(record.key)] || {};
              return (
                <>
                  <Typography.Text type="secondary">
                  切换表格视图可编辑用户与长期容器
                  </Typography.Text>
                  <div className="fuxi-nested-pager">
                    <Button
                      size="small"
                      disabled={entry.loading || (entry.page ?? 0) <= 0}
                      onClick={(event) => {
                        event.stopPropagation();
                        fetchContainersForUser(record.key, (entry.page || 0) - 1);
                      }}
                    >
                      上一页
                    </Button>
                    <Typography.Text type="secondary">
                      {(entry.page ?? 0) + 1} / {entry.total_page || 1}
                    </Typography.Text>
                    <Button
                      size="small"
                      disabled={entry.loading || (entry.page ?? 0) + 1 >= (entry.total_page || 1)}
                      onClick={(event) => {
                        event.stopPropagation();
                        fetchContainersForUser(record.key, (entry.page || 0) + 1);
                      }}
                    >
                      下一页
                    </Button>
                  </div>
                </>
              );
            }}
          />
          ) : (
            <ManageUserInTable
              dataSource={filteredUserData}
              usersLoading={usersLoading}
              expandedRowKeys={expandedRowKeys}
              setExpandedRowKeys={setExpandedRowKeys}
              selectedRowKey={selectedRowKey}
              setSelectedRowKey={setSelectedRowKey}
              fetchContainersForUser={fetchContainersForUser}
              getUserContainers={getUserContainers}
              containerMap={containerMap}
              longTermUpdatingMap={longTermUpdatingMap}
              handleLongTermChange={handleLongTermChange}
              handleRemoveUserFromContainer={handleRemoveUserFromContainer}
              handleDeleteUser={handleDeleteUser}
              handleResetPassword={handleResetPassword}
              showUserGroupsAction={hasPermission('rbac:manage')}
              handleOpenUserGroups={openUserGroupsModal}
              toggleExpand={toggleExpand}
              renderContainerStatus={renderContainerStatus}
              renderContainerRoleTag={renderContainerRoleTag}
              EditUserRow={EditUserRow}
            />
          )}
        </section>

        {/* 用户 ↔ 权限组（生效权限 = 各组权限点并集；入口仅 rbac:manage 可见） */}
        <Modal
          title={userGroupModal.user ? `权限组 - ${userGroupModal.user.username || ('#' + userGroupModal.user.key)}` : '权限组'}
          open={userGroupModal.visible}
          onCancel={closeUserGroupsModal}
          width={520}
          footer={
            <Space>
              <Button onClick={closeUserGroupsModal} disabled={userGroupModal.saving}>取消</Button>
              <Button type="primary" loading={userGroupModal.saving} onClick={handleSaveUserGroups}>保存</Button>
            </Space>
          }
        >
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            <Typography.Text type="secondary">
              用户生效权限 = 所选权限组权限点的并集；不勾选任何组 = 收回全部组权限（后端会拦截对自己 rbac:manage 的自锁操作）。
            </Typography.Text>
            {userGroupModal.loading ? (
              <Typography.Text type="secondary">加载中…</Typography.Text>
            ) : userGroupModal.allGroups.length === 0 ? (
              <Typography.Text type="secondary">暂无权限组</Typography.Text>
            ) : (
              <Checkbox.Group
                style={{ width: '100%' }}
                value={userGroupModal.selectedIds}
                onChange={(values) => setUserGroupModal(prev => ({ ...prev, selectedIds: values }))}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {userGroupModal.allGroups.map(g => (
                    <div key={g.id} style={{ border: '1px solid #f0f0f0', borderRadius: 8, padding: '8px 12px', background: '#fafafa' }}>
                      <Checkbox value={g.id}>
                        <Typography.Text strong>{g.name}</Typography.Text>
                      </Checkbox>
                      <Typography.Text type="secondary" style={{ display: 'block', marginLeft: 24 }}>
                        {g.description ? `${g.description} · ` : ''}{g.entityCount} 个权限点
                      </Typography.Text>
                    </div>
                  ))}
                </div>
              </Checkbox.Group>
            )}
          </Space>
        </Modal>
      </div>
    </>
  );
};

export default ManageUser;
