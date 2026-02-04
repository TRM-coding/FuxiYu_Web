import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Table, Tag, Radio, Space, Form, InputNumber, message } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
const { Column } = Table;

const options = [
  { label: '任意', value: 'Any', className: 'label-1' },
  { label: 'CPU', value: 'CPU', title: 'CPU机器', className: 'label-2' },
  { label: 'GPU', value: 'GPU', title: 'GPU机器', className: 'label-3' },
];


import { listAllMachineBrefInformation, getDetailInformation } from '../api/machine_api';
import { createContainer } from '../api/container_api';
import ConfirmModal from '../components/ConfirmModal';

// data will be fetched from backend; table will use mapped `tableData` built from API response.

const Apply = () => {
  const navigate = useNavigate();
  const [value3, setValue3] = useState('Any');
  const [searchIp, setSearchIp] = useState('');
  const [searchId, setSearchId] = useState('');
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // 读取当前用户信息，如果缺失则清除 auth 并重定向到登录
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        // 需要同时拥有 name 和 id；如果缺失，先弹提示再清除 auth 并强制登录
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

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInfo, setDetailInfo] = useState(null);
  const [detailError, setDetailError] = useState('');
  // add-container modal states (reuse form from ManageMachine)
  const [addContainerVisible, setAddContainerVisible] = useState(false);
  const [addContainerLoading, setAddContainerLoading] = useState(false);
  const [addContainerForm] = Form.useForm();
  const [addContainerMachineId, setAddContainerMachineId] = useState(null);
  

  const fetchMachines = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      // backend pagination is 0-based (page_number=0 is first page)
      const res = await listAllMachineBrefInformation({ page_number: Math.max(0, p - 1), page_size: ps });
      // backend returns { machines: [...], total_pages: N }
      const items = (res && res.machines) || [];
      setMachines(items);
      // if server provides total_pages compute total items for pagination
      if (res && typeof res.total_pages === 'number') {
        // compute estimated total items
        const totalItems = res.total_pages * ps;
        setTotalCount(totalItems);
      }
    } catch (err) {
      console.error('Failed to fetch machines', err);
      setMachines([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMachines(page, pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, pageSize]);

  

  const openAddContainerModal = (machine) => {
    const mid = machine?.machine_id ?? machine?.key ?? null;
    setAddContainerMachineId(mid);
    addContainerForm.resetFields();
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [] });
    setAddContainerVisible(true);
  };

  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
      setAddContainerLoading(true);
      const machineId = values.machine_id || addContainerMachineId;
      // 使用状态中的 currentUserName 和 currentUserId
      const payload = {
        user_name: currentUserName || '',
        user_id: currentUserId || null,
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

      try {
        await createContainer(payload);
        message.success('容器创建请求已发送');
        setAddContainerVisible(false);
      } catch (err) {
        console.error('createContainer failed', err);
        await showErrorModal({ message: '创建容器失败', status: err?.response?.status || err?.status });
      } finally {
        setAddContainerLoading(false);
      }
    } catch (err) {
      // validation failed; do nothing
    }
  };

  const filteredData = machines
    .map((m, idx) => ({
      key: String(m.machine_id || (page - 1) * pageSize + idx + 1),
      machine_id: m.machine_id,
      machine_name: m.machine_name || m.machine_ip || `machine-${idx + 1}`,
      machine_ip: m.machine_ip || '',
      machine_type: m.machine_type || '',
      machine_status: m.machine_status || '',
      summary: m.summary || '',
    }))
    .filter(item => {
      const matchType = value3 === 'Any' || item.machine_type === value3;
      const matchIp = item.machine_ip.toLowerCase().includes(searchIp.toLowerCase());
      const matchId = item.key.includes(searchId);
      return matchType && matchIp && matchId;
    });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* 顶部筛选区域，贴在导航栏下方 */}
      <div
        style={{
          padding: '16px',
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
          position: 'sticky',
          top: 64,
          zIndex: 10,
        }}
      >
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>设备类型</Typography.Text>
            <Radio.Group 
              options={options} 
              onChange={({ target: { value } }) => setValue3(value)} 
              value={value3} 
              optionType="button" 
            />
          </Col>

          <Col xs={24} sm={12} md={6} style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>IP地址</Typography.Text>
            <Input 
              placeholder="xxx.xxx.xxx.xxx" 
              allowClear 
              value={searchIp}
              onChange={e => setSearchIp(e.target.value)}
              style={{ width: '80%', minWidth: 160 }} 
            />
          </Col>

          <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器ID</Typography.Text>
            <Input 
              placeholder="机器ID" 
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              style={{ width: '80%', minWidth: 80 }} 
            />
          </Col>

          <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', justifyContent: 'center' }}>
            <Button type="primary" icon={<SearchOutlined />} onClick={() => {}}>
              Search
            </Button>
          </Col>
        </Row>
      </div>

      {/* 表格区域，随内容自然伸展 */}
      <div style={{ padding: '16px' }}>
        <Table
          dataSource={filteredData}
          loading={loading}
          pagination={{
            current: page,
            pageSize,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
            // prefer accurate server total when available
            total: typeof totalCount === 'number' ? totalCount : (page * pageSize + (machines.length === pageSize ? pageSize : machines.length)),
          }}
          bordered
        >
          <Column
            title="机器名称"
            dataIndex="machine_name"
            key="machine_name"
            render={(text, record) => (
              <a
                onClick={async () => {
                  const id = record.machine_id || 0;
                  setDetailError('');
                  setDetailInfo(null);
                  setDetailLoading(true);
                  try {
                    const res = await getDetailInformation(id);
                    setDetailInfo(res);
                    setDetailVisible(true);
                  } catch (err) {
                    console.error('Failed to get detail', err);
                    setDetailError(err.message || 'Failed to load details');
                    setDetailVisible(true);
                  } finally {
                    setDetailLoading(false);
                  }
                }}
              >
                {text}
              </a>
            )}
          />
          <Column title="机器ID" dataIndex="key" key="key" />
          <Column title="IP地址" dataIndex="machine_ip" key="machine_ip" />
          <Column
            title="机器类型"
            dataIndex="machine_type"
            key="machine_type"
            render={type => {
              let color = type === 'GPU' ? 'volcano' : 'green';
              return <Tag color={color}>{type.toUpperCase()}</Tag>;
            }}
          />
          <Column
            title="机器状态"
            dataIndex="machine_status"
            key="machine_status"
            render={status => {
              let color = status === 'online' ? 'green' : status === 'offline' ? 'volcano' : 'orange';
              return <Tag color={color}>{status.toUpperCase()}</Tag>;
            }}
          />
          <Column
            title="详细信息"
            key="summary"
            render={(_, record) => (
              <a
                onClick={async () => {
                  const id = record.machine_id || 0;
                  setDetailError('');
                  setDetailInfo(null);
                  setDetailLoading(true);
                  try {
                    const res = await getDetailInformation(id);
                    setDetailInfo(res);
                    setDetailVisible(true);
                  } catch (err) {
                    console.error('Failed to get detail', err);
                    setDetailError(err.message || 'Failed to load details');
                    setDetailVisible(true);
                  } finally {
                    setDetailLoading(false);
                  }
                }}
              >
                查看
              </a>
            )}
          />
          <Column
            title="操作"
            key="action"
            render={(_, record) => (
              record.machine_status === 'online' ? (
                <Space size="middle">
                  <a onClick={() => openAddContainerModal(record)}>申请</a>
                  {/* 此处直接用创建容器的方法 */}
                </Space>
              ) : (
                <span style={{ color: '#999' }}>不可用</span>
              )
            )}
          />
        </Table>
      </div>
      <ConfirmModal
        visible={detailVisible}
        title={detailInfo ? detailInfo.machine_name || '机器详情' : '机器详情'}
        message={detailError || ''}
        content={
          detailInfo ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div>
                <b>IP:</b> {detailInfo.machine_ip}
              </div>
              <div>
                <b>类型:</b> <Tag color={detailInfo.machine_type === 'GPU' ? 'volcano' : 'green'}>{detailInfo.machine_type}</Tag>
              </div>
              <div>
                <b>CPU core 数:</b> {detailInfo.cpu_core_number}
              </div>
              <div>
                <b>GPU 数:</b> {detailInfo.gpu_number} {detailInfo.gpu_type ? `(${detailInfo.gpu_type})` : ''}
              </div>
              <div>
                <b>内存:</b> {detailInfo.memory_size_gb} GB
              </div>
              <div>
                <b>磁盘:</b> {detailInfo.disk_size_gb} GB
              </div>
              <div>
                <b>描述:</b>
                <div style={{ whiteSpace: 'pre-wrap', marginTop: 6 }}>{detailInfo.machine_description}</div>
              </div>
              <div>
                <b>容器:</b> {Array.isArray(detailInfo.containers) ? detailInfo.containers.join(', ') : ''}
              </div>
            </div>
          ) : (
            <div>{detailError || '加载中...'}</div>
          )
        }
        onConfirm={() => setDetailVisible(false)}
        onCancel={() => setDetailVisible(false)}
        loading={detailLoading}
        confirmText="关闭"
        showCancel={false}
      />
      <ConfirmModal
        visible={addContainerVisible}
        title="添加容器"
        message="请填写容器信息并确认添加"
        onConfirm={handleAddContainerConfirm}
        onCancel={() => { setAddContainerVisible(false); setAddContainerMachineId(null); }}
        loading={addContainerLoading}
        confirmText="添加"
        content={
          <Form
            form={addContainerForm}
            layout="vertical"
            initialValues={{ CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [] }}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="NAME" label="容器名" rules={[{ required: true, message: '请输入容器名' }]}>
                  <Input placeholder="容器名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="image" label="镜像地址" rules={[{ required: true, message: '请输入镜像地址' }]}>
                  <Input placeholder="例如：nginx:latest" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="CPU_NUMBER" label="CPU 数量">
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="MEMORY" label="内存 (MB)">
                  <InputNumber min={128} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="machine_id" label="宿主机ID">
                  <Input disabled value={addContainerMachineId || ''} />
                </Form.Item>
              </Col>
              <Col span={12} />
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Form.Item name="public_key" label="公钥 (可选)">
                  <Input.TextArea rows={2} placeholder="可选，用于容器访问的公钥" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        }
      />
    </div>
  );
};

export default Apply;