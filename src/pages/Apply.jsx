import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SearchOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Table, Tag, Radio, Space, Form, InputNumber, message, Select } from 'antd';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
const { Column } = Table;
import './Apply.css';

import TableComponent from '../components/TableComponent';

const options = [
  { label: '任意', value: 'Any', className: 'label-1' },
  { label: 'CPU', value: 'CPU', title: 'CPU机器', className: 'label-2' },
  { label: 'GPU', value: 'GPU', title: 'GPU机器', className: 'label-3' },
];


import { listAllMachineBrefInformation, getDetailInformation } from '../api/machine_api';
import { isValidName, isValidImageName } from '../utils/validateCmdArg';
import { createContainer } from '../api/container_api';
import { startContainerStatusHeartbeat } from '../utils/heartbeat';
import ConfirmModal from '../components/ConfirmModal';
import MachineDetailModal from '../components/MachineDetailModal';
import useAutoHideTopBar from '../utils/useAutoHideTopBar';

// data will be fetched from backend; table will use mapped `tableData` built from API response.

const Apply = () => {
  const navigate = useNavigate();
  const { barRef: filterBarRef, barStyle: filterBarStyle } = useAutoHideTopBar();
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
  const [addContainerUnsafe, setAddContainerUnsafe] = useState(false);
  const [addContainerMachineType, setAddContainerMachineType] = useState('CPU');
  const [addContainerFieldErrors, setAddContainerFieldErrors] = useState({});
  const addContainerMachine = machines.find(m => String(m.machine_id || m.key) === String(addContainerMachineId));
  

  const fetchMachines = async (p = page, ps = pageSize) => {
    setLoading(true);
    try {
      // backend pagination is 0-based (page_number=0 is first page)
      const res = await listAllMachineBrefInformation({ page_number: Math.max(0, p - 1), page_size: ps });
      // backend returns { machines: [...], total_pages: N }
      const items = (res && Array.isArray(res.machines) ? res.machines : []);
      if (items.length === 0) {
        setMachines([]);
        setTotalCount(0);
        return;
      }
      // try to fetch detail info for each machine to obtain max limits
      try {
        const detailPromises = items.map(it => {
          const id = it.machine_id || 0;
          return getDetailInformation(id).then(d => d || null).catch(() => null);
        });
        const details = await Promise.all(detailPromises);
        const merged = items.map((it, idx) => ({ ...it, ...(details[idx] || {}), machine_status: it.machine_status }));
        setMachines(merged);
      } catch (e) {
        setMachines(items);
      }
      // if server provides total_pages compute total items for pagination
      if (res && typeof res.total_pages === 'number') {
        // compute estimated total items
        const totalItems = res.total_pages * ps;
        setTotalCount(totalItems);
      }
    } catch (err) {
      console.error('Failed to fetch machines', err);
      setMachines([]);
      setTotalCount(0);
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
    setAddContainerFieldErrors({});
    const mtype = (machine && (machine.machine_type || machine.machine_type === 0) ? (machine.machine_type || 'CPU') : 'CPU');
    setAddContainerMachineType((mtype || 'CPU').toUpperCase());
    addContainerForm.setFieldsValue({ machine_id: mid, NAME: '', image: '', CPU_NUMBER: 1, MEMORY: 1, SHARED_MEM: 0, GPU_LIST: [], gpu_number: 0 });
    setAddContainerVisible(true);
  };

  const handleAddContainerConfirm = async () => {
    try {
      const values = await addContainerForm.validateFields();
      // client-side guard: prevent submitting when shared > memory
      try {
        const mem = Number(values.MEMORY || 0);
        const shared = Number(values.SHARED_MEM || 0);
        if (shared > mem) {
          setAddContainerFieldErrors(prev => ({ ...(prev || {}), SHARED_MEM: `共享空间不得大于内存 (${mem} GB)` }));
          message.error('共享空间不得大于内存');
          return;
        }
      } catch (e) {}
      setAddContainerLoading(true);
      const machineId = values.machine_id || addContainerMachineId;
      // 使用状态中的 currentUserName 和 currentUserId
      // build GPU_LIST per machine type
      let gpuList = [];
      try {
        if ((addContainerMachineType || '').toUpperCase() === 'GPU') {
          const gnum = Number(values.gpu_number || 0);
          if (Number.isInteger(gnum) && gnum > 0) gpuList = Array.from({ length: gnum }, (_, i) => i);
          else gpuList = values.GPU_LIST || [];
        } else {
          gpuList = [];
        }
      } catch (e) {
        gpuList = values.GPU_LIST || [];
      }

          const payload = {
        user_name: currentUserName || '',
        user_id: currentUserId || null,
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

      try {
        const res = await createContainer(payload);
        message.success('容器创建请求已发送');
        setAddContainerVisible(false);
        // navigate to Home and pass startHeartbeat request via location state
        try {
          navigate('/index', { state: { startHeartbeat: { machine_id: machineId, container_name: payload.container.NAME } } });
        } catch (e) {
          navigate('/index');
        }
      } catch (err) {
        console.error('createContainer failed', err);
        await showErrorModal({ message: err?.body || err || '创建容器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
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
    <div className="apply-page">
      {/* 顶部筛选区域，贴在导航栏下方 */}
      <div ref={filterBarRef} style={filterBarStyle} className="apply-filter-bar apply-auto-hide-bar">
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={12} md={6} className="apply-filter-col-compact">
            <Typography.Text type="secondary" className="apply-filter-label">设备类型</Typography.Text>
            <Radio.Group 
              options={options} 
              onChange={({ target: { value } }) => setValue3(value)} 
              value={value3} 
              optionType="button" 
            />
          </Col>

          <Col xs={24} sm={12} md={6} className="apply-filter-col-wide">
            <Typography.Text type="secondary" className="apply-filter-label">IP地址</Typography.Text>
            <Input 
              placeholder="XXX.XXX.XXX.XXX" 
              allowClear 
              value={searchIp}
              onChange={e => setSearchIp(e.target.value)}
              className="apply-input-ip" 
            />
          </Col>

          <Col xs={24} sm={12} md={6} className="apply-filter-col-compact">
            <Typography.Text type="secondary" className="apply-filter-label">机器ID</Typography.Text>
            <Input 
              placeholder="机器ID" 
              value={searchId}
              onChange={e => setSearchId(e.target.value)}
              className="apply-input-machine-id" 
            />
          </Col>

          <Col xs={24} sm={12} md={6} className="apply-filter-col-actions">
            <Button type="primary" icon={<SearchOutlined />} onClick={() => {}}>
              Search
            </Button>
          </Col>
        </Row>
      </div>

      {/* 表格区域，随内容自然伸展 */}
      <div className="apply-table-wrapper">
        <TableComponent
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
                      // show immediate info from the list data (use list status)
                      setDetailInfo(record);
                      setDetailVisible(true);
                      setDetailLoading(true);
                      try {
                        const res = await getDetailInformation(id);
                        // merge detail but keep machine_status from list data
                        const merged = { ...(res || {}), ...record, machine_status: record.machine_status };
                        // ensure fields from detail override when present except machine_status
                        const final = { ...merged, machine_status: record.machine_status };
                        setDetailInfo(final);
                      } catch (err) {
                        console.error('Failed to get detail', err);
                        setDetailError(err.message || 'Failed to load details');
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
              let text = status === 'online' ? '运行中' : status === 'offline' ? '已停止' : '维护中';
              return <Tag color={color}>{text}</Tag>;
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
                  // show immediate info from the list data (use list status)
                  setDetailInfo(record);
                  setDetailVisible(true);
                  setDetailLoading(true);
                  try {
                    const res = await getDetailInformation(id);
                    const merged = { ...(res || {}), ...record, machine_status: record.machine_status };
                    const final = { ...merged, machine_status: record.machine_status };
                    setDetailInfo(final);
                  } catch (err) {
                    console.error('Failed to get detail', err);
                    setDetailError(err.message || 'Failed to load details');
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
                <span className="apply-unavailable">不可用</span>
              )
            )}
          />
        </TableComponent>
      </div>
      <MachineDetailModal
        visible={detailVisible}
        machine={detailInfo}
        onClose={() => setDetailVisible(false)}
        loading={detailLoading}
      />
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
            initialValues={{ CPU_NUMBER: 1, MEMORY: 512, GPU_LIST: [] }}
            onValuesChange={(_changed, allVals) => {
                try {
                  const vals = allVals || addContainerForm.getFieldsValue();
                  const name = vals.NAME || '';
                  const image = vals.image || '';
                  const pub = vals.public_key || '';
                  // lazy import to avoid bundler warnings
                  import('../utils/validateCmdArg').then(mod => {
                    const unsafe = mod.anyUnsafe(name, image, pub);
                    setAddContainerUnsafe(Boolean(unsafe));
                  }).catch(() => setAddContainerUnsafe(false));

                  // check numeric limits against machine's max values and show errors
                  const errs = {};
                  const m = addContainerMachine || {};
                  const cpu = Number(vals.CPU_NUMBER || 0);
                  const mem = Number(vals.MEMORY || 0);
                  const shared = Number(vals.SHARED_MEM || 0);
                  const gnum = Number(vals.gpu_number || 0);
                  const maxCpu = m.max_cpu_core_number ?? m.cpu_core_number ?? null;
                  const maxMem = m.max_memory_gb ?? m.memory_size_gb ?? null;
                  const maxShared = m.max_shared_gb ?? m.max_shared_gb ?? m.max_shared_gb ?? null;
                  const maxGpu = m.max_gpu_number ?? m.gpu_number ?? null;
                  if (maxCpu != null && cpu > Number(maxCpu)) errs.CPU_NUMBER = `超出最大 CPU (${maxCpu})`;
                  if (maxMem != null && mem > Number(maxMem)) errs.MEMORY = `超出最大内存 (${maxMem} GB)`;
                  if (maxShared != null && shared > Number(maxShared)) errs.SHARED_MEM = `超出最大共享空间 (${maxShared} GB)`;
                  // shared must not exceed requested memory
                  if (shared > mem) errs.SHARED_MEM = `共享空间不得大于内存 (${mem} GB)`;
                  if (addContainerMachineType === 'GPU' && maxGpu != null && gnum > Number(maxGpu)) errs.gpu_number = `超出最大 GPU (${maxGpu})`;
                  setAddContainerFieldErrors(errs);
                } catch (e) {
                  setAddContainerUnsafe(false);
                  setAddContainerFieldErrors({});
                }
              }}
          >
            <Typography.Text type="secondary">请不要超过宿主机算力/内存/共享空间上限。</Typography.Text>
            <br />
            <br />
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="NAME"
                  label="容器名"
                  rules={[
                    { required: true, message: '请输入容器名' },
                    { max: 115, message: '容器名长度不得超过115个字符' },
                    { validator: (_, value) => isValidName(value) ? Promise.resolve() : Promise.reject(new Error('容器名仅允许英文、数字和下划线')) }
                  ]}
                >
                  <Input placeholder="容器名，允许英文/数字/下划线" maxLength={115} />
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

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="CPU_NUMBER"
                  label={<span>CPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_cpu_core_number ?? addContainerMachine?.cpu_core_number ?? '-'})</span></span>}
                  validateStatus={addContainerFieldErrors.CPU_NUMBER ? 'error' : undefined}
                  help={addContainerFieldErrors.CPU_NUMBER || null}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="MEMORY"
                  label={<span>内存 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_memory_gb ?? addContainerMachine?.memory_size_gb ?? '-'})</span></span>}
                  validateStatus={addContainerFieldErrors.MEMORY ? 'error' : undefined}
                  help={addContainerFieldErrors.MEMORY || null}
                >
                  <InputNumber min={1} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
            </Row>

            {addContainerMachineType === 'GPU' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="gpu_number"
                    label={<span>请求 GPU 数量 <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_gpu_number ?? addContainerMachine?.gpu_number ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.gpu_number ? 'error' : undefined}
                    help={addContainerFieldErrors.gpu_number || null}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    name="SHARED_MEM"
                    label={<span>共享空间 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_shared_gb ?? addContainerMachine?.max_shared_gb ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.SHARED_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SHARED_MEM || null}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>
            )}

            {addContainerMachineType !== 'GPU' && (
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    name="SHARED_MEM"
                    label={<span>共享空间 (GB) <span style={{ color: '#888', fontSize: 12 }}> (限: {addContainerMachine?.max_shared_gb ?? '-'})</span></span>}
                    validateStatus={addContainerFieldErrors.SHARED_MEM ? 'error' : undefined}
                    help={addContainerFieldErrors.SHARED_MEM || null}
                  >
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col span={12} />
              </Row>
            )}

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
                <Form.Item name="public_key" label="公钥 (可选)" rules={[{ max: 495, message: '公钥长度不得超过495个字符' }]}>
                  <Input.TextArea rows={2} placeholder="可选，用于容器访问的公钥" maxLength={495} />
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