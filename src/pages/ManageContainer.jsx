import React, { useState, useEffect } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag } from 'antd';
const { Column } = Table;

// 1. 模拟机器数据（对应你的machine数据库）
const machineData = [
  {
    key: '1',
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

// 2. 模拟容器数据（对应你的container数据库，关联machine_id）
const containerData = [
  {
    key: '1',
    name: 'web',
    image: 'nginx:1.25',
    machine_id: '1', // 关联机器ID=1
    container_status: 'online',
    port: 5017
  },
  {
    key: '2',
    name: 'db',
    image: 'mysql:8.0',
    machine_id: '2', // 关联机器ID=2
    container_status: 'maintenance',
    port: 5011
  },
  {
    key: '3',
    name: 'api',
    image: 'python:3.11',
    machine_id: '1', // 关联机器ID=1
    container_status: 'online',
    port: 5012
  },
  {
    key: '4',
    name: 'redis',
    image: 'redis:7.0',
    machine_id: '3', // 关联机器ID=3
    container_status: 'online',
    port: 6379
  }
];

const ManageContainer = () => {
  // --- 状态定义 ---
  // 机器搜索条件
  const [searchMachineName, setSearchMachineName] = useState('');
  const [searchMachineIP, setSearchMachineIP] = useState('');
  // 容器搜索条件
  const [searchContainerName, setSearchContainerName] = useState('');
  // 当前选中的机器ID（默认选第一个机器）
  const [selectedMachineId, setSelectedMachineId] = useState(machineData[0]?.key || '');


  // --- 数据过滤 ---
  // 过滤机器列表
  const filteredMachines = machineData.filter(machine => {
    const matchName = machine.machine_name.toLowerCase().includes(searchMachineName.toLowerCase());
    const matchIP = machine.machine_ip.includes(searchMachineIP);
    return matchName && matchIP;
  });

  // 过滤当前选中机器的容器列表
  const filteredContainers = containerData.filter(container => 
    container.machine_id === selectedMachineId && 
    container.name.toLowerCase().includes(searchContainerName.toLowerCase())
  );


  // --- 辅助函数 ---
  // 渲染机器状态标签
  const renderMachineStatus = (status) => {
    const color = status === 'online' ? 'green' : 'orange';
    return <Tag color={color}>{status === 'online' ? '运行中' : '维护中'}</Tag>;
  };

  // 渲染容器状态标签
  const renderContainerStatus = (status) => {
    const color = status === 'online' ? 'green' : 'red';
    return <Tag color={color}>{status === 'online' ? '运行中' : '维护中'}</Tag>;
  };


  // --- 事件处理 ---
  // 点击机器“编辑”按钮，切换选中机器
  const handleSelectMachine = (machineId) => {
    setSelectedMachineId(machineId);
  };


  return (
    <Splitter layout="horizontal" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      {/* 左侧：机器列表 */}
      <Splitter.Panel min="55%" max="60%">
        <Splitter layout="vertical" style={{ height: '100vh' }}>
          {/* 机器搜索框 */}
          <Splitter.Panel min="300px" max="30%">
            <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
              <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Row gutter={[16, 16]} justify="center" align="middle">
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器名</Typography.Text>
                      <Input 
                        placeholder="输入机器名" 
                        value={searchMachineName} 
                        onChange={e => setSearchMachineName(e.target.value)} 
                        allowClear 
                        style={{ width: '80%', minWidth: 160 }} 
                      />
                    </Col>
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器IP</Typography.Text>
                      <Input 
                        placeholder="输入IP" 
                        value={searchMachineIP} 
                        onChange={e => setSearchMachineIP(e.target.value)} 
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

          {/* 机器表格 */}
          <Splitter.Panel>
            <Table 
              dataSource={filteredMachines} 
              rowKey="key" 
              style={{ padding: '16px' }} 
              pagination={false}
            >
              <Column title="机器ID" dataIndex="key" key="key" />
              <Column title="机器名" dataIndex="machine_name" key="machine_name" />
              <Column title="机器IP" dataIndex="machine_ip" key="machine_ip" />
              <Column title="机器类型" dataIndex="machine_type" key="machine_type" />
              <Column title="状态" dataIndex="machine_status" key="machine_status" render={renderMachineStatus} />
              <Column
                title="操作"
                key="action"
                render={(_, record) => (
                  <Space size="middle">
                    {/* 点击“编辑”切换到该机器的容器列表 */}
                    <Button 
                      type="primary" 
                      size="small" 
                      onClick={() => handleSelectMachine(record.key)}
                    >
                      编辑
                    </Button>
                    <Button danger size="small">删除</Button>
                  </Space>
                )}
              />
            </Table>
          </Splitter.Panel>
        </Splitter>
      </Splitter.Panel>


      {/* 右侧：当前机器的容器列表 */}
      <Splitter.Panel min="40%" max="45%">
        <Splitter layout="vertical" style={{ height: '100vh' }}>
          {/* 容器搜索框 */}
          <Splitter.Panel min="300px" max="30%">
            <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
              <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  <Row gutter={[16, 16]} justify="center" align="middle">
                    <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                      <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>容器名</Typography.Text>
                      <Input 
                        placeholder="输入容器名" 
                        value={searchContainerName} 
                        onChange={e => setSearchContainerName(e.target.value)} 
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

          {/* 容器表格 */}
          <Splitter.Panel>
            <Typography.Title level={5} style={{ padding: '16px' }}>
              当前机器：{machineData.find(m => m.key === selectedMachineId)?.machine_name || '无'}
            </Typography.Title>
            <Table 
              dataSource={filteredContainers} 
              rowKey="key" 
              style={{ padding: '16px' }} 
              pagination={false}
            >
              <Column title="容器ID" dataIndex="key" key="key" />
              <Column title="容器名" dataIndex="name" key="name" />
              <Column title="镜像" dataIndex="image" key="image" />
              <Column title="端口" dataIndex="port" key="port" />
              <Column title="状态" dataIndex="container_status" key="container_status" render={renderContainerStatus} />
              <Column
                title="操作"
                key="action"
                render={(_, record) => (
                  <Space size="middle">
                    <Button type="primary" size="small">启动</Button>
                    <Button danger size="small">停止</Button>
                    <Button size="small">重启</Button>
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

export default ManageContainer;