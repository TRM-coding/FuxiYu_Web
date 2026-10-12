import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Typography, Row, Col, Select, DatePicker, Checkbox, Button, Tag, Space, Table, message, Segmented, Modal, Descriptions } from 'antd';
import { SearchOutlined, ReloadOutlined, LeftOutlined, RightOutlined, CopyOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import TableComponent from '../components/TableComponent';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { getUserDetailInformation, listAllUserBrefInformation } from '../api/user_api';
import { listOperationLogs, getOperationLogStats } from '../api/operation_log_api';
import { getDetailInformation as getMachineDetailInformation } from '../api/machine_api';
import { getContainerDetailInformation } from '../api/container_api';
import MachineDetailModal from '../components/MachineDetailModal';
import ContainerDetailModal from '../components/ContainerDetailModal';
import './AdminLogs.css';

dayjs.extend(utc);
dayjs.extend(timezone);

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
  machine_status_transition: '机器状态变更',
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

/** 用户详情弹窗（日志页专用，只读） */
const UserInfoModal = ({ visible, info, onClose }) => (
  <Modal
    title="用户详情"
    open={visible}
    onCancel={onClose}
    footer={<Button onClick={onClose}>关闭</Button>}
    width="min(480px, calc(100vw - 24px))"
  >
    {info ? (
      <Descriptions column={1} size="small" bordered>
        <Descriptions.Item label="用户名">{info.username || '-'}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{info.email || '-'}</Descriptions.Item>
        <Descriptions.Item label="毕业年份">{info.graduation_year ?? '-'}</Descriptions.Item>
        <Descriptions.Item label="权限">{info.permission === 'operator' ? '操作员 (operator)' : (info.permission || '-')}</Descriptions.Item>
        <Descriptions.Item label="容器总数">{info.amount_of_container ?? 0}</Descriptions.Item>
        <Descriptions.Item label="运行中">{info.amount_of_functional_container ?? 0}</Descriptions.Item>
        <Descriptions.Item label="管理中的容器">{info.amount_of_managed_container ?? 0}</Descriptions.Item>
        <Descriptions.Item label="长期容器">{info.amount_of_long_term_container ?? 0}</Descriptions.Item>
      </Descriptions>
    ) : null}
  </Modal>
);

const fmtVal = (v) => {
  if (v === null || v === undefined) return '-';
  if (typeof v === 'boolean') return v ? '是' : '否';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

const fmtField = (key) => FIELD_TEXT[key] || key;

/** detail 中带时间语义的字段（*_at / *_time）按北京时间展示，其余走 fmtVal */
const TIME_FIELD_RE = /(_at|_time)$/i;
const fmtFieldVal = (key, v) => (
  typeof v === 'string' && TIME_FIELD_RE.test(key) ? formatTime(v) : fmtVal(v)
);

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
                <span className="diff-val diff-before">{isStatus ? fmtStatusVal(before) : fmtFieldVal(f, before)}</span>
                <span className="diff-arrow">→</span>
                <span className="diff-val diff-after">{isStatus ? fmtStatusVal(after) : fmtFieldVal(f, after)}</span>
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
              <span className="kv-value">{fmtFieldVal(k, v)}</span>
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

/** 全站统一 UTC+8 北京时间（无夏令时）：
 *  - BJ_TZ：显示与日期轴（周/天计算）的锚定时区；
 *  - BJ_OFFSET_MINUTES：随请求带给后端，由后端把北京时间解析成库内 naive UTC；
 *  - bjNow()/toBj(d)：把 dayjs 实例归一化到北京时区。 */
const BJ_TZ = 'Asia/Shanghai';
const BJ_OFFSET_MINUTES = 480;
const bjNow = () => dayjs().tz(BJ_TZ);
const toBj = (d) => (d ? dayjs(d).tz(BJ_TZ) : d);

/** 库内 naive UTC → 北京时间（UTC+8，固定，不随浏览器时区）展示 */
const formatTime = (v) => {
  if (!v) return '-';
  const s = String(v);
  const hasZone = s.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(s);
  const d = new Date(hasZone ? s : `${s}Z`);
  if (Number.isNaN(d.getTime())) return s;
  return d.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', hour12: false });
};

/** 周一为一周起点 */
const startOfWeek = (d) => {
  const dt = d.startOf('day');
  return dt.subtract((dt.day() + 6) % 7, 'day');
};

const WEEKDAY_CN = ['一', '二', '三', '四', '五', '六', '日'];

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
  const [timeRange, setTimeRange] = useState(() => {
    const ws = startOfWeek(bjNow());
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
    const ws = startOfWeek(toBj(timeRange[0]));
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
        // 所见即所得：北京时间字面值 + 固定偏移量，交给后端解析
        params.start = toBj(range[0]).format('YYYY-MM-DDTHH:mm:ss');
        params.end = toBj(range[1]).format('YYYY-MM-DDTHH:mm:ss');
        params.tz_offset_minutes = BJ_OFFSET_MINUTES;
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

  // 统计窗口：固定滑动窗口——最近 52 周（364 天，周一开头，本周收尾）
  const statsDays = useMemo(() => {
    const ws = startOfWeek(bjNow());
    return Array.from({ length: 52 * 7 }, (_, i) => ws.subtract(51, 'week').add(i, 'day'));
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const params = {
        start: statsDays[0].format('YYYY-MM-DDTHH:mm:ss'),
        end: bjNow().format('YYYY-MM-DDTHH:mm:ss'),
        tz_offset_minutes: BJ_OFFSET_MINUTES,
      };
      const res = await getOperationLogStats(params);
      setStats(res || null);
    } catch (err) {
      setStats(null);
    }
  }, [statsDays]);

  useEffect(() => {
    if (!permitted) return;
    load(page, pageSize);
    loadStats();
  }, [permitted, page, pageSize, load, loadStats]);

  const handleSearch = () => {
    // 筛选条件变化会改变 load 的引用，effect 会自动重新查询；这里只需回到第一页
    if (page !== 1) setPage(1);
  };

  // ── 目标详情弹窗（机器 / 容器 / 用户）──
  const [detailModal, setDetailModal] = useState(null); // { type, data }
  const [detailLoading, setDetailLoading] = useState(false);

  const openUserDetail = async (uid) => {
    if (uid == null) return;
    setDetailLoading(true);
    try {
      const res = await getUserDetailInformation(Number(uid));
      const info = (res && (res.user_info || res.data)) || res || {};
      setDetailModal({ type: 'user', data: info });
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取用户详情失败', status: err?.status, route: err?.route });
    } finally {
      setDetailLoading(false);
    }
  };

  const openTargetDetail = async (record) => {
    const tt = record?.target_type;
    if (!tt || record?.target_id == null) return;
    setDetailLoading(true);
    try {
      if (tt === 'machine') {
        const res = await getMachineDetailInformation(record.target_id);
        const data = (res && res.data) || res || null;
        if (!data || !data.machine_name) {
          message.error('未找到该机器');
          return;
        }
        setDetailModal({ type: 'machine', data });
      } else if (tt === 'container') {
        const res = await getContainerDetailInformation(record.target_id);
        const detail = (res && (res.container_info || res.container || res.data || res.container_detail)) || res || null;
        if (!detail || !detail.container_name) {
          message.error('未找到该容器');
          return;
        }
        setDetailModal({
          type: 'container',
          data: {
            key: detail.container_id != null ? String(detail.container_id) : String(record.target_id),
            container_name: detail.container_name,
            container_image: detail.container_image || '',
            machine_ip: detail.machine_ip || '',
            port: detail.port != null ? String(detail.port) : '',
            container_status: (detail.container_status || '').toLowerCase(),
            display_status: detail.display_status || null,
            cpu_number: detail.cpu_number ?? 0,
            gpu_number: detail.gpu_number ?? 0,
            memory_gb: detail.memory_gb ?? 0,
            shared_gb: detail.shared_gb ?? 0,
            accounts: detail.accounts || [],
          },
        });
      } else if (tt === 'user') {
        await openUserDetail(record.target_id);
      }
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取详情失败', status: err?.status, route: err?.route });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleReset = () => {
    setOperation(undefined);
    setTargetType(undefined);
    setOperatorUserId(undefined);
    setOnlyFailed(false);
    const ws = startOfWeek(bjNow());
    const range = [ws, ws.add(6, 'day').endOf('day')];
    setTimeRange(range);
    if (page !== 1) setPage(1);
  };

  /** 按周翻页：上一周 / 下一周（相对当前时间范围平移） */
  const shiftWeek = (delta) => {
    const base = timeRange && timeRange[0] ? toBj(timeRange[0]) : bjNow();
    const ws = startOfWeek(base).add(delta, 'week');
    const range = [ws, ws.add(6, 'day').endOf('day')];
    setTimeRange(range);
    if (page !== 1) setPage(1);
  };

  /** 跳回本周（与 shiftWeek 不同：绝对定位到本周，无论当前在哪个范围） */
  const jumpToCurrentWeek = () => {
    const ws = startOfWeek(bjNow());
    const range = [ws, ws.add(6, 'day').endOf('day')];
    setTimeRange(range);
    if (page !== 1) setPage(1);
  };

  /** 当前时间范围是否就是本周（决定「本周」按钮是否禁用） */
  const isCurrentWeek = useMemo(() => {
    if (!timeRange || !timeRange[0]) return false;
    return startOfWeek(toBj(timeRange[0])).isSame(startOfWeek(bjNow()), 'day');
  }, [timeRange]);

  // ── 统计派生数据 ──
  const dayBuckets = useMemo(() => {
    const byDay = stats?.by_day || {};
    const today = bjNow().startOf('day');
    const list = statsDays.map((d) => {
      const b = byDay[d.format('YYYY-MM-DD')] || { success: 0, failed: 0 };
      return {
        key: d.format('YYYY-MM-DD'),
        djs: d,
        future: d.isAfter(today),
        success: b.success || 0,
        failed: b.failed || 0,
      };
    });
    const successMax = Math.max(1, ...list.map((x) => x.success));
    const failedMax = Math.max(1, ...list.map((x) => x.failed));
    const weeks = [];
    for (let i = 0; i < list.length; i += 7) weeks.push(list.slice(i, i + 7));
    // 月份标签：跨月的第一列标月份（对应 GitHub 贡献图的月份标签）
    const monthLabels = [];
    weeks.forEach((week, i) => {
      const m = week[0].djs.month();
      const prev = i > 0 ? weeks[i - 1][0].djs.month() : -1;
      if (m !== prev) monthLabels.push({ col: i, label: `${m + 1}月` });
    });
    return { list, successMax, failedMax, weeks, monthLabels };
  }, [stats, statsDays]);

  // 绿墙配色：越深数量越多；好坏参半时斜杠分割（左上红/右下绿）
  const GREEN_LEVELS = ['#b7eb8f', '#73d13d', '#389e0d', '#237804'];
  const RED_LEVELS = ['#ffccc7', '#ff7875', '#f5222d', '#a8071a'];

  const levelColor = (n, max, palette) => {
    if (n <= 0) return null;
    const ratio = n / max;
    if (ratio <= 0.25) return palette[0];
    if (ratio <= 0.5) return palette[1];
    if (ratio <= 0.75) return palette[2];
    return palette[3];
  };

  const cellStyle = (d) => {
    const g = levelColor(d.success, dayBuckets.successMax, GREEN_LEVELS);
    const r = levelColor(d.failed, dayBuckets.failedMax, RED_LEVELS);
    if (!r && !g) return { background: '#f0f0f0' };
    if (!r) return { background: g };
    if (!g) return { background: r };
    return { background: `linear-gradient(135deg, ${r} 0%, ${r} 49%, ${g} 51%, ${g} 100%)` };
  };

  // 横向柱状图只保留这三个操作
  const KEEP_BARS = [
    { op: 'send_cleanup_reminder', label: '发送清理提醒' },
    { op: 'add_machine_permission', label: '授予机器权限' },
    { op: 'register_user', label: '注册用户' },
  ];
  const keepBarMax = useMemo(() => {
    const byOp = stats?.by_operation || {};
    return Math.max(1, ...KEEP_BARS.map(({ op }) => byOp[op] || 0));
  }, [stats]);


  return (
    <div className="admin-logs">
      {/* 周次导航 */}
      <div className="admin-logs-week">
        <Space>
          <Button size="small" icon={<LeftOutlined />} onClick={() => shiftWeek(-1)}>上一周</Button>
          <Typography.Text strong>{weekLabel}</Typography.Text>
          <Button size="small" onClick={jumpToCurrentWeek} disabled={isCurrentWeek}>本周</Button>
          <Button size="small" icon={<RightOutlined />} iconPosition="end" onClick={() => shiftWeek(1)}>下一周</Button>
        </Space>
      </div>

      {/* 统计概览：固定滑动窗口（最近 52 周） */}
      {stats ? (
        <div className="admin-logs-stats">
          <div className="als-layout">
            {/* 左：绿墙（GitHub 贡献图同款：固定 11×11 方格、滑动窗口 52 周、不拉伸） + 图例 */}
            <div className="als-wall-side">
              <div className="als-wall-wrap">
                <div className="als-wall">
                  {/* 月份标签行（对应 GitHub 贡献图的月份标签） */}
                  {dayBuckets.monthLabels.map(({ col, label }) => (
                    <span key={`m${col}`} className="als-wall-month" style={{ gridColumn: 2 + col, gridRow: 1 }}>
                      {label}
                    </span>
                  ))}
                  {/* 星期标签列：只标一/三/五（GitHub 只标 Mon/Wed/Fri） */}
                  {['一', '三', '五'].map((w, i) => (
                    <span key={w} className="als-wall-day" style={{ gridColumn: 1, gridRow: 2 + i * 2 }}>
                      {w}
                    </span>
                  ))}
                  {/* 最右只画到今天，未来的格子到了那天再画（完全对标 GitHub） */}
                  {dayBuckets.weeks.map((week, wi) =>
                    week.map((d, di) => (d.future ? null : (
                      <div
                        key={d.key}
                        className="als-cell"
                        style={{ gridColumn: 2 + wi, gridRow: 2 + di, ...cellStyle(d) }}
                        title={`${d.key}：成功 ${d.success} / 失败 ${d.failed}`}
                      />
                    )))
                  )}
                </div>
              </div>
              {/* 图例（绿墙右下，GitHub 同款） */}
              <div className="als-legend">
                <span className="als-legend-item"><span className="als-cell als-lg-none" /> 无操作</span>
                <span className="als-legend-item"><span className="als-cell als-lg-green" /> 正常</span>
                <span className="als-legend-item"><span className="als-cell als-lg-red" /> 失败</span>
                <span className="als-legend-item"><span className="als-cell als-lg-mix" /> 好坏参半</span>
              </div>
            </div>

            {/* 右：数据（三张统计卡）叠在柱状图上方 */}
            <div className="als-side">
              <Row gutter={[8, 8]}>
                <Col xs={8}>
                  <div className="admin-logs-stat-card">
                    <div className="admin-logs-stat-num">{stats.total ?? 0}</div>
                    <div className="admin-logs-stat-label">总操作数</div>
                  </div>
                </Col>
                <Col xs={8}>
                  <div className="admin-logs-stat-card admin-logs-stat-green">
                    <div className="admin-logs-stat-num">{stats.succeeded ?? 0}</div>
                    <div className="admin-logs-stat-label">成功</div>
                  </div>
                </Col>
                <Col xs={8}>
                  <div className="admin-logs-stat-card admin-logs-stat-red">
                    <div className="admin-logs-stat-num">{stats.failed ?? 0}</div>
                    <div className="admin-logs-stat-label">失败</div>
                  </div>
                </Col>
              </Row>
              <div className="admin-logs-bars">
                {KEEP_BARS.map(({ op, label }) => {
                  const count = (stats.by_operation || {})[op] || 0;
                  const percent = Math.round((count / keepBarMax) * 100);
                  return (
                    <div key={op} className="admin-logs-bar-row">
                      <span className="admin-logs-bar-label">{label}</span>
                      <div className="admin-logs-bar-track">
                        <div className="admin-logs-bar-fill" style={{ width: `${percent}%` }} />
                      </div>
                      <span className="admin-logs-bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* 筛选栏 */}
      <div className="admin-logs-filter">
        <Row gutter={[16, 16]} justify="center" align="middle">
          <Col xs={24} sm={12} md={4}>
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
          <Col xs={24} sm={12} md={3}>
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
          <Col xs={24} sm={12} md={4}>
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
              onChange={setTimeRange}
              showTime={{ format: 'HH:mm' }}
            />
          </Col>
          <Col xs={24} sm={12} md={7}>
            <Space wrap>
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
                  <a onClick={() => openUserDetail(r.operator_user_id)}>
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
              const prefix = `${TARGET_TEXT[r.target_type] || r.target_type || '-'} `;
              let label = r.target_name || `#${r.target_id}`;
              if (r.target_type === 'container' && r.root_owner) {
                label = `${label} · 超管 ${r.root_owner}`;
              }
              return <a onClick={() => openTargetDetail(r)}>{prefix}{label}</a>;
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
        </TableComponent>
      </div>

      {/* 目标详情弹窗 */}
      <MachineDetailModal
        visible={detailModal?.type === 'machine'}
        machine={detailModal?.data || null}
        onClose={() => setDetailModal(null)}
        loading={detailLoading}
      />
      <ContainerDetailModal
        visible={detailModal?.type === 'container'}
        container={detailModal?.data || null}
        onClose={() => setDetailModal(null)}
        readOnly
      />
      <UserInfoModal
        visible={detailModal?.type === 'user'}
        info={detailModal?.data || null}
        onClose={() => setDetailModal(null)}
      />
    </div>
  );
}
