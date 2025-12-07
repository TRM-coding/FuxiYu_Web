import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag } from 'antd';
const { Column } = Table;

// 模拟从数据库获取的机器数据（后续需替换为接口请求）
const machineData = [
  {
    key: '1',          // 对应数据库 id
    machine_name: '服务器A',
    machine_ip: '192.168.1.101',
    machine_type: 'CPU服务器',
    machine_status: 'online',
    cpu_core_number: 16,
    memory_size_gb: 64,
    gpu_number: 0,
    gpu_type: '无',
    disk_size_gb: 2048,
    machine_description: '前端服务部署机器'
  },
  {
    key: '2',
    machine_name: 'GPU工作站B',
    machine_ip: '192.168.1.102',
    machine_type: 'GPU工作站',
    machine_status: 'maintenance',
    cpu_core_number: 32,
    memory_size_gb: 128,
    gpu_number: 2,
    gpu_type: 'NVIDIA RTX 4090',
    disk_size_gb: 4096,
    machine_description: 'AI模型训练机器'
  },
  {
    key: '3',
    machine_name: '存储服务器C',
    machine_ip: '192.168.1.103',
    machine_type: '存储服务器',
    machine_status: 'online',
    cpu_core_number: 8,
    memory_size_gb: 32,
    gpu_number: 0,
    gpu_type: '无',
    disk_size_gb: 16384,
    machine_description: '数据存储节点'
  }
];

const ManageMachine = () => {
  // 机器搜索条件（对应数据库字段）
  const [searchName, setSearchName] = useState('');
  const [searchIP, setSearchIP] = useState('');
  const [searchType, setSearchType] = useState('');

  // 过滤机器数据（根据搜索条件）
  const filteredMachineData = machineData.filter(machine => {
    const matchName = machine.machine_name.toLowerCase().includes(searchName.toLowerCase());
    const matchIP = machine.machine_ip.includes(searchIP);
    const matchType = machine.machine_type.toLowerCase().includes(searchType.toLowerCase());
    return matchName && matchIP && matchType;
  });

  // 机器状态标签（美化展示）
  const renderStatusTag = (status) => {
    let color = '';
    if (status === 'online') color = 'green';
    else if (status === 'maintenance') color = 'orange';
    return <Tag color={color}>{status === 'online' ? '运行中' : '维护中'}</Tag>;
  };

  return (
    <Splitter layout="horizontal" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      {/* 机器管理主面板 */}
      <Splitter.Panel min="100%" max="100%">
        <Splitter layout="vertical" style={{ height: '100vh' }}>
          {/* 搜索区域 */}
          <Splitter.Panel min="300px" max="30%">
            <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
              <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Row gutter={[16, 16]} justify="center" align="middle">
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器名</Typography.Text>
                      <Input 
                        placeholder="输入机器名搜索" 
                        value={searchName} 
                        onChange={e => setSearchName(e.target.value)} 
                        allowClear 
                        style={{ width: '80%', minWidth: 160 }} 
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器IP</Typography.Text>
                      <Input 
                        placeholder="输入IP搜索" 
                        value={searchIP} 
                        onChange={e => setSearchIP(e.target.value)} 
                        allowClear 
                        style={{ width: '80%', minWidth: 160 }} 
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器类型</Typography.Text>
                      <Input 
                        placeholder="输入类型搜索" 
                        value={searchType} 
                        onChange={e => setSearchType(e.target.value)} 
                        allowClear 
                        style={{ width: '80%', minWidth: 160 }} 
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Button type="primary" icon={<SearchOutlined />} style={{ marginTop: '24px' }}>
                        搜索
                      </Button>
                    </Col>
                  </Row>
                </Space>
              </Flex>
            </div>
          </Splitter.Panel>

          {/* 机器表格区域 */}
          <Splitter.Panel>
            <Table 
              dataSource={filteredMachineData} 
              rowKey="key" 
              style={{ padding: '16px' }} 
              pagination={{ pageSize: 5 }} // 分页（可选）
            >
              <Column title="机器ID" dataIndex="key" key="key" />
              <Column title="机器名" dataIndex="machine_name" key="machine_name" />
              <Column title="机器IP" dataIndex="machine_ip" key="machine_ip" />
              <Column title="机器类型" dataIndex="machine_type" key="machine_type" />
              <Column 
                title="机器状态" 
                dataIndex="machine_status" 
                key="machine_status" 
                render={renderStatusTag} 
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
                ellipsis // 内容过长时省略
              />
              <Column
                title="操作"
                key="action"
                render={(_, record) => (
                  <Space size="middle">
                    <a style={{ color: '#1890ff' }}>编辑</a>
                    <a style={{ color: '#ff4d4f' }}>删除</a>
                    <a style={{ color: '#faad14' }}>重启</a>
                  </Space>
                )}
              />
            </Table>
          </Splitter.Panel>
        </Splitter>
      </Splitter.Panel>
    </Splitter>
  );
};

export default ManageMachine;