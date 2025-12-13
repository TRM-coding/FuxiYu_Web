import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Typography, Row, Col, Button, Input, Table, Tag, Radio, Space } from 'antd';
const { Column } = Table;

const options = [
  { label: '任意', value: 'Any', className: 'label-1' },
  { label: 'CPU', value: 'CPU', title: 'CPU机器', className: 'label-2' },
  { label: 'GPU', value: 'GPU', title: 'GPU机器', className: 'label-3' },
];


// 后续需要改动来源
const data = [
  {
    key: '1',
    machine_name: 'Intel Xeon E5-2670',
    machine_ip: '192.168.1.1',
    machine_type: 'CPU',
    machine_status: 'online',
    summary: 'CPU machine for compute tasks',
  },
  {
    key: '2',
    machine_name: 'RTX-3090',
    machine_ip: '192.168.1.2',
    machine_type: 'GPU',
    machine_status: 'offline',
    summary: 'GPU machine for ML tasks',
  },
  {
    key: '4',
    machine_name: 'Intel i5-10400',
    machine_ip: '192.168.1.3',
    machine_type: 'CPU',
    machine_status: 'maintenance',
    summary: 'Standby CPU machine',
  },
];

const Apply = () => {
  const [value3, setValue3] = useState('Any');
  const [searchIp, setSearchIp] = useState('');
  const [searchId, setSearchId] = useState('');

  const filteredData = data.filter(item => {
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
        <Table dataSource={filteredData} pagination={{ pageSize: 10 }} bordered>
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
          <Column title="详细信息" dataIndex="summary" key="summary" />
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
    </div>
  );
};

export default Apply;