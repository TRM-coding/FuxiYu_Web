import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Col, Input, message, Modal, Row, Select, Slider, Spin, Switch, Tag, Typography } from 'antd';
import { ArrowLeftOutlined, DeleteOutlined, DesktopOutlined, EditOutlined, ReloadOutlined, SafetyCertificateOutlined, SaveOutlined } from '@ant-design/icons';
import { getDetailInformation, getMachineStatus, removeMachine, renewMachineTrust, setMachineMaintenance, updateMachine } from '../api/machine_api';
import CopyChip from '../components/CopyChip';
import ConfirmModal from '../components/ConfirmModal';
import RuntimeTrendChart from '../components/RuntimeTrendChart';
import { usePermission } from '../contexts/PermissionContext';
import showErrorModal from '../utils/showErrorModal';
import { formatNumber, formatSnapshotTime } from '../utils/detailFormat';
import { getMachineStatusDisplay } from '../utils/statusDisplay';
import './DetailPages.css';

const GPU_COLORS = ['#1677ff', '#13a06f', '#7c3aed', '#f59e0b', '#ef4444', '#0f766e'];

const addHistoryPoint = (history, snapshot) => {
  if (!snapshot) return history;
  const gpus = Array.isArray(snapshot.gpu) ? snapshot.gpu : [];
  const point = {
    t: Date.now(),
    collectedAt: snapshot.collected_at || snapshot.cache_updated_at || null,
    cpu: Number(snapshot?.cpu?.usage_percent),
    memory: Number(snapshot?.memory?.usage_percent),
    disk: Number(snapshot?.disk?.percent),
    gpus: gpus.map(gpu => ({
      index: gpu?.index,
      value: Number(gpu?.utilization_gpu_percent),
    })),
  };
  const hasResource = [point.cpu, point.memory, point.disk].some(Number.isFinite);
  const hasGpu = point.gpus.some(gpu => Number.isFinite(gpu.value));
  if (!hasResource && !hasGpu) return history;
  return [...history.slice(-23), point];
};

const MachineDetailPage = () => {
  const { machineId } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermission();
  const [machine, setMachine] = useState(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);

  // 硬件分配许可编辑：滑条（CPU/内存/共享内存）+ GPU 点选（数量上限）
  const [limitDraft, setLimitDraft] = useState(null); // { max_cpu_core_number, max_memory_gb, max_shared_gb }
  const [selectedGpuIndices, setSelectedGpuIndices] = useState(new Set());
  const [savingLimits, setSavingLimits] = useState(false);
  const [deletingMachine, setDeletingMachine] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  // 修复连接（重钉信任锚）：机器还在、只是证书变了导致链路连不上时的修复入口
  const [renewingTrust, setRenewingTrust] = useState(false);
  const [renewConfirmVisible, setRenewConfirmVisible] = useState(false);
  // 机器基本信息编辑（名称/类型/IP；IP 变更后端自动校验证书并重 pin）
  const [editBasicVisible, setEditBasicVisible] = useState(false);
  const [basicDraft, setBasicDraft] = useState(null);
  const [savingBasic, setSavingBasic] = useState(false);
  const limitsInitializedRef = useRef(false);

  const openEditBasic = () => {
    setBasicDraft({
      machine_name: machine?.machine_name || '',
      machine_type: (machine?.machine_type || 'CPU').toUpperCase() === 'GPU' ? 'GPU' : 'CPU',
      machine_ip: machine?.machine_ip || '',
      port: machine?.port ?? '',
      is_maintenance: machine?.is_maintenance === true,
    });
    setEditBasicVisible(true);
  };
  const handleSaveBasic = async () => {
    if (!basicDraft || !machineId) return;
    setSavingBasic(true);
    try {
      // 端口显式传 null 表示清空（回落平台默认）——与「不传这个字段」（保持不动）是两回事
      const rawPort = basicDraft.port;
      const trimmedPort = rawPort === undefined || rawPort === null ? '' : String(rawPort).trim();
      if (trimmedPort !== '') {
        const n = Number(trimmedPort);
        if (!Number.isInteger(n) || n < 1 || n > 65535) {
          message.error('Node 端口须为 1-65535 之间的整数，或留空使用平台默认');
          setSavingBasic(false);
          return;
        }
      }
      const port = trimmedPort === '' ? null : Number(trimmedPort);
      await updateMachine(Number(machineId), {
        machine_name: basicDraft.machine_name,
        machine_type: basicDraft.machine_type,
        machine_ip: basicDraft.machine_ip,
        port,
      });
      if (Boolean(basicDraft.is_maintenance) !== (machine?.is_maintenance === true)) {
        await setMachineMaintenance(Number(machineId), Boolean(basicDraft.is_maintenance));
      }
      message.success('机器基本信息已保存');
      setEditBasicVisible(false);
      await loadDetail({ silent: true });
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '保存失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setSavingBasic(false);
    }
  };

  // 删除机器（2026-09：机器上有容器时后端拒绝并提示先手动清理）
  const handleDeleteMachine = () => {
    setDeleteConfirmVisible(true);
  };
  const handleConfirmDeleteMachine = async () => {
    setDeletingMachine(true);
    try {
      await removeMachine([Number(machineId)]);
      message.success('机器已删除');
      setDeleteConfirmVisible(false);
      navigate('/admin/machines');
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '删除机器失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setDeletingMachine(false);
    }
  };

  // 修复连接（2026-09）：Node 重新生成过自签证书 → 本地 pin 失效、链路连不上。
  // 机器、容器、uid 都没变，坏的只是连接能力；后端只更新原行，不重建档。
  const handleConfirmRenewTrust = async () => {
    setRenewingTrust(true);
    try {
      const result = await renewMachineTrust(Number(machineId));
      const parts = ['连接信任已重建'];
      if (result?.uid_reissued) parts.push('已重发身份牌');
      if (result?.uid_mismatch) parts.push('注意：身份牌与对端不一致，已保留本端值');
      message.success(parts.join('；'));
      setRenewConfirmVisible(false);
      await loadDetail({ silent: true });
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '修复连接失败', status: err?.status || err?.response?.status, route: err?.route || err?.response?.url });
    } finally {
      setRenewingTrust(false);
    }
  };

  const loadDetail = async ({ silent = false } = {}) => {
    if (!machineId) return;
    if (!silent) setLoading(true);
    try {
      const detail = await getDetailInformation(Number(machineId));
      setMachine(detail || null);
      setHistory(prev => addHistoryPoint(prev, detail?.runtime_snapshot));
    } catch (err) {
      await showErrorModal({ message: err?.body || err || '获取机器详情失败', status: err?.status, route: err?.route });
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const loadStatus = async () => {
    if (!machineId) return;
    try {
      const data = await getMachineStatus(Number(machineId));
      setMachine(prev => {
        if (!prev) return prev;
        const has = key => Object.prototype.hasOwnProperty.call(data || {}, key);
        return {
          ...prev,
          machine_status: has('machine_status') ? data.machine_status : prev.machine_status,
          is_maintenance: has('is_maintenance') ? data.is_maintenance : prev.is_maintenance,
          runtime_snapshot: has('runtime_snapshot') ? data.runtime_snapshot : prev.runtime_snapshot,
        };
      });
      setHistory(prev => addHistoryPoint(prev, data?.runtime_snapshot));
    } catch (err) {
      console.warn('machine status polling failed', err);
    }
  };

  useEffect(() => {
    loadDetail();
    const timer = setInterval(loadStatus, 5000);
    return () => clearInterval(timer);
  }, [machineId]);

  // 机器首次加载后初始化编辑草稿（loadStatus 轮询不重置草稿）
  useEffect(() => {
    if (!machine || limitsInitializedRef.current) return;
    limitsInitializedRef.current = true;
    setLimitDraft({
      max_cpu_core_number: machine.max_cpu_core_number ?? machine.cpu_core_number ?? 1,
      max_memory_gb: machine.max_memory_gb ?? machine.memory_size_gb ?? 1,
      max_shared_gb: machine.max_shared_gb ?? 0,
      // 磁盘上限（语义收敛 2026-08）：max_disk_size_gb 是容器磁盘可用上限；未设置回退分区容量
      max_disk_size_gb: machine.max_disk_size_gb ?? machine.disk_size_gb ?? 0,
    });
    const gpuTotal = gpus.length || machine.gpu_number || 0;
    // GPU 三集合（决策）：allow_list 为管理员许可集合；未配置时默认全量
    const allow = Array.isArray(machine.gpu_allow_list)
      ? machine.gpu_allow_list.map(Number).filter(Number.isInteger)
      : Array.from({ length: gpuTotal }, (_, i) => i);
    setSelectedGpuIndices(new Set(allow));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine]);

  const snapshot = machine?.runtime_snapshot || {};
  const status = String(machine?.is_maintenance ? 'maintenance' : (machine?.machine_status || 'offline')).toLowerCase();
  const statusDisplay = getMachineStatusDisplay(status);
  const gpus = Array.isArray(snapshot.gpu) ? snapshot.gpu : [];
  const gpuTotal = gpus.length || machine?.gpu_number || 0;
  const limitsDirty = useMemo(() => {
    if (!machine || !limitDraft) return false;
    // GPU 许可：machine.gpu_allow_list（未配置 = 全量）vs 当前选中集合
    const curAllow = Array.isArray(machine.gpu_allow_list)
      ? machine.gpu_allow_list.map(Number).filter(Number.isInteger).sort((a, b) => a - b)
      : Array.from({ length: gpuTotal }, (_, i) => i);
    const draftAllow = Array.from(selectedGpuIndices).sort((a, b) => a - b);
    const allowChanged = curAllow.length !== draftAllow.length
      || curAllow.some((v, i) => v !== draftAllow[i]);
    return (machine.max_cpu_core_number ?? machine.cpu_core_number ?? 1) !== limitDraft.max_cpu_core_number
      || (machine.max_memory_gb ?? machine.memory_size_gb ?? 1) !== limitDraft.max_memory_gb
      || (machine.max_shared_gb ?? 0) !== limitDraft.max_shared_gb
      || (machine.max_disk_size_gb ?? machine.disk_size_gb ?? 0) !== limitDraft.max_disk_size_gb
      || allowChanged;
  }, [machine, limitDraft, selectedGpuIndices, gpuTotal]);

  const toggleGpu = (idx) => {
    setSelectedGpuIndices(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const saveLimits = async () => {
    if (!limitDraft) return;
    setSavingLimits(true);
    const payload = {
      max_cpu_core_number: limitDraft.max_cpu_core_number,
      max_memory_gb: limitDraft.max_memory_gb,
      max_shared_gb: limitDraft.max_shared_gb,
      max_disk_size_gb: limitDraft.max_disk_size_gb,
      gpu_allow_list: Array.from(selectedGpuIndices).sort((a, b) => a - b),
    };
    try {
      await updateMachine(Number(machineId), payload);
      message.success('硬件分配限制已保存');
      // 同步草稿为已保存值，dirty 归零
      setLimitDraft({
        max_cpu_core_number: payload.max_cpu_core_number,
        max_memory_gb: payload.max_memory_gb,
        max_shared_gb: payload.max_shared_gb,
        max_disk_size_gb: payload.max_disk_size_gb,
      });
      setSelectedGpuIndices(new Set(payload.gpu_allow_list));
      await loadDetail({ silent: true });
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '保存硬件分配限制失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setSavingLimits(false);
    }
  };
  const latestHistoryPoint = history.length ? history[history.length - 1] : null;
  const collectedAt = latestHistoryPoint?.collectedAt || snapshot?.collected_at || snapshot?.cache_updated_at;
  // GPU 三集合（决策）：可分配上限从 gpu_allow_list 数量派生；未配置 = 全量许可
  const gpuAllowCount = (Array.isArray(machine?.gpu_allow_list) && machine.gpu_allow_list.length)
    ? machine.gpu_allow_list.length
    : (gpus.length || machine?.gpu_number || 0);
  // 磁盘两挂载点（语义收敛 2026-08）：显示用，bind_mount 为容器数据主分区
  const diskMount = snapshot?.disk?.bind_mount || {};
  const diskDockerData = snapshot?.disk?.docker_data || {};

  const metricCards = useMemo(() => ([
    {
      label: 'CPU',
      value: formatNumber(snapshot?.cpu?.usage_percent, '%'),
      extra: `${formatNumber(machine?.cpu_core_number, ' 核')} / 可分配 ${formatNumber(machine?.max_cpu_core_number, ' 核')}`,
    },
    {
      label: '内存',
      value: formatNumber(snapshot?.memory?.usage_percent, '%'),
      extra: `${formatNumber(snapshot?.memory?.used_gb, ' GB')} / ${formatNumber(snapshot?.memory?.total_gb ?? machine?.memory_size_gb, ' GB')}`,
    },
    {
      label: 'GPU',
      value: `${gpus.length || machine?.gpu_number || 0} 张`,
      extra: `可分配 ${formatNumber(gpuAllowCount, ' 张')}`,
    },
    {
      label: '磁盘',
      value: formatNumber(diskMount.percent, '%'),
      extra: `容器数据 ${formatNumber(diskMount.used_gb, ' GB')} / ${formatNumber(diskMount.total_gb ?? machine?.disk_size_gb, ' GB')} · docker 数据 ${formatNumber(diskDockerData.used_gb, ' GB')} / ${formatNumber(diskDockerData.total_gb, ' GB')}`,
    },
    {
      label: '系统',
      value: snapshot?.hostname || '-',
      extra: snapshot?.platform || '暂无平台快照',
    },
    {
      label: '备注',
      value: machine?.machine_description ? '已填写' : '暂无',
      extra: machine?.machine_description || '暂无备注',
    },
  ]), [machine, snapshot, gpus.length]);

  const resourceSeries = [
    { key: 'cpu', label: 'CPU', color: '#1677ff', fill: 'rgba(22, 119, 255, 0.12)', value: point => point.cpu },
    { key: 'memory', label: '内存', color: '#13a06f', fill: 'rgba(19, 160, 111, 0.10)', value: point => point.memory },
    { key: 'disk', label: '磁盘', color: '#7c3aed', fill: 'rgba(124, 58, 237, 0.08)', value: point => point.disk },
  ];

  // 掉卡审查（纯前端集合比对）：许可卡号 − 运行快照卡号 = 差集；
  // 连续 GPU_ABSENT_TICKS 次轮询仍缺席才标 warning（nvidia-smi 偶发闪断不误报）
  const GPU_ABSENT_TICKS = 3;
  const [absentTicks, setAbsentTicks] = useState({});

  useEffect(() => {
    if (!machine) return;
    const online = !machine.is_maintenance && String(machine.machine_status || '').toLowerCase() === 'online';
    if (!online) {
      setAbsentTicks({});
      return;
    }
    const liveIdx = new Set(
      (snapshot?.gpu || []).map(g => Number(g?.index)).filter(Number.isInteger),
    );
    const allowArr = (Array.isArray(machine?.gpu_allow_list) && machine.gpu_allow_list.length)
      ? machine.gpu_allow_list.map(Number).filter(Number.isInteger)
      : Array.from({ length: gpus.length || machine?.gpu_number || 0 }, (_, i) => i);
    setAbsentTicks(prev => {
      const next = {};
      for (const idx of allowArr) {
        next[idx] = liveIdx.has(idx) ? 0 : (prev[idx] ?? 0) + 1;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machine, snapshot?.gpu]);

  const gpuMissing = (Array.isArray(machine?.gpu_allow_list) && machine.gpu_allow_list.length
    ? machine.gpu_allow_list.map(Number)
    : Array.from({ length: gpus.length || machine?.gpu_number || 0 }, (_, i) => i))
    .filter(idx => (absentTicks[idx] ?? 0) >= GPU_ABSENT_TICKS);

  const gpuSeries = gpus.map((gpu, idx) => ({
    key: `gpu-${gpu?.index ?? idx}`,
    label: `GPU ${gpu?.index ?? idx}`,
    color: GPU_COLORS[idx % GPU_COLORS.length],
    value: point => {
      const found = (point.gpus || []).find(item => String(item.index) === String(gpu?.index ?? idx));
      return found?.value;
    },
  }));

  return (
    <main className="detail-page">
      <div className="detail-shell">
        <div className="detail-topbar">
          <div className="detail-topbar-actions">
            <Button icon={<ArrowLeftOutlined />} onClick={() => (window.history.length > 1 ? navigate(-1) : navigate('/admin/machines'))}>返回</Button>
            <Button icon={<ReloadOutlined />} onClick={() => loadDetail()}>刷新</Button>
            {hasPermission('machine:manage') && (
              <Button
                icon={<SafetyCertificateOutlined />}
                loading={renewingTrust}
                onClick={() => setRenewConfirmVisible(true)}
              >修复连接</Button>
            )}
            <Button danger icon={<DeleteOutlined />} loading={deletingMachine} onClick={handleDeleteMachine}>删除</Button>
          </div>
        </div>

        {loading && !machine ? <Spin /> : (
          <>
            <div className="detail-title-wrap">
              <div className="detail-title">
                <h1>{machine?.machine_name || `机器 ${machineId}`}</h1>
                <Tag color={statusDisplay.color}>{statusDisplay.label}</Tag>
                <Button size="small" icon={<EditOutlined />} onClick={openEditBasic}>编辑</Button>
              </div>
              <div className="detail-subtitle">
                <span>ID {machineId}</span>
                <CopyChip value={machine?.machine_ip || ''}>{machine?.machine_ip || '-'}</CopyChip>
                <Tag>{machine?.port ? `端口 ${machine.port}` : '端口 默认'}</Tag>
                <Tag>{(machine?.machine_type || 'CPU').toUpperCase()}</Tag>
                <Tag color={collectedAt ? 'blue' : 'default'}>采集 {formatSnapshotTime(collectedAt)}</Tag>
              </div>
            </div>

            <Modal
              title="编辑机器基本信息"
              open={editBasicVisible}
              onCancel={() => setEditBasicVisible(false)}
              onOk={handleSaveBasic}
              confirmLoading={savingBasic}
              okText="保存"
              cancelText="取消"
            >
              <div className="detail-field-grid">
                <div className="detail-field">
                  <span className="detail-field-label">机器名</span>
                  <Input
                    value={basicDraft?.machine_name ?? ''}
                    onChange={e => setBasicDraft(d => ({ ...d, machine_name: e.target.value }))}
                    placeholder="机器名"
                  />
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">类型</span>
                  <Select
                    style={{ width: '100%' }}
                    value={basicDraft?.machine_type ?? 'CPU'}
                    onChange={v => setBasicDraft(d => ({ ...d, machine_type: v }))}
                    options={[
                      { value: 'CPU', label: 'CPU' },
                      { value: 'GPU', label: 'GPU' },
                    ]}
                  />
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">IP</span>
                  <Input
                    value={basicDraft?.machine_ip ?? ''}
                    onChange={e => setBasicDraft(d => ({ ...d, machine_ip: e.target.value }))}
                    placeholder="10.0.0.x"
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    保存后链路按新地址自动重连。若新地址上没有该机器的证书，需再点一次「修复连接」重新建立信任。
                  </Typography.Text>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">Node 端口</span>
                  <Input
                    value={basicDraft?.port ?? ''}
                    onChange={e => setBasicDraft(d => ({ ...d, port: e.target.value }))}
                    placeholder="留空用平台默认"
                    allowClear
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    留空表示使用平台默认端口。只改端口无需重新建立信任（证书与主机都没变）。
                  </Typography.Text>
                </div>
                <div className="detail-field">
                  <span className="detail-field-label">维护状态</span>
                  <Switch
                    checked={basicDraft?.is_maintenance === true}
                    onChange={v => setBasicDraft(d => ({ ...d, is_maintenance: v }))}
                  />
                  <Typography.Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>维护中机器不参与调度</Typography.Text>
                </div>
              </div>
            </Modal>

            <section className="machine-detail-layout">
              <div className="machine-detail-summary-row machine-detail-summary-row-wide">
                {metricCards.map(item => (
                  <div className="detail-metric machine-detail-metric" key={item.label}>
                    <div className="detail-metric-label">{item.label}</div>
                    <div className="detail-metric-value">{item.value}</div>
                    <div className="detail-metric-extra">{item.extra}</div>
                  </div>
                ))}
              </div>

              <div className="detail-card detail-chart-card">
                <h2>资源使用趋势</h2>
                <RuntimeTrendChart history={history} series={resourceSeries} emptyText="等待更多资源快照" ariaLabel="资源使用趋势" />
              </div>

              <div className="detail-card detail-chart-card">
                <div className="detail-chart-card-head">
                  <h2>GPU 使用趋势</h2>
                  {gpuMissing.length > 0 && (
                    <span className="gpu-absent-warn">
                      ⚠ 许可 GPU {gpuMissing.join('、')} 已连续缺席运行快照（疑似掉卡，许可未自动调整）
                    </span>
                  )}
                </div>
                <RuntimeTrendChart history={history} series={gpuSeries} emptyText="暂无 GPU 运行快照" ariaLabel="GPU 使用趋势" />
              </div>

              <div className="detail-card machine-detail-wide-card machine-limit-row">
                <div className="machine-limit-card">
                  <div className="machine-limit-card-head">
                    <h2>硬件分配限制</h2>
                    <Typography.Text type="secondary">上限随机器实际硬件自动约束</Typography.Text>
                  </div>
                  <div className="machine-limit-sliders">
                    <div className="machine-limit-slider">
                      <label>CPU 上限 <b className="cc-mono">{limitDraft?.max_cpu_core_number ?? '-'} 核</b></label>
                      <Slider
                        min={1}
                        max={machine?.cpu_core_number || 1}
                        step={1}
                        value={limitDraft?.max_cpu_core_number ?? 1}
                        onChange={v => setLimitDraft(d => ({ ...d, max_cpu_core_number: v }))}
                      />
                    </div>
                    <div className="machine-limit-slider">
                      <label>内存上限 <b className="cc-mono">{limitDraft?.max_memory_gb ?? '-'} GB</b></label>
                      <Slider
                        min={1}
                        max={machine?.memory_size_gb || 1}
                        step={1}
                        value={limitDraft?.max_memory_gb ?? 1}
                        onChange={v => setLimitDraft(d => ({ ...d, max_memory_gb: v }))}
                      />
                    </div>
                    <div className="machine-limit-slider">
                      <label>共享内存上限 <b className="cc-mono">{limitDraft?.max_shared_gb ?? '-'} GB</b></label>
                      <Slider
                        min={0}
                        max={8}
                        step={1}
                        value={limitDraft?.max_shared_gb ?? 0}
                        onChange={v => setLimitDraft(d => ({ ...d, max_shared_gb: v }))}
                      />
                    </div>
                    <div className="machine-limit-slider">
                      <label>磁盘上限 <b className="cc-mono">{limitDraft?.max_disk_size_gb ?? '-'} GB</b></label>
                      {/* 滑条范围参照 mount 所在分区容量（disk_size_gb）；值即 max_disk_size_gb（容器磁盘可用上限） */}
                      <Slider
                        min={0}
                        max={machine?.disk_size_gb || 1}
                        step={1}
                        value={limitDraft?.max_disk_size_gb ?? 0}
                        onChange={v => setLimitDraft(d => ({ ...d, max_disk_size_gb: v }))}
                      />
                    </div>
                  </div>
                </div>

                <div className="machine-limit-card">
                  <div className="machine-limit-card-head">
                    <h2>GPU 分配许可</h2>
                    <Typography.Text type="secondary">已选 {selectedGpuIndices.size} / {gpuTotal} 张 · 点选允许分配的卡（实际枚举 {gpus.map(g => g.index ?? '?').join(', ') || '暂无'}）</Typography.Text>
                  </div>
                  {gpuTotal ? (
                    <div className="machine-gpu-picker">
                      {Array.from({ length: gpuTotal }, (_, i) => {
                        const gpu = gpus[i] || {};
                        return (
                          <button
                            key={i}
                            type="button"
                            className={`machine-gpu-pick${selectedGpuIndices.has(i) ? ' is-selected' : ''}`}
                            onClick={() => toggleGpu(i)}
                          >
                            <strong>GPU {gpu.index ?? i}</strong>
                            <span>
                              {gpu.name || '-'}
                              {gpu.utilization_gpu_percent != null && ` · ${formatNumber(gpu.utilization_gpu_percent, '%')}`}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : <Typography.Text type="secondary">暂无 GPU</Typography.Text>}
                </div>

                <div className="machine-limit-save">
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    disabled={!limitsDirty}
                    loading={savingLimits}
                    onClick={saveLimits}
                  >保存</Button>
                </div>
              </div>

            </section>

          </>
        )}
        <ConfirmModal
          visible={deleteConfirmVisible}
          title="确认删除宿主机"
          icon={<DesktopOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />}
          message={(
            <div>
              <div className="mm-delete-headline">你即将<span className="mm-action-verb">删除</span>的是：<span className="mm-delete-headline-type">机器</span></div>
              <div className="mm-delete-name">名称：{machine?.machine_name || machineId}</div>
            </div>
          )}
          content={(
            <div className="mm-danger-box">
              <Row gutter={[0, 8]}>
                <Col span={24}>
                  <Typography.Text type="secondary">机器ID：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{machineId}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">机器名：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{machine?.machine_name || '-'}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">IP：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{machine?.machine_ip || '-'}</Typography.Text>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">类型：</Typography.Text>
                  <Tag className="mm-ml-8">{(machine?.machine_type || '').toUpperCase()}</Tag>
                </Col>
                <Col span={24}>
                  <Typography.Text type="secondary">状态：</Typography.Text>
                  <Typography.Text className="mm-ml-8">{(machine?.machine_status || '').toLowerCase()}</Typography.Text>
                </Col>
              </Row>
              <Typography.Text type="danger" className="mm-danger-text">
                此操作不可恢复！删除前务必先手动清理该机器上的容器。
              </Typography.Text>
            </div>
          )}
          danger
          iconColor="#ff4d4f"
          onConfirm={handleConfirmDeleteMachine}
          onCancel={() => setDeleteConfirmVisible(false)}
          loading={deletingMachine}
          confirmText="删除"
        />
        <ConfirmModal
          visible={renewConfirmVisible}
          title="确认修复连接"
          icon={<SafetyCertificateOutlined style={{ color: '#1677ff', fontSize: 18 }} />}
          message={(
            <div>
              <div className="mm-delete-headline">即将对机器<span className="mm-action-verb">重新建立</span>连接信任</div>
              <div className="mm-delete-name">名称：{machine?.machine_name || machineId}</div>
            </div>
          )}
          content={(
            <div>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                用于机器还在、但 Node 换过自签证书导致链路连不上的情况。执行后会重新抓取该机器当前的证书，
                作为本端唯一信任的凭据。
              </Typography.Paragraph>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                机器本身、容器与身份牌都不会变动；连接能力已正常时执行也不会造成破坏。
              </Typography.Paragraph>
            </div>
          )}
          onConfirm={handleConfirmRenewTrust}
          onCancel={() => setRenewConfirmVisible(false)}
          loading={renewingTrust}
          confirmText="修复"
        />
      </div>
    </main>
  );
};

export default MachineDetailPage;
