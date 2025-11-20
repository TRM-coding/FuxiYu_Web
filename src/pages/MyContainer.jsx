import React, { useState } from 'react';
import { SearchOutlined } from '@ant-design/icons';
import { Flex, Splitter, Typography, Row, Col, Button, Input, Space, Table, Tag } from 'antd';
import { Radio } from 'antd';
const { Column, ColumnGroup } = Table;

const Desc = props => (
  <Flex justify="center" align="center" style={{ height: '100%' }}>
    <Typography.Title type="secondary" level={5} style={{ whiteSpace: 'nowrap' }}>
      {props.text}
    </Typography.Title>
  </Flex>
);

const options = [
  { label: '任意', value: 'Any', className: 'label-1' },
  { label: 'CPU', value: 'CPU', title: 'CPU机器', className: 'label-2' },
  { label: 'GPU', value: 'Orange', title: 'GPU机器', className: 'label-3' },
];


// 后续需要改动来源
const data = [
  {
    key: '1',
    machine_name: 'Intel Xeon E5-2670',
    machine_ip: '192.168.1.1',
    machine_type: 'CPU',
    machine_status: 'Active',
    summary: 'CPU machine for compute tasks',
  },
  {
    key: '2',
    machine_name: 'RTX-3090',
    machine_ip: '192.168.1.2',
    machine_type: 'GPU',
    machine_status: 'Active',
    summary: 'GPU machine for ML tasks',
  },
  {
    key: '3',
    machine_name: 'Intel i5-10400',
    machine_ip: '192.168.1.3',
    machine_type: 'CPU',
    machine_status: 'Inactive',
    summary: 'Standby CPU machine',
  },
];

const MyContainer = () => {
  const [value3, setValue3] = useState('Any');
  const [position, setPosition] = useState('end');

  const onChange3 = ({ target: { value } }) => {
    console.log('radio3 checked', value);
    setValue3(value);
  };

  return (
    <Splitter layout="vertical" style={{ height: '100vh', boxShadow: '0 0 10px rgba(0, 0, 0, 0.1)' }}>
      <Splitter.Panel  min="300px" max="30%">
          <div style={{ height: '90%', padding: '15px', overflowY: 'auto', minWidth: 300 }}>
            <Flex vertical justify="center" align="center" style={{ height: '100%' }}>
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
              <Row gutter={[16, 16]} justify="center" align="middle">
                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>设备类型</Typography.Text>
                  <Radio.Group options={options} onChange={onChange3} value={value3} optionType="button" />
                </Col>

                <Col xs={24} sm={12} md={6} style={{ minWidth: 200, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>IP地址</Typography.Text>
                  <Input placeholder="xxx.xxx.xxx.xxx" defaultValue="" allowClear style={{ width: '80%', minWidth: 160 }} />
                </Col>

                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography.Text type="secondary" style={{ display: 'block', marginBottom: '8px', textAlign: 'center' }}>机器ID</Typography.Text>
                  <Input placeholder="机器ID" defaultValue="" style={{ width: '80%', minWidth: 80 }} />
                </Col>
                <Col xs={24} sm={12} md={6} style={{ minWidth: 140, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Button type="primary" icon={<SearchOutlined />} iconPosition={position}>
                  Search
                </Button>
                </Col>

              </Row>
            </Space>
          </Flex>
        </div>
      </Splitter.Panel>
      <Splitter.Panel  min="60%" max="80%">
        <Table dataSource={data} style={{ padding: '16px' }}>
          <Column title="机器名称" dataIndex="machine_name" key="machine_name" render={text => <a>{text}</a>} />
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
          <Column title="机器状态" dataIndex="machine_status" key="machine_status" />
          <Column title="详细信息" dataIndex="summary" key="summary" />
          <Column
            title="操作"
            key="action"
            render={(_, record) => (
              <Space size="middle">
                <a>申请 </a>
                <a>删除</a>
              </Space>
            )}
          />
        </Table>
      </Splitter.Panel>
    </Splitter>
  );
};

export default MyContainer;