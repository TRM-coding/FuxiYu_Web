import React from 'react';
import { Modal, Button, Typography, Row, Col, Space, Tag } from 'antd';
import { GlobalOutlined, ClockCircleOutlined, SettingOutlined } from '@ant-design/icons';
import './ContainerDetailModal.css';

const MachineDetailModal = ({ visible, machine, onClose, loading = false }) => {
  if (!machine) return null;

  const statusColor = machine.machine_status === 'online'
    ? 'green'
    : machine.machine_status === 'offline'
      ? 'volcano'
      : 'default';

  return (
    <Modal
      title={'机器详细信息'}
      open={visible}
      onCancel={onClose}
      width="min(750px, calc(100vw - 24px))"
      className="cdm-modal"
      footer={[
        <Button key="close" onClick={onClose}>关闭</Button>
      ]}
      confirmLoading={loading}
    >
      <div className="cdm-body">
        <div className="cdm-header">
          <Typography.Title level={4} className="cdm-title">{machine.machine_name}</Typography.Title>
          <Typography.Text type="secondary">IP: {machine.machine_ip || '-'}</Typography.Text>
        </div>

        <div className="cdm-summary-card">
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">状态</Typography.Text>
                  <Tag color={statusColor}>{(machine.machine_status || '').toUpperCase()}</Tag>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <GlobalOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">机器类型</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{(machine.machine_type || '').toUpperCase() || '-'}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <ClockCircleOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">CPU 核心数</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{machine.cpu_core_number ?? '-'}</Typography.Text>
                </div>
              </Space>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <Space align="start">
                <SettingOutlined className="cdm-icon" />
                <div>
                  <Typography.Text strong className="cdm-item-label">内存 (GB)</Typography.Text>
                  <Typography.Text className="cdm-machine-text">{machine.memory_size_gb ?? '-'} GB</Typography.Text>
                </div>
              </Space>
            </Col>
          </Row>
        </div>

        <div className="cdm-resources-card" style={{ marginTop: 12 }}>
          <Row gutter={[24, 16]}>
            <Col xs={12} sm={12} md={6}>
              <div>
                <Typography.Text strong className="cdm-item-label">最大可分配 CPU</Typography.Text>
                <div><Typography.Text className="cdm-machine-text">{machine.max_cpu_core_number ?? '-'}</Typography.Text></div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <div>
                <Typography.Text strong className="cdm-item-label">最大可分配 GPU</Typography.Text>
                <div><Typography.Text className="cdm-machine-text">{machine.max_gpu_number ?? '-'}</Typography.Text></div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <div>
                <Typography.Text strong className="cdm-item-label">最大可分配内存</Typography.Text>
                <div><Typography.Text className="cdm-machine-text">{machine.max_memory_gb ?? '-'} GB</Typography.Text></div>
              </div>
            </Col>

            <Col xs={12} sm={12} md={6}>
              <div>
                <Typography.Text strong className="cdm-item-label">共享空间 (GB)</Typography.Text>
                <div><Typography.Text className="cdm-machine-text">{machine.max_shared_gb ?? '-'}</Typography.Text></div>
              </div>
            </Col>
          </Row>
        </div>

        <div style={{ marginTop: 12 }}>
          <Row gutter={[24, 16]}>
            <Col xs={24} sm={12} md={12}>
              <Typography.Text strong className="cdm-item-label">GPU 型号</Typography.Text>
              <div><Typography.Text className="cdm-machine-text">{machine.gpu_type || '-'}</Typography.Text></div>
            </Col>
            <Col xs={24} sm={12} md={12}>
              <Typography.Text strong className="cdm-item-label">磁盘 (GB)</Typography.Text>
              <div><Typography.Text className="cdm-machine-text">{machine.disk_size_gb ?? '-'}</Typography.Text></div>
            </Col>
          </Row>
        </div>

        <div style={{ marginTop: 12 }}>
          <Typography.Text strong className="cdm-item-label">描述</Typography.Text>
          <div className="apply-prewrap" style={{ marginTop: 6 }}>{machine.machine_description || '-'}</div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Typography.Text strong className="cdm-item-label">容器</Typography.Text>
          <div style={{ marginTop: 6 }}>{Array.isArray(machine.containers) ? machine.containers.join(', ') : ''}</div>
        </div>
      </div>
    </Modal>
  );
};

export default MachineDetailModal;
