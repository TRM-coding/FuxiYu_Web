import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Button, Empty, Modal, Popconfirm, Radio, Spin, Table, Tag, Typography, message } from 'antd';
import { DeleteOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  cleanDeletedContainerMount,
  listDeletedContainers,
  resurrectDeletedContainer,
} from '../api/container_api';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import { dockerfileDiff } from '../utils/dockerfileDiff';
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

// 差异分段的显示名。分段是后端给的（基础镜像 / 业务片段），这里只做翻译。
// 没有平台注入：它两侧都取当下的系统设置，按构造恒等，后端不会把它列为分段。
const SECTION_LABELS = {
  base_image: '基础镜像',
  dockerfile_body: '业务片段',
};

export default function DeletedContainers() {
  const navigate = useNavigate();
  const { hasPermission, loaded } = usePermission();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cleaningId, setCleaningId] = useState(null);
  const [resurrectingId, setResurrectingId] = useState(null);
  // 二选一的内容（来自恢复接口的响应，不是另开的查询接口）。后端不设默认——默认属于
  // 界面，这样"替用户拿主意"这件事发生在用户看得见的地方。
  const [contentChoice, setContentChoice] = useState(null);
  const [chosenSource, setChosenSource] = useState('snapshot');
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

  /**
   * 恢复容器 —— **同一个接口承担两件事**（后端 design D14）。
   *
   * 不带 contentSource 调它：后端要么真的恢复了，要么在"这台容器有两份可选内容"时
   * **不恢复**，而是把两份内容与分段差异放在响应里交回来。后者就弹二选一，选完再带
   * contentSource 调一次。
   *
   * 这样只有一处公布面：容器留痕不是靠一个独立查询接口读出来的，而是要真的发起恢复、
   * 且确实面临二选一时才会返回。
   */
  const resurrectContainer = async (record, contentSource = null) => {
    if (!record?.deleted_id || String(record.deleted_id).startsWith('mount-')) return;
    setResurrectingId(record.deleted_id);
    try {
      const res = await resurrectDeletedContainer(record.deleted_id, contentSource);
      if (res?.requires_choice) {
        // 后端没有恢复，交回两份内容等用户选。
        // 两份文本都在手里，差异在前端算——不再为它多要一个接口。
        setChosenSource('snapshot');
        setContentChoice({
          record,
          choice: res,
          diff: dockerfileDiff(res?.snapshot?.dockerfile, res?.template?.dockerfile),
        });
        return;
      }
      message.success('容器恢复请求已发送');
      setContentChoice(null);
      await loadRecords();
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '恢复容器失败',
        message: err?.body?.message || err?.message || '无法恢复容器',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setResurrectingId(null);
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
      // 与容器列表同一口径：后端由容器行推导（归属标识 + 构建版本戳）。
      // 不再消费快照 JSON 里内嵌的副本——那是把派生值又抄一份再读出来，会与容器行失真。
      dataIndex: 'container_image',
      key: 'container_image',
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
      width: 230,
      render: (_, record) => {
        const cleanDisabled = !record.mount_cleanup_id || Boolean(record.cleaned_at);
        const restoreDisabled = !record.data_recoverable || !record.snapshot || String(record.deleted_id).startsWith('mount-');
        // 灰按钮原因提示：无挂载/已清理的行 hover 时不至于一脸懵
        const restoreTitle = restoreDisabled ? (record.cleaned_at ? 'mount 已清理，数据不可恢复' : '无可用 mount/快照数据，无法恢复') : undefined;
        const cleanTitle = cleanDisabled ? (record.cleaned_at ? 'mount 已清理' : '该容器无 mount 清理记录') : undefined;
        return (
          <div className="deleted-container-actions">
            <Popconfirm
              title="确认恢复该容器？"
              description="恢复会复用保留的 mount 目录，并重新创建容器与用户绑定。"
              okText="恢复"
              cancelText="取消"
              disabled={restoreDisabled}
              onConfirm={() => resurrectContainer(record)}
            >
              <Button
                size="small"
                icon={<RollbackOutlined />}
                title={restoreTitle}
                disabled={restoreDisabled}
                loading={resurrectingId != null && resurrectingId === record.deleted_id}
              >
                恢复
              </Button>
            </Popconfirm>
            <Popconfirm
              title="确认清理该 mount？"
              description="清理后原目录数据不可再用于恢复。"
              okText="清理"
              cancelText="取消"
              disabled={cleanDisabled}
              onConfirm={() => cleanMount(record)}
            >
              <Button
                danger
                size="small"
                title={cleanTitle}
                disabled={cleanDisabled}
                loading={cleaningId != null && cleaningId === record.mount_cleanup_id}
              >
                清理 mount
              </Button>
            </Popconfirm>
          </div>
        );
      },
    },
  ], [cleaningId, resurrectingId]);

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
        <Button icon={<ReloadOutlined />} onClick={loadRecords} disabled={loading || cleaningId !== null || resurrectingId !== null}>
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

      <Modal
        title="恢复内容与删除前不同"
        open={contentChoice != null}
        onCancel={() => setContentChoice(null)}
        onOk={() => resurrectContainer(contentChoice.record, chosenSource)}
        okText="按所选内容恢复"
        cancelText="取消"
        confirmLoading={resurrectingId != null}
        width={720}
        destroyOnHidden
      >
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="该容器所依据的模板在它存活期间被编辑过"
          description="按原快照恢复可拿回删除前的那一份；按当前模板恢复会带上模板后来的改动。"
        />
        {contentChoice?.choice?.sections?.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <Typography.Text strong>变化分布</Typography.Text>
            <div style={{ marginTop: 8 }}>
              {contentChoice.choice.sections.map((section) => (
                <Tag key={section.name} color={section.changed ? 'red' : 'green'}>
                  {SECTION_LABELS[section.name] || section.name}：{section.changed ? '有变化' : '无变化'}
                </Tag>
              ))}
            </div>
          </div>
        )}
        {contentChoice?.diff && (
          <div style={{ marginBottom: 16 }}>
            <Typography.Text strong>逐行差异</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              − 原快照独有（{contentChoice.diff.removed} 行）　+ 当前模板独有（{contentChoice.diff.added} 行）
            </Typography.Text>
            <div className="dc-diff">
              {contentChoice.diff.rows.map((row, idx) => {
                if (row.type === 'skip') {
                  return (
                    <div key={`skip-${idx}`} className="dc-diff-row dc-diff-skip">
                      ⋯ {row.count} 行未变
                    </div>
                  );
                }
                const mark = row.type === 'add' ? '+' : row.type === 'del' ? '−' : ' ';
                return (
                  <div
                    key={`${row.type}-${idx}`}
                    className={`dc-diff-row dc-diff-${row.type}`}
                  >
                    <span className="dc-diff-mark">{mark}</span>
                    <span className="dc-diff-text">{row.text || ' '}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <Radio.Group value={chosenSource} onChange={(e) => setChosenSource(e.target.value)}>
          <Radio.Button value="snapshot">按原快照恢复（推荐）</Radio.Button>
          <Radio.Button value="template">按当前模板恢复</Radio.Button>
        </Radio.Group>
      </Modal>
    </div>
  );
}
