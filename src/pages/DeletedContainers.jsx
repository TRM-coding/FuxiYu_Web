import { formatContainerImage, parseServerTime } from '../utils/detailFormat';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Empty, Modal, Popconfirm, Radio, Spin, Tag, Typography, message } from 'antd';
import { DeleteOutlined, ReloadOutlined, RollbackOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import {
  cleanDeletedContainerMount,
  listDeletedContainers,
  resurrectDeletedContainer,
} from '../api/container_api';
import CopyChip from '../components/CopyChip';
import TableComponent from '../components/TableComponent';
import '../components/NestedEntityGrid.css';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import { dockerfileDiff } from '../utils/dockerfileDiff';
import { formatLogicalBytes, isDeletedMountCleaned, isMeasurableDeletedRecord } from '../utils/mountUsage';
import { useDeletedMountUsage } from '../utils/useDeletedMountUsage';
import showErrorModal from '../utils/showErrorModal';
import './DeletedContainers.css';

const formatTime = (value) => {
  if (!value || value === '') return '-';
  // 后端时间戳是**不带时区后缀的 UTC**，必须走 parseServerTime——裸用 new Date 会按
  // 本地时间解析，等于把 UTC 的数值原样显示（差 8 小时）。
  const date = parseServerTime(value);
  if (!date) return String(value);
  return date.toLocaleString('zh-CN', { hour12: false });
};

const pad2 = value => String(value).padStart(2, '0');

// 可见文案只保留 MM-DD HH:mm；完整本地时间放在 title 中，仍按浏览器本地时区换算。
const formatShortMeasureTime = (value) => {
  const date = parseServerTime(value);
  if (!date) return '-';
  return `${pad2(date.getMonth() + 1)}-${pad2(date.getDate())} ${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
};

// 进度条只在下述情况下使用确定比例：记录里已有一个正数比较上限。
// 当前列表契约没有该字段，页面不新增请求/字段，缺省即走无比例成功轨道。
const resolveUsageLimitBytes = (record) => {
  const limit = record?.mount_usage_limit_bytes;
  return Number.isInteger(limit) && limit > 0 ? limit : null;
};


const statusTag = (record) => {
  if (!record.mount_path) return <Tag>无挂载</Tag>;
  // mount_cleaned === true 即使 cleaned_at 为空也算已清理，不能再请求扫描。
  if (isDeletedMountCleaned(record)) return <Tag color="red">已清理</Tag>;
  if (record.cleanup_escalation) return <Tag color="orange">升级清理</Tag>;
  return <Tag color="green">mount 保留</Tag>;
};

// 翻译后端提供的恢复配方分段。
// 没有平台注入：它两侧都取当下的系统设置，按构造恒等，后端不会把它列为分段。
const SECTION_LABELS = {
  base_image: '基础镜像',
  dockerfile_body: '业务片段',
  entrypoint: '启动命令',
};

export default function DeletedContainers() {
  const navigate = useNavigate();
  const { hasPermission, loaded } = usePermission();
  const [records, setRecords] = useState([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState([]);
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
  // 请求参数放 ref：动作回调可能在较早 render 的闭包里触发，也必须按「当前页」取数；
  // 序号用于丢弃迟到响应，避免旧页响应覆盖新页。
  const pageRef = useRef(1);
  const pageSizeRef = useRef(20);
  const requestSeqRef = useRef(0);
  const {
    usageById,
    budgetExhausted,
    start: startMountUsage,
    reset: resetMountUsage,
    invalidate: invalidateMountUsage,
  } = useDeletedMountUsage();

  const canManageContainers = hasPermission('container:manage');

  const loadRecords = useCallback(async (options = {}) => {
    if (!canManageContainers) return;
    const requestedPage = options.page ?? pageRef.current;
    const requestedSize = options.pageSize ?? pageSizeRef.current;
    const silent = options.silent === true;
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    // 新的列表请求一开始就让旧统计失效：abort 在途用量、清计时器、推进代次。
    // 统计只能消费“本次列表成功写入后”的当前页记录。
    resetMountUsage();
    if (!silent) setLoading(true);
    const fetchPage = async (nextPage) => {
      const res = await listDeletedContainers({ page_number: nextPage, page_size: requestedSize });
      return {
        list: Array.isArray(res?.records) ? res.records : [],
        total: Number(res?.total_number || 0),
        totalPage: Number(res?.total_page || 0),
      };
    };
    try {
      let current = await fetchPage(requestedPage);
      if (seq !== requestSeqRef.current) return; // 迟到响应：让更新的请求赢
      let appliedPage = requestedPage;
      if (current.list.length === 0 && requestedPage > 1) {
        // 越界空页才回退：优先用权威 total_page，缺失/0 时按 total_number 与页大小推算，只重取一次。
        const derivedLastPage = requestedSize > 0 ? Math.max(1, Math.ceil(current.total / requestedSize)) : 1;
        const lastPage = current.totalPage > 0 ? current.totalPage : derivedLastPage;
        if (requestedPage > lastPage) {
          appliedPage = lastPage;
          current = await fetchPage(lastPage);
          if (seq !== requestSeqRef.current) return;
        }
      }
      pageRef.current = appliedPage;
      pageSizeRef.current = requestedSize;
      setPage(appliedPage);
      setPageSize(requestedSize);
      setRecords(current.list);
      setTotal(current.total);
      // 列表先渲染；统计异步到达，失败/超时都不回写列表或分页。
      startMountUsage(current.list, `${appliedPage}:${requestedSize}`);
    } catch (err) {
      if (seq !== requestSeqRef.current) return;
      if (err?.status === 401) {
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
      if (!silent && seq === requestSeqRef.current) setLoading(false);
    }
  }, [canManageContainers, navigate, resetMountUsage, startMountUsage]);

  useEffect(() => {
    if (!loaded || !canManageContainers) {
      // 权限快照未就绪/被收回时，既有统计计时器与在途请求也必须停止；
      // 同时推进列表请求序号，让旧 list 响应不能在权限变化后重新开启统计。
      resetMountUsage();
      requestSeqRef.current += 1;
      if (!canManageContainers) setLoading(false);
      return;
    }
    loadRecords();
  }, [loaded, canManageContainers, loadRecords, resetMountUsage]);

  const handlePageChange = (nextPage, nextPageSize) => {
    const size = Number(nextPageSize) > 0 ? Number(nextPageSize) : pageSizeRef.current;
    loadRecords({ page: nextPage, pageSize: size });
  };

  const cleanMount = async (record) => {
    if (!record?.mount_cleanup_id) return;
    // 清理一开始就丢弃该页旧统计与在途响应；失败后也不把旧 bytes 贴回来。
    invalidateMountUsage();
    setCleaningId(record.mount_cleanup_id);
    try {
      await cleanDeletedContainerMount(record.mount_cleanup_id);
      message.success('mount 已清理');
      await loadRecords();
    } catch (err) {
      if (err?.status === 401) {
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
    // 恢复同样让旧统计立即失效；成功后重载列表，已清理/已恢复行不再扫描。
    invalidateMountUsage();
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
      if (err?.status === 401) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '恢复容器失败',
        // 传整个 body（而非 body.message），让 error_reason 到达 showErrorModal 的映射层。
        message: err?.body || err?.message || '无法恢复容器',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setResurrectingId(null);
    }
  };

  // 用量只影响本行展示：未请求/已清理行沿用列表事实；畸形/缺项/失败一律不可用，
  // 任何非成功路径都不会落到 “0 B”。
  const renderUsageCell = (record) => {
    if (!record.mount_path) return <Typography.Text type="secondary">无挂载</Typography.Text>;
    if (isDeletedMountCleaned(record)) return <Typography.Text type="secondary">已清理</Typography.Text>;
    if (!isMeasurableDeletedRecord(record)) return <Typography.Text type="secondary">统计不可用</Typography.Text>;

    const usage = usageById[record.deleted_id];
    if (!usage) return <Typography.Text type="secondary">统计不可用</Typography.Text>;
    if (usage.status === 'loading') {
      return <span className="deleted-usage-loading">读取统计中</span>;
    }
    if (usage.status === 'pending') {
      return <span className="deleted-usage-loading">测量中</span>;
    }
    if (usage.status === 'success') {
      const size = formatLogicalBytes(usage.bytes);
      if (!size) return <Typography.Text type="secondary">统计不可用</Typography.Text>;
      const limitBytes = resolveUsageLimitBytes(record);
      const percent = limitBytes ? Math.min((usage.bytes / limitBytes) * 100, 100) : null;
      const roundedPercent = percent == null ? null : Number(percent.toFixed(1));
      const progressProps = roundedPercent == null
        ? {
          role: 'progressbar',
          'aria-label': '逻辑用量',
          'aria-valuetext': '已测量，未提供可比上限',
        }
        : {
          role: 'progressbar',
          'aria-label': '逻辑用量',
          'aria-valuemin': 0,
          'aria-valuemax': 100,
          'aria-valuenow': roundedPercent,
          'aria-valuetext': `${size}，比较上限 ${formatLogicalBytes(limitBytes)}`,
        };
      return (
        <div className="deleted-usage-cell">
          <Typography.Text strong title="du -sb 逻辑大小，非物理磁盘块占用">{size}</Typography.Text>
          <div className="fuxi-nested-child-disk-line deleted-usage-progress">
            <Typography.Text
              type="secondary"
              className="deleted-usage-meta"
              title={formatTime(usage.measuredAt)}
            >
              测量 {formatShortMeasureTime(usage.measuredAt)}
            </Typography.Text>
            <div
              className={`fuxi-nested-child-disk-track${roundedPercent == null ? ' deleted-usage-track-indeterminate' : ''}`}
              {...progressProps}
            >
              {roundedPercent == null ? null : (
                <div className="fuxi-nested-child-disk-fill" style={{ width: `${roundedPercent}%` }} />
              )}
            </div>
          </div>
        </div>
      );
    }
    return (
      <Typography.Text type={usage.status === 'error' ? 'danger' : 'secondary'}>
        {usage.message || '统计不可用'}
      </Typography.Text>
    );
  };

  // 不用 useMemo 缓存：动作回调必须跟随当前页/当前筛选，避免旧页闭包被 columns 长期持有。
  const columns = [
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
      title: 'Mount',
      dataIndex: 'mount_path',
      key: 'mount_path',
      className: 'deleted-mount-cell',
      ellipsis: true,
      render: (value) => (
        value ? (
          <CopyChip value={value} size="meta" tone="soft" className="deleted-mount-chip">
            {value}
          </CopyChip>
        ) : <Typography.Text type="secondary">无挂载</Typography.Text>
      ),
    },
    {
      title: '逻辑用量',
      key: 'mount_usage',
      width: 210,
      render: (_, record) => renderUsageCell(record),
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
  ];

  const expandedRowRender = (record) => {
    const snapshot = record.snapshot || {};
    const accounts = Array.isArray(snapshot.accounts) ? snapshot.accounts : [];
    return (
      <div className="deleted-container-detail">
        <div>
          <span>镜像</span>
          <strong>{formatContainerImage(record.image_name)}</strong>
        </div>
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
        <Button icon={<ReloadOutlined />} onClick={() => loadRecords()} disabled={loading || cleaningId !== null || resurrectingId !== null}>
          刷新
        </Button>
      </div>

      {budgetExhausted ? (
        <Alert
          className="deleted-usage-budget-alert"
          type="warning"
          showIcon
          message="测量未完成"
          description="多轮查询仍未完成，已停止自动刷新。可点击“刷新”重新开始一轮统计。"
        />
      ) : null}

      <Spin spinning={loading}>
        {/* 空页也保留 Table 与分页入口：total>0 时当前页可能暂时为空（刚清理/恢复最后一条），
            用户仍能翻回有效页，而不是被 Empty 顶掉。 */}
        <TableComponent
          rowKey="deleted_id"
          columns={columns}
          dataSource={records}
          locale={{ emptyText: <Empty description="暂无已删除容器" /> }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: setExpandedRowKeys,
            expandedRowRender,
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            onChange: handlePageChange,
          }}
        />
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
              − 原快照独有（{contentChoice.diff.removed} 行） + 当前模板独有（{contentChoice.diff.added} 行）
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
