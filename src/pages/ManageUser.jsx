import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined, DownOutlined, UpOutlined, ReloadOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Form, DatePicker, Card, Tag, message, InputNumber } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import ConfirmModal from '../components/ConfirmModal';
import { handleAuthError } from '../utils/authHelpers';
import { listAllUserBrefInformation, getUserDetailInformation, deleteUser, updateUser, resetPassword } from '../api/user_api';
import { listAllContainerBrefInformation, getContainerDetailInformation, removeCollaborator } from '../api/container_api';
const { Column } = Table;
import './ManageUser.css';
import TableComponent from '../components/TableComponent';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';

// users and containers will be fetched from backend
const initialUsers = [];

const ManageUser = () => {
  // Inline editor for expanded rows
  const EditUserRow = ({ record }) => {
    const [values, setValues] = React.useState({
      username: record.username ?? '',
      email: record.email ?? '',
      graduation_year: record.graduation_year ?? ''
    });

    const original = React.useRef({ username: record.username ?? '', email: record.email ?? '', graduation_year: record.graduation_year ?? '' });

    const changedFields = React.useMemo(() => {
      const out = {};
      if (String(values.username) !== String(original.current.username)) out.username = values.username;
      if (String(values.email) !== String(original.current.email)) out.email = values.email;
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
        <Form layout="inline" initialValues={{ username: values.username, email: values.email, graduation_year: values.graduation_year }}>
          <Row gutter={[16, 0]} align="middle" className="manage-user-row">
            <Col flex="auto">
              <Form.Item label={<span className={labelClass('username')}>用户名</span>} className="manage-user-form-item">
                <Input value={values.username} onChange={e => setValues(v => ({ ...v, username: e.target.value }))} className="manage-user-input-150" />
              </Form.Item>
            </Col>
            <Col flex="auto">
              <Form.Item label={<span className={labelClass('email')}>邮箱</span>} className="manage-user-form-item">
                <Input value={values.email} onChange={e => setValues(v => ({ ...v, email: e.target.value }))} className="manage-user-input-200" />
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

  // 用户搜索状态
  const [searchUsername, setSearchUsername] = useState('');
  const [searchContainerName, setSearchContainerName] = useState('');
  const [searchEmail, setSearchEmail] = useState('');

  // 展开的行key
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
  // 选中的行 key（用于高亮当前选中行及其展开部分）
  const [selectedRowKey, setSelectedRowKey] = useState(null);

  // fetched users
  const [users, setUsers] = useState(initialUsers);
  const [usersLoading, setUsersLoading] = useState(false);

  // container cache per user id: { [userId]: { loading, data } }
  const [containerMap, setContainerMap] = useState({});
  // matched user ids from top-level container name search
  const [matchedUserIds, setMatchedUserIds] = useState(null);
  // top-level container-name search loading
  const [containerSearchLoading, setContainerSearchLoading] = useState(false);
  const { barRef: searchBarRef, barStyle: searchBarStyle } = useAutoHideTopBar();

  const navigate = useNavigate();

  // auth + permission check: show 401 then redirect if missing; fetch user detail to check operator permission
  React.useEffect(() => {
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

        // fetch user detail to check permissions
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
          // For 403 do NOT clear login info; only navigate to /index
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
        // For 401 clear auth and navigate to login
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndPerm();
  }, [navigate]);

  // load users on mount
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      setUsersLoading(true);
      try {
        const res = await listAllUserBrefInformation({ page_number: 1, page_size: 200 });
        const items = (res && (res.users || res.items || res.data)) || [];
        const mapped = items.map(u => ({
          key: String(u.user_id || u.id || u.uid || u.userId || u.key || ''),
          username: u.username || u.name || u.display_name || String(u.user_id || u.id || u.userId || ''),
          email: u.email || '',
          graduation_year: u.graduation_year || u.year || '',
          // preserve backend-provided container counts for statistics when row is not expanded
          amount_of_container: u.amount_of_container ?? u.amount_of_containers ?? 0,
          amount_of_functional_container: u.amount_of_functional_container ?? 0,
          amount_of_managed_container: u.amount_of_managed_container ?? 0,
        }));
        if (mounted) setUsers(mapped);
      } catch (err) {
        console.error('load users failed', err);
        // if authentication error, clear auth and redirect to login
        const msg = err && err.message ? String(err.message) : '';
        if (msg.toLowerCase().includes('invalid or missing token') || msg.includes('401')) {
          // 401: clear auth and navigate to login
          handleAuthError(401, navigate);
          return;
        }
        await showErrorModal({ message: err?.body || err || (msg ? `加载用户列表失败: ${msg}` : '加载用户列表失败'), status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
      } finally {
        if (mounted) setUsersLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // 通用弹窗状态
  const [modal, setModal] = useState({
    visible: false,
    type: '', // 'save' | 'delete' | 'resetPassword' | 'removeAssociation'
    loading: false,
    data: null,
  });

  // 基础过滤（不含容器名）
  const baseFilteredUserData = users.filter(user => {
    const matchUsername = user.username.toLowerCase().includes(searchUsername.toLowerCase());
    const matchEmail = user.email.toLowerCase().includes(searchEmail.toLowerCase());
    return matchUsername && matchEmail;
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

  // 处理保存用户信息
  const handleSaveUser = (user) => {
    openModal('save', user);
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
    const color = status === 'online' ? 'green' : status === 'maintenance' ? 'orange' : 'red';
    const statusText = status === 'online' ? 'ONLINE' : status === 'maintenance' ? 'MAINTAINANCE' : 'OFFLINE';
    return <Tag color={color}>{statusText}</Tag>;
  };

  // 容器中用户角色标签
  const renderContainerRoleTag = (role) => {
    let color = '';
    let roleText = '';
    switch (role) {
      case 'ADMIN':
        color = 'volcano';
        roleText = '管理员';
        break;
      case 'COLLABORATOR':
        color = 'green';
        roleText = '协作者';
        break;
      case 'ROOT':
        color = 'purple';
        roleText = '超级管理员';
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
  const fetchContainersForUser = async (userId) => {
    if (!userId) return;
    const id = String(userId);
    // avoid duplicate fetch
    //if (containerMap[id]?.loading || containerMap[id]?.data) return;
    setContainerMap(prev => ({ ...prev, [id]: { ...(prev[id] || {}), loading: true, data: [] } }));
    try {
      const res = await listAllContainerBrefInformation({ machine_id: null, user_id: Number(userId), page_number: 0, page_size: 200 });
      const items = (res && (res.containers_info || res.containers)) || [];
      const mapped = items.map((c, idx) => ({
        key: c.container_id ? String(c.container_id) : `c-${idx}`,
        container_name: c.container_name || c.name || `container-${idx}`,
        container_image: c.container_image || '',
        port: c.port ? String(c.port) : (c.port_str || ''),
        container_status: (c.container_status || '').toLowerCase(),
        machine_id: c.machine_id ? String(c.machine_id) : null,
        accounts: c.accounts || [],
      }));
      // fetch detail per container to enrich with image and account role info for this user
      const userObj = users.find(u => String(u.key) === String(userId));
      const username = userObj?.username;
      const detailed = await Promise.all(mapped.map(async (c) => {
        try {
          const detRes = await getContainerDetailInformation(Number(c.key));
          const det = (detRes && (detRes.container_info || detRes.container || detRes.data || detRes.container_detail)) || detRes || null;
          const image = (det && (det.container_image || det.image)) || c.container_image;
          const accounts = det?.accounts || c.accounts || [];
          // accounts expected to be objects with `user_id`/`username`/`role`; map user's role by matching username or user_id
          let userRole = null;
          if (username && accounts && Array.isArray(accounts)) {
            const found = accounts.find(a => {
              if (!a) return false;
              if (typeof a === 'object') {
                return a.username === username || String(a.user_id) === String(userId) || String(a.user_id) === String(userObj?.key);
              }
              return false;
            });
            if (found) userRole = found.role ?? null;
          }
          return {
            ...c,
            container_image: image,
            accounts,
            userRole,
            machine_ip: det?.machine_ip ? det.machine_ip : c.machine_ip,
            machine_id: det?.machine_id ? String(det.machine_id) : c.machine_id,
            cpu_number: det?.cpu_number ?? c.cpu_number ?? null,
            gpu_number: det?.gpu_number ?? c.gpu_number ?? 0,
            memory_gb: det?.memory_gb ?? c.memory_gb ?? null,
            swap_gb: det?.swap_gb ?? c.swap_gb ?? null
          };
        } catch (e) {
          // if detail fetch fails, do not attempt old fallback — keep bref info but no userRole
          return { ...c, accounts: c.accounts || [], userRole: null };
        }
      }));
      setContainerMap(prev => ({ ...prev, [id]: { loading: false, data: detailed } }));
    } catch (err) {
      console.error('fetchContainersForUser failed', userId, err);
      setContainerMap(prev => ({ ...prev, [id]: { loading: false, data: [] } }));
    }
  };

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

  // 顶部“容器名”搜索：全局查找容器 -> 获取 container_id -> 获取 detail -> 收集 accounts 中的 user_id
  const userContainerSearchTokenRef = useRef(0);
  const performUserContainerSearch = async (keywordRaw) => {
    const keyword = (keywordRaw || '').trim().toLowerCase();
    if (!keyword) {
      setMatchedUserIds(null);
      return;
    }
    const myToken = ++userContainerSearchTokenRef.current;
    setContainerSearchLoading(true);
    try {
      const pageSize = 1000;
      const res = await listAllContainerBrefInformation({ machine_id: '', page_number: 0, page_size: pageSize });
      const items = (res && (res.containers_info || res.containers)) || [];
      const matched = items.filter(c => {
        const name = String(c.container_name || c.name || '').toLowerCase();
        return name && name.includes(keyword);
      });
      const limit = 200;
      const toInspect = matched.slice(0, limit);
      const foundUserIds = new Set();
      for (const c of toInspect) {
        if (userContainerSearchTokenRef.current !== myToken) break; // cancelled
        const cid = c.container_id || c.id || c.containerId || c.key;
        if (!cid) continue;
        try {
          // eslint-disable-next-line no-await-in-loop
          const detailRes = await getContainerDetailInformation(cid);
          const detail = (detailRes && (detailRes.container_info || detailRes.container || detailRes.data || detailRes.container_detail)) || detailRes || null;
          const accounts = detail?.accounts || detail?.account_list || c.accounts || [];
          for (const a of accounts) {
            const uid = a?.user_id || a?.userId || a?.id || a?.uid || null;
            if (uid !== null && uid !== undefined && String(uid) !== '') foundUserIds.add(String(uid));
          }
        } catch (e) {
          // ignore per-container detail failure
        }
      }
      if (userContainerSearchTokenRef.current === myToken) {
        setMatchedUserIds(foundUserIds.size ? foundUserIds : new Set());
      }
    } catch (e) {
      console.warn('global container name search failed', e);
      if (userContainerSearchTokenRef.current === myToken) setMatchedUserIds(new Set());
    } finally {
      if (userContainerSearchTokenRef.current === myToken) setContainerSearchLoading(false);
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

      <div className="manage-user-root">
        {/* 1. 搜索区域（固定顶部） */}
        <div ref={searchBarRef} style={searchBarStyle} className="manage-user-search-bar manage-user-auto-hide-bar">
          <Flex justify="center" align="center">
            <Space direction="horizontal" size="middle">
              <Row gutter={[16, 0]} align="middle">
                <Col>
                  <Typography.Text type="secondary">用户名：</Typography.Text>
                  <Input
                    placeholder="输入用户名"
                    value={searchUsername}
                    onChange={e => setSearchUsername(e.target.value)}
                    allowClear
                    className="manage-user-input-120"
                  />
              </Col>
              <Col>
                <Typography.Text type="secondary">容器名：</Typography.Text>
                <Input
                  placeholder="输入容器名"
                  value={searchContainerName}
                  onChange={e => setSearchContainerName(e.target.value)}
                  allowClear
                  className="manage-user-input-120"
                />
              </Col>
              <Col>
                <Typography.Text type="secondary">邮箱：</Typography.Text>
                <Input
                  placeholder="输入邮箱"
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  allowClear
                  className="manage-user-input-120"
                />
              </Col>
              <Col>
                <Button type="primary" icon={<SearchOutlined />} loading={containerSearchLoading} onClick={() => performUserContainerSearch(searchContainerName)}>
                  搜索
                </Button>
              </Col>
            </Row>
          </Space>
        </Flex>
        </div>

      {/* 2. 下方区域：用户表格 */}
        <div className="manage-user-table-wrap">
          <TableComponent
            dataSource={filteredUserData}
            rowKey="key"
            loading={usersLoading}
            pagination={{ pageSize: 10 }}
            bordered
            scroll={{ x: true }}
            expandable={{
              expandedRowKeys,
                onExpandedRowsChange: (expandedKeys) => {
                  setExpandedRowKeys(expandedKeys);
                },
                onExpand: (expanded, record) => {
                  if (expanded) {
                    // record.key is the user id string
                    fetchContainersForUser(record.key);
                  }
                },
              showExpandColumn: false,
                expandedRowRender: (record) => (
                  <div className={"manage-user-expanded" + (String(record.key) === String(selectedRowKey) ? ' manage-user-expanded-selected' : '')}>
                  {/* 编辑功能标题 */}
                  <div className="manage-user-section-title">
                    <Typography.Text strong className="manage-user-section-title-text">
                      编辑用户信息 - {record.username}
                    </Typography.Text>
                  </div>

                  {/* 用户信息编辑卡片 - 紧凑设计 */}
                  <div className="manage-user-edit-card">
                    <EditUserRow record={record} />
                  </div>

                  {/* 用户容器子表格 */}
                  <Card
                    title={(
                      <div className="manage-user-card-title">
                        <span>{record.username} 的容器</span>
                        <Button size="small" onClick={() => fetchContainersForUser(record.key)} icon={<ReloadOutlined />} />
                      </div>
                    )}
                    bordered={true}
                  >
                    {
                      (() => {
                        const id = String(record.key);
                        const childData = getUserContainers(record.username);
                        const loading = !!(containerMap[id] && containerMap[id].loading);
                        return (
                          <TableComponent
                            dataSource={childData}
                            rowKey="key"
                            pagination={childData.length > 5 ? { pageSize: 5 } : false}
                            bordered
                            size="middle"
                            loading={loading}
                          >
                            <Column title="容器ID" dataIndex="key" key="key" />
                            <Column title="容器名称" dataIndex="container_name" key="container_name" />
                            <Column title="容器镜像" dataIndex="container_image" key="container_image" />
                            <Column title="端口" dataIndex="port" key="port" />
                            <Column 
                              title="容器状态" 
                              dataIndex="container_status" 
                              key="container_status" 
                              render={renderContainerStatus}
                            />
                            <Column 
                              title="用户角色" 
                              dataIndex="userRole" 
                              key="userRole" 
                              render={renderContainerRoleTag}
                            />
                            <Column
                              title="操作"
                              key="action"
                              render={(_, containerRecord) => {
                                const role = containerRecord.userRole || containerRecord.role || '';
                                if (String(role).toUpperCase() === 'ROOT') {
                                  return (
                                    <Button size="small" disabled>
                                      不可移除所有者
                                    </Button>
                                  );
                                }
                                return (
                                  <Button 
                                    danger 
                                    size="small"
                                    onClick={() => handleRemoveUserFromContainer(record.username, containerRecord)}
                                  >
                                    移除关联
                                  </Button>
                                );
                              }}
                            />
                          </TableComponent>
                        );
                      })()
                    }
                  </Card>
                </div>
              )
            }}
          rowClassName={(record) => (String(record.key) === String(selectedRowKey) ? 'manage-user-selected-row' : '')}
          onRow={(record) => ({
            onClick: () => {
              try { setSelectedRowKey(String(record.key)); } catch (e) {}
            }
          })}
          >
            <Column title="用户ID" dataIndex="key" key="key" />
            <Column title="用户名" dataIndex="username" key="username" />
            <Column title="邮箱" dataIndex="email" key="email" />
            <Column title="毕业年份" dataIndex="graduation_year" key="graduation_year" />
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
                              className="manage-user-action-edit"
                            >
                              {isExpanded ? '收起编辑' : '编辑用户'}
                            </Button>
                            <Button onClick={() => handleDeleteUser(record)}>
                              <a className="manage-user-action-delete">删除</a>
                            </Button>
                            <Button onClick={() => handleResetPassword(record)}>
                              <a className="manage-user-action-reset">重置密码</a>
                            </Button>
                          </Space>
                        );
                      }}
                    />
            <Column
              title="统计信息"
              key="stats"
              render={(_, record) => {
                // Always use bref counts returned by listAllUserBrefInformation
                const totalContainers = record.amount_of_container ?? record.amountOfContainer ?? (record.containers ? record.containers.length : 0) ?? 0;
                const runningContainers = record.amount_of_functional_container ?? record.amountOfFunctionalContainer ?? 0;
                const managedContainers = record.amount_of_managed_container ?? record.amountOfManagedContainer ?? 0;

                return (
                  <span className="manage-user-stats">
                    <span className="manage-user-stats-key">容器: </span>
                    <span className="manage-user-stats-value-blue">{totalContainers}</span>
                    <span className="manage-user-stats-sep">·</span>
                    <span className="manage-user-stats-key">正常: </span>
                    <span className="manage-user-stats-value-green">{runningContainers}</span>
                    <span className="manage-user-stats-sep">·</span>
                    <span className="manage-user-stats-key">由ta管理: </span>
                    <span className="manage-user-stats-value-yellow">{managedContainers}</span>
                  </span>
                );
              }}
            />
          </TableComponent>
        </div>
      </div>
    </>
  );
};

export default ManageUser;