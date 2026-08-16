import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Select, DatePicker, Checkbox, Button, Tag, Space, Table, Progress, message, Segmented } from 'antd';
import { SearchOutlined, ReloadOutlined, LeftOutlined, RightOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import TableComponent from '../components/TableComponent';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation, listAllUserBrefInformation } from '../api/user_api';
import { listOperationLogs, getOperationLogStats } from '../api/operation_log_api';
import './AdminLogs.css';

const { Column } = Table;
const { RangePicker } = DatePicker;

/** 与后端 OperationType 枚举对齐的中文映射（未知值显示原文兜底） */
const OPERATION_TEXT = {
  add_machine: '添加机器',
  remove_machine: '删除机器',
  update_machine: '更新机器',
  add_machine_permission: '授予机器权限',
  remove_machine_permission: '收回机器权限',
  create_container: '创建容器',
  delete_container: '删除容器',
  remove_container: '系统删除容器（磁盘超限）',
  unpause_container: '解冻容器',
  set_long_term: '设置长期容器',
  add_collaborator: '添加协作者',
  remove_collaborator: '移除协作者',
  update_collaborator_role: '变更角色',
  start_container: '启动容器',
  stop_container: '停止容器',
  restart_container: '重启容器',
  register_user: '注册用户',
  change_password: '修改密码',
  delete_user: '删除用户',
  reset_password: '重置密码',
  send_cleanup_reminder: '发送清理提醒',
  pause_container: '冻结容器（磁盘超限）',
};

const TARGET_TEXT = { machine: '机器', container: '容器', user: '用户' };

/** detail 字段名 → 可读中文（未知字段显示原文） */
const FIELD_TEXT = {
  machine_status: '机器状态',
  machine_name: '机器名',
  machine_ip: '机器 IP',
  name: '名称',
  ip: 'IP',
  image: '镜像',
  port: '端口',
  memory_gb: '内存 (GB)',
  cpu_number: 'CPU 核数',
  gpu_number: 'GPU 卡数',
  max_shared_gb: '最大共享 (GB)',
  max_memory_gb: '最大内存 (GB)',
  max_gpu_number: '最大 GPU',
  max_cpu_core_number: '最大 CPU',
  disk_size_gb: '磁盘 (GB)',
  container_name: '容器名',
  container_id: '容器ID',
  user_id: '用户ID',
  username: '用户名',
  recipient: '收件人',
  threshold: '提醒档位',
  cleanup_at: '预计清理时间',
  role: '角色',
  old_role: '旧角色',
  new_role: '新角色',
  is_long_term: '长期容器',
  trigger: '触发来源',
  deleted: '已删除',
  reason: '原因',
  usage: '用量',
  days_frozen: '冻结天数',
};

/** 状态值 → 可读中文 */
const STATUS_TEXT = {
  online: '运行中',
  offline: '已停止',
  maintenance: '维护中',
};

const fmtVal = (v) => {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const fmtField = (key) => FIELD_TEXT[key] || key;

const fmtStatusVal = (v) => (typeof v === 'string' && STATUS_TEXT[v.toLowerCase()]) ? STATUS_TEXT[v.toLowerCase()] : fmtVal(v);

/** 展开行详情：before/after 存在时渲染前→后对比，否则结构化键值；可切换原始 JSON */
export const LogDetail = ({ record }) => {
  const [mode, setMode] = React.useState('structured');
  const detail = record.detail;
  const hasDiff = !!detail && typeof detail === 'object' && (detail.before || detail.after);

  const diffFields = React.useMemo(() => {
    if (!hasDiff) return [];
    const keys = new Set([...(Object.keys(detail.before || {})), ...(Object.keys(detail.after || {}))]);
    return Array.from(keys);
  }, [detail, hasDiff]);

  const kvEntries = React.useMemo(() => {
    if (!detail || typeof detail !== 'object' || hasDiff) return [];
    return Object.entries(detail);
  }, [detail, hasDiff]);

  const copyDetail = () => {
    const text = detail ? JSON.stringify(detail, null, 2) : '（无详情）';
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(
        () => message.success('详情已复制'),
        () => message.error('复制失败'),
      );
    } else {
      message.error('当前浏览器不支持复制');
    }
  };

  return (
    <div className="admin-logs-detail-wrap">
      <Space size={8} className="admin-logs-detail-toolbar">
        <Segmented
          size="small"
          value={mode}
          onChange={setMode}
          options={[
            { label: '结构化', value: 'structured' },
            { label: '原始 JSON', value: 'raw' },
          ]}
        />
        <Button size="small" icon={<CopyOutlined />} onClick={copyDetail}>复制详情</Button>
      </Space>

      {mode === 'raw' ? (
        <pre className="admin-logs-detail">
          {detail ? JSON.stringify(detail, null, 2) : '（无详情）'}
          {record.error_reason ? `\nerror_reason: ${record.error_reason}` : ''}
        </pre>
      ) : hasDiff ? (
        <div className="admin-logs-diff">
          {diffFields.map(f => {
            const before = detail.before ? detail.before[f] : null;
            const after = detail.after ? detail.after[f] : null;
            const changed = fmtVal(before) !== fmtVal(after);
            const isStatus = f === 'machine_status';
            return (
              <div key={f} className={`admin-logs-diff-row${changed ? ' is-changed' : ''}`}>
                <span className="diff-label">{fmtField(f)}</span>
                <span className="diff-val diff-before">{isStatus ? fmtStatusVal(before) : fmtVal(before)}</span>
                <span className="diff-arrow">→</span>
                <span className="diff-val diff-after">{isStatus ? fmtStatusVal(after) : fmtVal(after)}</span>
              </div>
            );
          })}
          {record.error_reason ? (
            <div className="admin-logs-error">error_reason: {record.error_reason}</div>
          ) : null}
        </div>
      ) : (
        <div className="admin-logs-kv">
          {kvEntries.length === 0 && <Typography.Text type="secondary">（无详情）</Typography.Text>}
          {kvEntries.map(([k, v]) => (
            <div key={k} className="admin-logs-kv-row">
              <span className="kv-label">{fmtField(k)}</span>
              <span className="kv-value">{fmtVal(v)}</span>
            </div>
          ))}
          {record.error_reason ? (
            <div className="admin-logs-error">error_reason: {record.error_reason}</div>
          ) : null}
        </div>
      )}
    </div>
  );
};

/** 目标跳转：管理侧对应页面，带 focus 参数（页面后续可据此定位） */
const targetLink = (targetType, targetId) => {
  if (targetType === 'machine') return `/admin/machines?focus_machine=${targetId}`;
  if (targetType === 'container') return `/admin/machines?focus_container=${targetId}`;
  if (targetType === 'user') return `/admin/users?focus_user=${targetId}`;
  return null;
};

/** 本地时间 → naive UTC 字符串（与库内 created_at 口径一致） */
const toUtcStr = (d) => {
  const dt = d.toDate();
  return new Date(dt.getTime() - dt.getTimezoneOffset() * 60000).toISOString().slice(0, 19);
};

const formatTime = (v) => {
  if (!v) return '-';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleString('zh-CN', { hour12: false });
};

/** 周一为一周起点 */
const startOfWeek = (d) => {
  const dt = d.startOf('day');
  return dt.subtract((dt.day() + 6) % 7, 'day');
};

export default function AdminLogs() {
  const navigate = useNavigate();

  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);

  const [operation, setOperation] = useState(undefined);
  const [targetType, setTargetType] = useState(undefined);
  const [operatorUserId, setOperatorUserId] = useState(undefined);
  const [onlyFailed, setOnlyFailed] = useState(false);
  // 周次浏览：0=本周，负数为上周，RangePicker 手动选范围后 weekOffset 不再自动对齐
  const [weekOffset, setWeekOffset] = useState(0);
  const [timeRange, setTimeRange] = useState(() => {
    const ws = startOfWeek(dayjs());
    return [ws, ws.add(6, 'day').endOf('day')];
  });

  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [permitted, setPermitted] = useState(false);

  const userMap = useMemo(() => {
    const m = {};
    users.forEach(u => { m[String(u.id)] = u.username || u.name || String(u.id); });
    return m;
  }, [users]);

  const weekLabel = useMemo(() => {
    if (!timeRange || !timeRange[0]) return '';
    const ws = startOfWeek(timeRange[0]);
    return `${ws.format('YYYY-MM-DD')} ~ ${ws.add(6, 'day').format('YYYY-MM-DD')}`;
  }, [timeRange]);

  // auth + operator 门禁（与 ManageUser 同模式）
  useEffect(() => {
    const checkAuthAndPerm = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        if (!name || !id) {
          await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          handleAuthError(401, navigate);
          return;
        }
        const res = await getUserDetailInformation(Number(id));
        const info = (res && (res.user_info || res.data)) || res || {};
        const isOperator = info.is_operator === true || info.role === 'operator' || info.permission === 'operator' || (Array.isArray(info.permissions) && info.permissions.includes('operator')) || (typeof info.permissions === 'string' && info.permissions.includes('operator'));
        if (!isOperator) {
          await showErrorModal({ title: '权限不足', message: '需要操作员权限', status: 403 });
          handleAuthError(403, navigate);
          return;
        }
        setPermitted(true);
        try {
          const ures = await listAllUserBrefInformation({ page_number: 0, page_size: 500 });
          const items = (ures && (ures.users || ures.users_info || ures.data || ures.users_list)) || [];
          setUsers(items.map(u => ({ id: u.user_id || u.id || u.uid, username: u.username || u.name || String(u.id) })));
        } catch (e) {
          // 用户列表拉取失败不阻塞页面
        }
      } catch (e) {
        await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
        handleAuthError(401, navigate);
      }
    };
    checkAuthAndPerm();
  }, [navigate]);

  const load = useCallback(async (p, ps, rangeOverride) => {
    setLoading(true);
    const range = rangeOverride || timeRange;
    try {
      const params = { page: p, page_size: ps };
      if (operation) params.operation = operation;
      if (targetType) params.target_type = targetType;
      if (operatorUserId) params.operator_user_id = operatorUserId;
      if (onlyFailed) params.success = 'false';
      if (range && range[0] && range[1]) {
        params.start = toUtcStr(range[0]);
        params.end = toUtcStr(range[1]);
      }
      const res = await listOperationLogs(params);
      setLogs(res.logs || []);
      setTotalPages(res.total_pages || 0);
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取操作日志失败', status: err?.status, route: err?.route });
    } finally {
      setLoading(false);
    }
  }, [operation, targetType, operatorUserId, onlyFailed, timeRange]);

  const loadStats = useCallback(async (rangeOverride) => {
    const range = rangeOverride || timeRange;
    try {
      const params = {};
      if (range && range[0] && range[1]) {
        params.start = toUtcStr(range[0]);
        params.end = toUtcStr(range[1]);
      }
      const res = await getOperationLogStats(params);
      setStats(res || null);
    } catch (err) {
      setStats(null);
    }
  }, [timeRange]);

  useEffect(() => {
    if (!permitted) return;
    load(page, pageSize);
    loadStats();
  }, [permitted, page, pageSize, load, loadStats]);

  const handleSearch = () => {
    if (page === 1) { load(1, pageSize); loadStats(); }
    else setPage(1);
  };

  const handleReset = () => {
    setOperation(undefined);
    setTargetType(undefined);
    setOperatorUserId(undefined);
    setOnlyFailed(false);
    const ws = startOfWeek(dayjs());
    const range = [ws, ws.add(6, 'day').endOf('day')];
    setWeekOffset(0);
    setTimeRange(range);
    load(1, pageSize, range);
    loadStats(range);
    if (page !== 1) setPage(1);
  };

  /** 按周翻页：上一周 / 下一周 */
  const shiftWeek = (delta) => {
    const base = timeRange && timeRange[0] ? timeRange[0] : dayjs();
    const ws = startOfWeek(base).add(delta, 'week');
    const range = [ws, ws.add(6, 'day').endOf('day')];
    setWeekOffset(wo => wo + delta);
    setTimeRange(range);
    load(1, pageSize, range);
    loadStats(range);
    if (page !== 1) setPage(1);
  };

  const topOperations = useMemo(() => {
    if (!stats || !stats.by_operation) return [];
    const entries = Object.entries(stats.by_operation).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const max = entries.length ? entries[0][1] : 1;
    return entries.map(([op, count]) => ({ op, count, percent: Math.round((count / max) * 100) }));
  }, [stats]);

  return (
    <div className="admin-logs">
      {/* 周次导航 */}
      <div className="admin-logs-week">
        <Space>
          <Button size="small" icon={<LeftOutlined />} onClick={() => shiftWeek(-1)}>上一周</Button>
          <Typography.Text strong>{weekLabel}</Typography.Text>
          <Button size="small" onClick={() => shiftWeek(0)} disabled={weekOffset === 0}>本周</Button>
          <Button size="small" icon={<RightOutlined />} iconPosition="end" onClick={() => shiftWeek(1)}>下一周</Button>
        </Space>
      </div>

      {/* 统计概览 */}
      {stats ? (
        <div className="admin-logs-stats">
          <Row gutter={[16, 12]}>
            <Col xs={8} md={4}>
              <div className="admin-logs-stat-card">
                <div className="admin-logs-stat-num">{stats.total ?? 0}</div>
                <div className="admin-logs-stat-label">总操作数</div>
              </div>
            </Col>
            <Col xs={8} md={4}>
              <div className="admin-logs-stat-card admin-logs-stat-green">
                <div className="admin-logs-stat-num">{stats.succeeded ?? 0}</div>
                <div className="admin-logs-stat-label">成功</div>
              </div>
            </Col>
            <Col xs={8} md={4}>
              <div className="admin-logs-stat-card admin-logs-stat-red">
                <div className="admin-logs-stat-num">{stats.failed ?? 0}</div>
                <div className="admin-logs-stat-label">失败</div>
              </div>
            </Col>
            <Col xs={24} md={12}>
              <div className="admin-logs-bars">
                {topOperations.map(({ op, count, percent }) => (
                  <div key={op} className="admin-logs-bar-row">
                    <span className="admin-logs-bar-label">{OPERATION_TEXT[op] || op}</span>
                    <div className="admin-logs-bar-track">
                      <div className="admin-logs-bar-fill" style={{ width: `${percent}%` }} />
                    </div>
                    <span className="admin-logs-bar-count">{count}</span>
                  </div>
                ))}
                {topOperations.length === 0 && <Typography.Text type="secondary">该时间段暂无操作</Typography.Text>}
              </div>
            </Col>
          </Row>
        </div>
      ) : null}

      {/* 筛选栏 */}
      <div className="admin-logs-filter">
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={12} md={5}>
            <Typography.Text type="secondary" className="admin-logs-label">操作类型</Typography.Text>
            <Select
              allowClear
              placeholder="全部"
              style={{ width: '100%' }}
              value={operation}
              onChange={setOperation}
              options={Object.entries(OPERATION_TEXT).map(([v, label]) => ({ value: v, label }))}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Typography.Text type="secondary" className="admin-logs-label">目标类型</Typography.Text>
            <Select
              allowClear
              placeholder="全部"
              style={{ width: '100%' }}
              value={targetType}
              onChange={setTargetType}
              options={[
                { value: 'machine', label: '机器' },
                { value: 'container', label: '容器' },
                { value: 'user', label: '用户' },
              ]}
            />
          </Col>
          <Col xs={24} sm={12} md={5}>
            <Typography.Text type="secondary" className="admin-logs-label">操作人</Typography.Text>
            <Select
              allowClear
              showSearch
              placeholder="全部（含系统）"
              style={{ width: '100%' }}
              value={operatorUserId}
              onChange={setOperatorUserId}
              options={users.map(u => ({ value: u.id, label: u.username }))}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Typography.Text type="secondary" className="admin-logs-label">时间范围</Typography.Text>
            <RangePicker
              style={{ width: '100%' }}
              value={timeRange}
              onChange={(range) => { setTimeRange(range); if (range) setWeekOffset(0); }}
              showTime={{ format: 'HH:mm' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Space>
              <Checkbox checked={onlyFailed} onChange={e => setOnlyFailed(e.target.checked)}>仅失败</Checkbox>
              <Button type="primary" icon={<SearchOutlined />} onClick={handleSearch}>查询</Button>
              <Button icon={<ReloadOutlined />} onClick={handleReset}>重置</Button>
            </Space>
          </Col>
        </Row>
      </div>

      <div className="admin-logs-table">
        <TableComponent
          dataSource={logs.map(r => ({ ...r, key: r.id }))}
          loading={loading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize,
            total: totalPages * pageSize,
            showSizeChanger: true,
            pageSizeOptions: [20, 50, 100],
            onChange: (p, ps) => { setPage(p); setPageSize(ps); },
          }}
          expandable={{
            expandedRowRender: (record) => <LogDetail record={record} />,
          }}
        >
          <Column
            title="时间"
            dataIndex="created_at"
            key="created_at"
            render={(_, r) => formatTime(r.created_at)}
          />
          <Column
            title="操作人"
            dataIndex="operator_user_id"
            key="operator_user_id"
            render={(_, r) => (
              r.operator_user_id == null
                ? <Tag color="default">系统</Tag>
                : (
                  <a onClick={() => navigate(`/admin/users?focus_user=${r.operator_user_id}`)}>
                    {userMap[String(r.operator_user_id)] || `#${r.operator_user_id}`}
                  </a>
                )
            )}
          />
          <Column
            title="操作"
            dataIndex="operation"
            key="operation"
            render={(_, r) => <Tag color="blue">{OPERATION_TEXT[r.operation] || r.operation}</Tag>}
          />
          <Column
            title="目标"
            dataIndex="target_id"
            key="target_id"
            render={(_, r) => {
              const link = targetLink(r.target_type, r.target_id);
              const label = `${TARGET_TEXT[r.target_type] || r.target_type || '-'} #${r.target_id}`;
              return link ? <a onClick={() => navigate(link)}>{label}</a> : label;
            }}
          />
          <Column
            title="结果"
            dataIndex="success"
            key="success"
            render={(_, r) => (
              r.success
                ? <Tag color="green">成功</Tag>
                : <Tag color="red">失败</Tag>
            )}
          />
          <Column
            title="详情"
            key="detail"
            render={(_, r) => (r.detail ? <Typography.Text type="secondary">▸ 展开</Typography.Text> : '-')}
          />
        </TableComponent>
      </div>
    </div>
  );
}
