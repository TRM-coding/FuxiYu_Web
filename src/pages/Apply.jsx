import React, { useState, useEffect } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Table, Tag, Radio, Space } from 'antd';
const { Column } = Table;

const options = [
  { label: '任意', value: 'Any', className: 'label-1' },
  { label: 'CPU', value: 'CPU', title: 'CPU机器', className: 'label-2' },
  { label: 'GPU', value: 'GPU', title: 'GPU机器', className: 'label-3' },
];


import { listAllMachineBrefInformation, getDetailInformation } from '../api/machine_api';
import ConfirmModal from '../components/ConfirmModal';

// data will be fetched from backend; table will use mapped `tableData` built from API response.

const Apply = () => {
  const [value3, setValue3] = useState('Any');
  const [searchIp, setSearchIp] = useState('');
  const [searchId, setSearchId] = useState('');

  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(null);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailInfo, setDetailInfo] = useState(null);
  const [detailError, setDetailError] = useState('');

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
          <Column title="机器名称" dataIndex="machine_name" key="machine_name" render={text => <a>{text}</a>} />
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
              <Space size="middle">
                <a>申请 </a>
              </Space>
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
                &nbsp;
                <b>状态:</b> <Tag color={detailInfo.machine_status === 'ONLINE' ? 'green' : detailInfo.machine_status === 'OFFLINE' ? 'volcano' : 'orange'}>{detailInfo.machine_status}</Tag>
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
    </div>
  );
};

export default Apply;