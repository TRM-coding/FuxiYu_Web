import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { Card, Typography, Row, Col, List, Space, Tag } from 'antd';
import { CheckCircleOutlined } from '@ant-design/icons';
import './About.css';

export default function About() {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
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
        // 401: clear auth and navigate to login
        handleAuthError(401, navigate);
      }
    };
    checkAuth();
  }, [navigate]);

  return (
    <div className="about-wrap">
      <Card className="about-card" bordered>
        <Row gutter={24} align="middle">
          <Col xs={24} md={16}>
            <Space direction="vertical" size="small" className="about-space">
              <Typography.Title level={2} className="about-title">伏羲·御</Typography.Title>
              <Typography.Paragraph className="about-paragraph">
                伏羲·御 是面向算力平台的 Docker 化集群管理与自助使用系统。系统将物理服务器纳入统一的“控制面”，用户通过申请到的 Docker 实例直接操作实体机，配套可视化的基础环境配置（例如网络、用户与权限配置等），免去繁琐的安装与踩坑流程，友好地面向 Linux 新手与多用户场景。
              </Typography.Paragraph>
            </Space>
            <div className="about-section">
              <Typography.Title level={4} className="about-section-title">核心特性</Typography.Title>
              <List
                dataSource={[
                  '统一节点管理：将多台物理服务器纳入统一控制面，支持批量配置与监控。',
                  '容器即服务：用户通过申请到的 Docker 实例直接使用宿主机算力，隔离且可回收。',
                  '可视化配置：网络、用户与权限的图形化配置界面，降低运维与上手成本。',
                  '多用户与权限治理：支持多角色管理、协作与细粒度访问控制。',
                  '自助与易用：面向教学、科研和企业算力使用场景，减轻管理员负担、提升使用效率。'
                ]}
                renderItem={item => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<CheckCircleOutlined className="about-check-icon" />}
                      title={<span className="about-list-item-title">{item}</span>}
                    />
                  </List.Item>
                )}
              />
            </div>
            <div className="about-section">
              <Typography.Title level={4}>适用对象</Typography.Title>
              <Typography.Paragraph>算力平台管理员、科研/教学用户与运维人员，需要对物理算力进行统一调度与自助使用的团队或组织。</Typography.Paragraph>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}