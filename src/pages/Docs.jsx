import React from 'react';
import { Card, Typography, Table, Tag, Alert, Space } from 'antd';
import './Docs.css';
import { ApplyGuide, HomeGuide } from '../components/docs/Guides';

const { Title, Paragraph, Text } = Typography;

const STATUS_COLUMNS = [
  {
    title: '状态',
    dataIndex: 'status',
    key: 'status',
    render: (_, r) => <Tag color={r.color}>{r.status}</Tag>,
  },
  {
    title: '含义',
    dataIndex: 'meaning',
    key: 'meaning',
  },
  {
    title: '说明',
    dataIndex: 'note',
    key: 'note',
  },
];

const STATUS_ROWS = [
  { key: 1, status: 'creating', color: 'blue', meaning: '创建中', note: '刚提交申请，系统正在宿主机上构建容器，耐心等待即可' },
  { key: 2, status: 'starting', color: 'cyan', meaning: '启动中', note: '容器已构建，正在拉起 SSH 服务，马上可用' },
  { key: 3, status: 'online', color: 'green', meaning: '运行中', note: '可以 SSH 连接使用了' },
  { key: 4, status: 'stopping', color: 'orange', meaning: '停止中', note: '停止指令已发出，等待宿主机执行完毕' },
  { key: 5, status: 'offline', color: 'volcano', meaning: '已停止', note: '容器未运行，点击「启动」恢复' },
  { key: 6, status: 'paused', color: 'volcano', meaning: '磁盘已冻结', note: '磁盘用量超限被冻结，需联系管理员解冻，解冻后有宽限期' },
  { key: 7, status: 'failed', color: 'red', meaning: '异常', note: '创建或操作失败，删除后重新申请即可' },
];

export default function Docs() {
  return (
    <div className="docs-wrap">
      <Card bordered className="docs-card">
        <Title level={2} className="docs-title">使用说明</Title>
        <Paragraph type="secondary">
          面向使用者的快速上手指引，逐项说明每个按钮与输入框的用途。
        </Paragraph>

        {/* ── 容器申请 ─────────────────────────────────────────── */}
        <div className="docs-section">
          <Title level={3}>一、申请容器</Title>
          <Paragraph>
            入口：顶部导航「容器申请」。以下是各按钮、弹窗与输入框的说明：
          </Paragraph>
          <ApplyGuide />
        </div>

        {/* ── 我的容器 ─────────────────────────────────────────── */}
        <div className="docs-section">
          <Title level={3}>二、我的容器</Title>
          <Paragraph>
            入口：顶部导航「我的容器」。以下是各按钮、弹窗与输入框的说明：
          </Paragraph>
          <HomeGuide />

          <Table
            className="docs-status-table"
            columns={STATUS_COLUMNS}
            dataSource={STATUS_ROWS}
            pagination={false}
            size="small"
          />

          <Alert
            className="docs-alert"
            type="info"
            showIcon
            message="协作与长期容器"
            description={
              <Space direction="vertical" size={2}>
                <Text>点容器名称或「查看详情」可打开详情弹窗：邀请同学加入（协作者 / 管理员角色）、变更角色、移除成员。</Text>
                <Text>长期容器：每人限 1 个，设置后不参与自动清理倒计时。</Text>
                <Text>磁盘超限时容器会被冻结（paused），联系管理员解冻，解冻后有宽限期。</Text>
              </Space>
            }
          />
        </div>
      </Card>
    </div>
  );
}
