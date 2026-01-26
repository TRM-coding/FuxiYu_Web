import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Typography, Row, Col, Button, Input, Space, Table, Tag, message } from 'antd';
import { Radio } from 'antd';
import ConfirmModal from '../components/ConfirmModal';
import EditUserModal from '../components/EditUserModal';
import { listAllContainerBrefInformation, getContainerDetailInformation, deleteContainer, removeCollaborator } from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import ContainerDetailModal from '../components/ContainerDetailModal';
const { Column, ColumnGroup } = Table;

const Desc = props => (
  <Flex justify="center" align="center" style={{ height: '100%' }}>
    <Typography.Title type="secondary" level={5} style={{ whiteSpace: 'nowrap' }}>
      {props.text}
    </Typography.Title>
  </Flex>
);


// will be populated from backend
const initialContainers = [];

const Home = () => {
  const [value3, setValue3] = useState('Any');
  const [position, setPosition] = useState('end');
  const navigate = useNavigate();

  // read current user name from localStorage; if missing or error, clear auth and redirect to login
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  useEffect(() => {
    try {
      const name = localStorage.getItem('currentUserName');
      const id = localStorage.getItem('currentUserId');
      // require both name and id; if missing, clear auth and force login
      if (!name || !id) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUserId');
        localStorage.removeItem('currentUserName');
        document.cookie = 'auth_token=; Max-Age=0; path=/';
        navigate('/');
        return;
      }
      setCurrentUserName(name);
      setCurrentUserId(id);
    } catch (e) {
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUserId');
      localStorage.removeItem('currentUserName');
      document.cookie = 'auth_token=; Max-Age=0; path=/';
      navigate('/');
    }
  }, [navigate]);

  // containers state loaded from backend
  const [containers, setContainers] = useState(initialContainers);
  const [loadingContainers, setLoadingContainers] = useState(false);

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
          accounts: c.accounts || [],
        }));
        if (mounted) setContainers(mapped);
      } catch (err) {
        console.error('load containers failed', err);
        message.error('加载容器列表失败');
      } finally {
        if (mounted) setLoadingContainers(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, [currentUserId]);

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
  const [editContainer, setEditContainer] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const openEditModal = (container) => {
    setEditContainer(container);
    setEditVisible(true);
  };

  const closeEditModal = () => {
    setEditVisible(false);
    setEditContainer(null);
  };

  const handleEditSave = (updated) => {
    // update local containers list to reflect edits
    setContainers(prev => prev.map(c => (String(c.key) === String(updated.key) ? { ...c, ...updated } : c)));
    message.success('容器用户信息已保存');
    closeEditModal();
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
    } else if (editVisible) {
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
      message.error('操作失败，请重试');
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
        message.error('未能获取容器详情');
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
      message.error('获取容器详情失败');
      setDetailContainer(container);
      setDetailVisible(true);
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
          <div style={{ background: '#fff2f0', padding: 16, borderRadius: 4, border: '1px solid #ffccc7' }}>
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
          <div style={{ background: '#fffbe6', padding: 16, borderRadius: 4, border: '1px solid #ffe58f' }}>
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
          <div style={{ background: '#fff2f0', padding: 16, borderRadius: 4, border: '1px solid #ffccc7' }}>
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
          <div style={{ background: '#e6f7ff', padding: 16, borderRadius: 4, border: '1px solid #91d5ff' }}>
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
      
      <div style={{ minHeight: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
        <div style={{ padding: '16px', background: '#fafafa' }}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={6}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography.Text type="secondary" style={{ fontSize: '14px' }}>总容器数</Typography.Text>
                <Typography.Title level={2} style={{ margin: '8px 0 0 0', color: '#1890ff' }}>{containers.length}</Typography.Title>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography.Text type="secondary" style={{ fontSize: '14px' }}>运行中</Typography.Text>
                <Typography.Title level={2} style={{ margin: '8px 0 0 0', color: '#52c41a' }}>{containers.filter(c => c.container_status === 'online').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography.Text type="secondary" style={{ fontSize: '14px' }}>维护中</Typography.Text>
                <Typography.Title level={2} style={{ margin: '8px 0 0 0', color: '#faad14' }}>{containers.filter(c => c.container_status === 'maintenance').length}</Typography.Title>
              </div>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <div style={{ background: '#fff', padding: '20px', borderRadius: '8px', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Typography.Text type="secondary" style={{ fontSize: '14px' }}>离线</Typography.Text>
                <Typography.Title level={2} style={{ margin: '8px 0 0 0', color: '#ff4d4f' }}>{containers.filter(c => c.container_status === 'offline').length}</Typography.Title>
              </div>
            </Col>
          </Row>
        </div>
        <div style={{ padding: '16px' }}>
          <Table dataSource={containers} loading={loadingContainers} style={{ padding: '16px' }}>
            <Column title="容器名称" dataIndex="container_name" key="container_name" render={(text, record) => <a onClick={() => openContainerDetail(record)}>{text}</a>} />
            <Column title="容器ID" dataIndex="key" key="key" />
            <Column title="机器ID" dataIndex="machine_id" key="machine_id" />
            <Column
              title="容器状态"
              dataIndex="container_status"
              key="container_status"
              render={status => {
                let color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : 'orange';
                return <Tag color={color}>{String(status).toUpperCase()}</Tag>;
              }}
            />
            <Column title="端口" dataIndex="port" key="port" />
            <Column
              title="操作"
              key="action"
              render={(_, record) => {
                const myRole = getRoleForUser(record.accounts, currentUserName);
                if (myRole === 'ADMIN') {
                  return (
                    <Space size="middle">
                      <a onClick={() => handleInvite(record)}>邀请</a>
                      <a onClick={() => handleDeleteContainer(record)}>删除容器</a>
                    </Space>
                  );
                }
                if (myRole === 'COLLABORATOR') {
                  return (
                    <Space size="middle">
                      <a onClick={() => handleLeave(record)}>退出</a>
                    </Space>
                  );
                }
                // default actions for others
                return (
                  <Space size="middle">
                    <a onClick={() => openContainerDetail(record)}>查看详情</a>
                  </Space>
                );
              }}
            />
          </Table>

          <ContainerDetailModal
            visible={detailVisible}
            container={detailContainer}
            onClose={() => setDetailVisible(false)}
            onDelete={handleDetailDelete}
            onLeave={handleLeave}
            onEdit={openEditModal}
            usersList={usersList}
            currentUserName={currentUserName}
          />

          <EditUserModal
            visible={editVisible}
            container={editContainer}
            onClose={closeEditModal}
            onSave={handleEditSave}
            usersList={usersList}
            usersLoading={usersLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default Home;