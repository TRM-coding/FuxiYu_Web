import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Popconfirm, Spin, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { cleanDeletedContainerMount, listDeletedContainers } from '../api/container_api';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import showErrorModal from '../utils/showErrorModal';
import './DeletedContainers.css';

const formatTime = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
};

const statusTag = (record) => {
  if (!record.mount_path) return <Tag>无挂载</Tag>;
  if (record.cleaned_at) return <Tag color="red">mount 已删除</Tag>;
  if (record.cleanup_escalation) return <Tag color="orange">升级清理</Tag>;
  return <Tag color="green">mount 保留</Tag>;
};

export default function DeletedContainers() {
  const navigate = useNavigate();
  const { hasPermission, loaded } = usePermission();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cleaningId, setCleaningId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);

  const canManageContainers = hasPermission('container:manage');

  const loadRecords = useCallback(async () => {
    if (!canManageContainers) return;
    setLoading(true);
    try {
      const res = await listDeletedContainers({ page_number: page, page_size: pageSize });
      setRecords(Array.isArray(res?.records) ? res.records : []);
      setTotal(Number(res?.total_number || 0));
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '读取已删除容器失败',
        message: err?.body?.message || err?.message || '无法读取已删除容器',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setLoading(false);
    }
  }, [canManageContainers, navigate, page, pageSize]);

  useEffect(() => {
    if (!loaded) return;
    if (!canManageContainers) {
      setLoading(false);
      return;
    }
    loadRecords();
  }, [loaded, canManageContainers, loadRecords]);

  const cleanMount = async (record) => {
    if (!record?.mount_cleanup_id) return;
    setCleaningId(record.mount_cleanup_id);
    try {
      await cleanDeletedContainerMount(record.mount_cleanup_id);
      message.success('mount 已清理');
      await loadRecords();
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '清理 mount 失败',
        message: err?.body?.message || err?.message || '无法清理 mount',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setCleaningId(null);
    }
  };

  const columns = useMemo(() => [
    {
      title: '容器',
      dataIndex: 'container_name',
      key: 'container_name',
      render: (_, record) => (
        <div className="deleted-container-cell">
          <Typography.Text strong>{record.container_name || '-'}</Typography.Text>
          <Typography.Text type="secondary">ID {record.original_container_id ?? '-'}</Typography.Text>
        </div>
      ),
    },
    {
      title: '机器',
      key: 'machine',
      render: (_, record) => (
        <div className="deleted-container-cell">
          <Typography.Text>{record.machine_name || '-'}</Typography.Text>
          <Typography.Text type="secondary">{record.machine_ip || '-'}</Typography.Text>
        </div>
      ),
    },
    {
      title: '镜像',
      dataIndex: 'image',
      key: 'image',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: 'Mount',
      dataIndex: 'mount_path',
      key: 'mount_path',
      ellipsis: true,
      render: (value) => value || '-',
    },
    {
      title: '删除时间',
      dataIndex: 'removed_at',
      key: 'removed_at',
      render: formatTime,
    },
    {
      title: '状态',
      key: 'status',
      render: (_, record) => statusTag(record),
    },
    {
      title: '操作',
      key: 'actions',
      width: 140,
      render: (_, record) => {
        const disabled = !record.mount_cleanup_id || Boolean(record.cleaned_at);
        return (
          <Popconfirm
            title="确认清理该 mount？"
            description="清理后原目录数据不可再用于恢复。"
            okText="清理"
            cancelText="取消"
            disabled={disabled}
            onConfirm={() => cleanMount(record)}
          >
            <Button
              danger
              size="small"
              disabled={disabled}
              loading={cleaningId === record.mount_cleanup_id}
            >
              清理 mount
            </Button>
          </Popconfirm>
        );
      },
    },
  ], [cleaningId]);

  const expandedRowRender = (record) => {
    const snapshot = record.snapshot || {};
    const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
    return (
      <div className="deleted-container-detail">
        <div>
          <span>资源</span>
          <strong>
            CPU {snapshot.cpu_number ?? '-'} / 内存 {snapshot.memory_gb ?? '-'}G / GPU {snapshot.gpu_number ?? '-'} / 共享 {snapshot.shared_gb ?? '-'}G
          </strong>
        </div>
        <div>
          <span>端口</span>
          <strong>{snapshot.port ?? '-'}</strong>
        </div>
        <div>
          <span>删除来源</span>
          <strong>{record.removed_trigger || '-'}</strong>
        </div>
        <div>
          <span>账号</span>
          <strong>{accounts.length ? accounts.map(item => `${item.system_username || item.user_id}:${item.role || '-'}`).join('，') : '-'}</strong>
        </div>
      </div>
    );
  };

  if (loaded && !canManageContainers) {
    return (
      <div className="deleted-containers-page">
        <div className="deleted-containers-denied">403 - 无容器管理权限</div>
      </div>
    );
  }

  return (
    <div className="deleted-containers-page">
      <div className="deleted-containers-toolbar">
        <div>
          <Typography.Title level={2} className="deleted-containers-title">
            <DeleteOutlined />
            已删除容器
          </Typography.Title>
          <Typography.Text type="secondary">查看已删除容器的 mount 保留状态，并手动清理残留目录。</Typography.Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={loadRecords} disabled={loading || cleaningId !== null}>
          刷新
        </Button>
      </div>

      <Spin spinning={loading}>
        {records.length ? (
          <Table
            rowKey="deleted_id"
            columns={columns}
            dataSource={records}
            expandable={{ expandedRowRender }}
            pagination={{
              current: page,
              pageSize,
              total,
              showSizeChanger: true,
              onChange: (nextPage, nextPageSize) => {
                setPage(nextPage);
                setPageSize(nextPageSize);
              },
            }}
          />
        ) : (
          <Empty description="暂无已删除容器" />
        )}
      </Spin>
    </div>
  );
}
