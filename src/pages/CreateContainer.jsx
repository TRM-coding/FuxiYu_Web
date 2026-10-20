import React, { useCallback, useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Input, InputNumber, Button, Card, Tag, message, Empty, Spin, Slider, Select } from 'antd';
import { SearchOutlined, CheckCircleFilled, ThunderboltOutlined, CodeOutlined, LockOutlined } from '@ant-design/icons';
import showErrorModal from '../utils/showErrorModal';
import { usePermission } from '../contexts/PermissionContext';
import { listAllMachineBrefInformation, getDetailInformation, listMachinePermissions } from '../api/machine_api';
import { listAllUserBrefInformation } from '../api/user_api';
import { createContainer } from '../api/container_api';
import { listImageBrefInformation } from '../api/image_api';
import './CreateContainer.css';

// 环境模板由后端 image list 提供；创建容器时只提交 image_id。
const IMAGE_ICONS = {
  gpu: <ThunderboltOutlined />,
  base: <CodeOutlined />,
};

const normalizeImage = (image = {}) => {
  const base = image.base_image || '';
  const haystack = String((image.name || "") + " " + base + " " + (image.description || "")).toLowerCase();
  return {
    image_id: image.image_id ?? image.id ?? null,
    name: image.name || ("环境 " + (image.image_id ?? "")),
    description: image.description || '',
    status: image.status || 'draft',
    base_image: base,
    dockerfile_body: image.dockerfile_body ?? '',
    updated_at: image.updated_at || null,
    icon: /(cuda|gpu|pytorch|tensorflow)/.test(haystack) ? 'gpu' : 'base',
  };
};

// ── 限额语义：三层上限不能混为一谈 ──
//   硬件容量      = 机器物理规格（cpu_core_number / memory_size_gb / gpu_number）
//   机器配置限额  = 管理员在机器详情页设定的可分配上限（max_*）
//   本次可申请上限 = 机器配置限额再叠加本次容器的约束（共享内存不得超过本次申请内存）
// 取值语义：数值（含 0）是已知上限，0 表示该项不可分配；null/undefined/非数才是「未知」。
// 未知不能伪装成无限，也不能拿硬件容量顶上。
const knownLimit = (v) => {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// 收敛到有效上限；上限未知时收敛到最小值（不假定无限）。
const clampQuota = (v, limit, min) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  if (limit == null) return min;
  return Math.min(Math.max(n, min), Math.max(limit, min));
};

const limitText = (limit, unit) => (limit == null ? '未知' : `${limit} ${unit}`);

// 配额行：滑条为主、数字输入为辅，两者的 min/max/step 完全一致，取值统一走同一收敛函数。
// 头部固定给出「当前申请值」与「本次可申请上限」，元信息再区分硬件容量与机器配置限额。
const QuotaRow = ({
  rowKey, label, unit, min = 1, value,
  effectiveLimit, machineLimit, capacity, detail,
  onChange, disabled, disabledHint,
}) => {
  const known = effectiveLimit != null;
  const max = known ? Math.max(effectiveLimit, min) : min;
  const locked = disabled || !known;
  const shown = value == null ? min : value;
  const lockedHint = disabled && disabledHint
    ? disabledHint
    : (!known
      ? '机器配置限额未获取到，暂不可调整'
      : (effectiveLimit <= 0 ? '本机该项不可分配' : ''));
  return (
    <div className="cc-quota-row" data-quota={rowKey}>
      <div className="cc-quota-row-head">
        <label className="cc-field-label">{label}</label>
      </div>
      <div className="cc-quota-row-figures">
        <span>当前申请 <b className="cc-mono">{shown} {unit}</b></span>
        <span>本次可申请上限 <b className="cc-mono">{limitText(effectiveLimit, unit)}</b></span>
      </div>
      <div className="cc-quota-row-meta">
        <span>硬件容量 {limitText(capacity, unit)}</span>
        <span>机器配置限额 {limitText(machineLimit, unit)}</span>
        {detail && <span className="cc-quota-detail">{detail}</span>}
      </div>
      <div className="cc-quota-row-controls">
        <Slider
          className="cc-quota-slider"
          min={min}
          max={max}
          step={1}
          value={shown}
          onChange={onChange}
          disabled={locked}
        />
        <InputNumber
          className="cc-quota-input"
          min={min}
          max={max}
          step={1}
          precision={0}
          value={value}
          onChange={onChange}
          disabled={locked}
        />
      </div>
      {lockedHint ? <Typography.Text type="secondary" className="cc-quota-hint">{lockedHint}</Typography.Text> : null}
    </div>
  );
};

// 机器资源计量条（与「机器管理」rail 同款语义色：CPU 蓝 / 内存绿 / GPU 紫）
// 左边是硬件容量（物理规格），右边是机器配置限额（可分配）；条子画的是两者的配置比例，
// 不是实时空闲量。
const ResourceMeter = ({ label, capacity, allocatable, unit = '', tone = 'cpu' }) => {
  const cap = knownLimit(capacity);
  const alloc = knownLimit(allocatable);
  const pct = cap != null && cap > 0 && alloc != null
    ? Math.min(Math.round((alloc / cap) * 100), 100)
    : 0;
  return (
    <span className="cc-machine-meter">
      <span className="cc-machine-meter-head">
        <span>{label}</span>
        <span className="cc-mono">硬件 {cap == null ? '未知' : `${cap}${unit}`} · 可分配 {alloc == null ? '未知' : `${alloc}${unit}`}</span>
      </span>
      <span className="cc-machine-meter-track">
        <span className={`cc-machine-meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
};

const CreateContainer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // 身份来自服务端（见 PermissionContext）：不再读 localStorage 副本，页面不做认证门禁
  const {
    userId: currentUserId,
    userName: currentUserName,
    hasPermission,
    loaded: permLoaded,
  } = usePermission();

  // 环境(镜像)选择
  const [imageKeyword, setImageKeyword] = useState('');
  const [images, setImages] = useState([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);

  // 机器选择
  const [machines, setMachines] = useState([]);
  const [machinesLoading, setMachinesLoading] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(null);

  // 容器指标表单
  const [name, setName] = useState('');
  const [nameInvalid, setNameInvalid] = useState(false);
  const [remark, setRemark] = useState('');
  const [gpuCount, setGpuCount] = useState(null);
  const [cpuCount, setCpuCount] = useState(null);
  const [memoryGb, setMemoryGb] = useState(null);
  const [sharedGb, setSharedGb] = useState(null);
  const [publicKey, setPublicKey] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [quotaError, setQuotaError] = useState(null);

  // 代建门禁：持有 container:manage 才显示 ROOT 用户选择器
  const [hasManage, setHasManage] = useState(false);
  const [rootUsers, setRootUsers] = useState([]);
  const [rootUsersLoading, setRootUsersLoading] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(null);

  const fetchImages = useCallback(async (keyword = '') => {
    setImagesLoading(true);
    try {
      const res = await listImageBrefInformation({
        page_number: 1,
        page_size: 100,
        image_search: keyword,
      });
      const items = Array.isArray(res?.images) ? res.images.map(normalizeImage) : [];
      const readyImages = items.filter(item => (item.status || '').toLowerCase() === 'ready');
      setImages(readyImages);
      setSelectedImage(prev => {
        if (!prev) return null;
        return readyImages.some(item => String(item.image_id) === String(prev.image_id)) ? prev : null;
      });
    } catch (err) {
      setImages([]);
      setSelectedImage(null);
      await showErrorModal({
        message: err?.body || err || '加载环境模板失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setImagesLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchImages(imageKeyword);
    }, 250);
    return () => clearTimeout(timer);
  }, [imageKeyword, fetchImages]);

  const selectImage = (image) => {
    const imageId = image?.image_id;
    if (!imageId) return;
    if (String(selectedImage?.image_id) === String(imageId)) {
      setSelectedImage(null);
      return;
    }
    setSelectedImage(image);
  };

  const fetchMachines = useCallback(async () => {
    setMachinesLoading(true);
    try {
      // 后端分页 0-based；创建页一次性拉取在线机器候选
      const res = await listAllMachineBrefInformation({ page_number: 0, page_size: 100 });
      const items = (res && Array.isArray(res.machines) ? res.machines : []);
      // 并行补齐资源上限（max_* 只在详情里有），配额行与机器计量条都要用
      const enriched = await Promise.all(items.map(async (m) => {
        const mid = m.machine_id ?? m.id;
        if (mid == null) return m;
        try {
          const detail = await getDetailInformation(mid);
          return {
            ...m,
            cpu_core_number: detail.cpu_core_number ?? null,
            memory_size_gb: detail.memory_size_gb ?? null,
            gpu_number: detail.gpu_number ?? 0,
            gpu_type: detail.gpu_type ?? '',
            max_cpu_core_number: detail.max_cpu_core_number ?? null,
            max_memory_gb: detail.max_memory_gb ?? null,
            // 0 是「已知的 0 上限（不可分配）」，null 才是「未知」——不能让 null 落成 0
            max_gpu_number: detail.max_gpu_number ?? null,
            max_shared_gb: detail.max_shared_gb ?? null,
          };
        } catch (err) {
          console.warn('detail fetch failed for machine', mid, err?.message);
          return m;
        }
      }));
      setMachines(enriched);
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '加载机器列表失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setMachinesLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMachines();
  }, [fetchMachines]);

  // 从管理页「创建容器」跳转进入：机器列表加载完成后自动选中对应机器（仅执行一次）
  const preselectMachineId = location.state?.machineId ?? null;
  const preselectHandledRef = useRef(false);

  // 代建门禁：走 PermissionContext（App 级那一次请求），页面不再自己发一份。
  // 未加载完/权限接口失败 → 保守隐藏选择器（按无代建能力处理）。
  useEffect(() => {
    if (!permLoaded) return;
    setHasManage(hasPermission('container:manage'));
  }, [permLoaded, hasPermission]);

  // 仅运行中的机器可创建（维护/离线机器不可选）
  const onlineMachines = machines.filter(m => (m.machine_status || '').toLowerCase() === 'online');

  // 切换机器：四项配额一起收敛进新机器的机器配置限额（未知上限收敛到最小值），
  // 共享内存还要同时受「本次申请内存」约束，避免留下必然被后端拒绝的旧值。
  const computeQuotaForMachine = useCallback((m) => {
    const isGpu = (m.machine_type || '').toUpperCase() === 'GPU';
    const cpuLimit = knownLimit(m.max_cpu_core_number);
    const memLimit = knownLimit(m.max_memory_gb);
    const gpuLimitNext = isGpu ? knownLimit(m.max_gpu_number) : 0;
    const sharedLimit = knownLimit(m.max_shared_gb);
    const nextMemory = clampQuota(memoryGb ?? 1, memLimit, 1);
    const nextSharedTop = sharedLimit == null ? null : Math.min(sharedLimit, nextMemory);
    return {
      cpu: clampQuota(cpuCount ?? 1, cpuLimit, 1),
      gpu: gpuLimitNext == null ? 0 : clampQuota(gpuCount ?? 1, gpuLimitNext, 0),
      memory: nextMemory,
      shared: clampQuota(sharedGb ?? 0, nextSharedTop, 0),
    };
  }, [memoryGb, gpuCount, cpuCount, sharedGb]);

  // 选择机器：配额初始化/收敛进新机器的上限；CPU 机器 GPU 恒为 0。
  // 代建者：拉取该机器已授权用户作为 ROOT 用户候选，默认当前用户。
  const handleSelectMachine = useCallback(async (m) => {
    const mid = m.machine_id ?? m.id;
    if (selectedMachine && String(selectedMachine.machine_id ?? selectedMachine.id) === String(mid)) {
      setSelectedMachine(null);
      setGpuCount(0);
      setCpuCount(1);
      setMemoryGb(1);
      setSharedGb(0);
      setQuotaError(null);
      setRootUsers([]);
      setOwnerUserId(null);
      return;
    }
    setSelectedMachine(m);
    const nextQuota = computeQuotaForMachine(m);
    setGpuCount(nextQuota.gpu);
    setCpuCount(nextQuota.cpu);
    setMemoryGb(nextQuota.memory);
    setSharedGb(nextQuota.shared);
    setQuotaError(null);
    if (!hasManage) return;
    setRootUsersLoading(true);
    try {
      const permRes = await listMachinePermissions(mid);
      const ids = Array.isArray(permRes?.user_ids)
        ? permRes.user_ids.map(v => Number(v)).filter(Boolean)
        : [];
      const usersRes = await listAllUserBrefInformation({ page_number: 1, page_size: 500 });
      const items = (usersRes && (usersRes.users || usersRes.users_info || usersRes.data || usersRes.users_list)) || [];
      const mapped = items
        .filter(u => ids.includes(Number(u.user_id || u.id || u.uid || 0)))
        .map(u => ({
          id: Number(u.user_id || u.id || u.uid),
          name: u.display_name || u.username || u.name || String(u.user_id || u.id || u.uid),
        }));
      setRootUsers(mapped);
      const cur = Number(currentUserId || 0);
      setOwnerUserId(prev => {
        const keep = Number(prev);
        if (keep && mapped.some(u => u.id === keep)) return keep;
        if (mapped.some(u => u.id === cur)) return cur;
        return mapped[0]?.id ?? null;
      });
    } catch (err) {
      console.warn('load root users failed', err?.message);
      setRootUsers([]);
      setOwnerUserId(null);
    } finally {
      setRootUsersLoading(false);
    }
  }, [selectedMachine, computeQuotaForMachine, hasManage, currentUserId]);

  // 从管理页「创建容器」跳转进入：机器列表加载完成后自动选中对应机器（仅执行一次）
  useEffect(() => {
    if (preselectHandledRef.current || !preselectMachineId || machines.length === 0) return;
    const target = machines.find(m => String(m.machine_id ?? m.id) === String(preselectMachineId));
    if (target) {
      preselectHandledRef.current = true;
      handleSelectMachine(target);
    }
  }, [machines, preselectMachineId, handleSelectMachine]);

  const machineType = (selectedMachine?.machine_type || '').toUpperCase();
  const isGpuMachine = machineType === 'GPU';

  // 机器物理规格（硬件容量）
  const hardwareCapacity = {
    cpu: knownLimit(selectedMachine?.cpu_core_number),
    memory: knownLimit(selectedMachine?.memory_size_gb),
    gpu: knownLimit(selectedMachine?.gpu_number),
  };

  // 机器配置限额（管理员设定的 max_*）：0 是「已知不可分配」，null 是「未知」
  const machineLimits = {
    cpu: knownLimit(selectedMachine?.max_cpu_core_number),
    memory: knownLimit(selectedMachine?.max_memory_gb),
    gpu: selectedMachine ? (isGpuMachine ? knownLimit(selectedMachine?.max_gpu_number) : 0) : null,
    shared: knownLimit(selectedMachine?.max_shared_gb),
  };

  // 本次可申请上限：共享内存再叠加本次申请内存的约束 → min(max_shared_gb, 本次 MEMORY)
  const effectiveLimits = {
    cpu: machineLimits.cpu,
    memory: machineLimits.memory,
    gpu: machineLimits.gpu,
    shared: machineLimits.shared == null
      ? null
      : Math.min(machineLimits.shared, knownLimit(memoryGb) ?? machineLimits.shared),
  };

  // 降内存/切机器后重算共享内存：已有值超过有效上限就收敛到上限，
  // 不留一个提交必然被后端拒绝的组合。
  useEffect(() => {
    if (!selectedMachine) return;
    if (effectiveLimits.shared == null) {
      if (sharedGb) setSharedGb(0);
      return;
    }
    if (sharedGb != null && sharedGb > effectiveLimits.shared) setSharedGb(effectiveLimits.shared);
  }, [selectedMachine, memoryGb, sharedGb, effectiveLimits.shared]);

  // 滑条与数字输入走同一个收敛函数，保证两者读数与上口径一致
  const makeQuotaChange = (key, setter, min) => (next) => {
    setter(clampQuota(next, effectiveLimits[key], min));
    setQuotaError(null);
  };

  // 提交前超限检查：只有已知上限才判超限；未知上限的行已锁在最小值，不会造出超限 payload。
  const collectQuotaViolations = () => {
    const rows = [
      { key: 'gpu', label: 'GPU 数', unit: '块', value: gpuCount ?? 0 },
      { key: 'cpu', label: 'CPU 核数', unit: '核', value: cpuCount ?? 1 },
      { key: 'memory', label: '内存', unit: 'GB', value: memoryGb ?? 1 },
      { key: 'shared', label: '共享内存', unit: 'GB', value: sharedGb ?? 0 },
    ];
    const violations = rows
      .filter(r => effectiveLimits[r.key] != null && Number(r.value) > Number(effectiveLimits[r.key]))
      .map(r => `${r.label} 当前申请 ${r.value} ${r.unit}，本次可申请上限 ${effectiveLimits[r.key]} ${r.unit}`);
    // 交叉约束单独兜底：共享内存不得超过本次申请内存（不依赖机器是否返回 max_shared_gb）
    const sharedN = Number(sharedGb || 0);
    const memoryN = Number(memoryGb || 0);
    if (sharedN > memoryN) {
      violations.push(`共享内存 当前申请 ${sharedN} GB，不得超过本次申请内存 ${memoryN} GB`);
    }
    return violations;
  };

  const handleSubmit = async () => {
    if (!selectedImage || !selectedMachine) {
      message.warning('请先选择环境与机器');
      return;
    }
    if (!name.trim()) {
      message.warning('请填写容器名');
      return;
    }
    // 与后端同规则：2-115 位字母/数字/下划线（docker 拒绝单字符名字）。
    // 不弹窗打断：输入框红框 + 标签红字要求提示即可，改内容即消红
    if (!/^[A-Za-z0-9_]{2,}$/.test(name.trim()) || name.trim().length > 115) {
      setNameInvalid(true);
      return;
    }
    // 超限就不发请求：把申请值与上限一并说清楚，避免后端再拒一次
    const violations = collectQuotaViolations();
    if (violations.length > 0) {
      const text = violations.join('；');
      setQuotaError(text);
      message.warning(`配额超出本次可申请上限：${text}`);
      return;
    }
    setQuotaError(null);
    const machineId = selectedMachine.machine_id ?? selectedMachine.id;
    // payload 再按有效上限收敛一次（与页面读数同口径），保证发出去的组合一定在限额内
    const safeGpu = clampQuota(gpuCount ?? 0, effectiveLimits.gpu, 0);
    const safeCpu = clampQuota(cpuCount ?? 1, effectiveLimits.cpu, 1);
    const safeMemory = clampQuota(memoryGb ?? 1, effectiveLimits.memory, 1);
    const safeShared = clampQuota(sharedGb ?? 0, Math.min(effectiveLimits.shared ?? safeMemory, safeMemory), 0);
    const gpuList = safeGpu > 0 ? Array.from({ length: safeGpu }, (_, i) => i) : [];
    const payload = {
      // 普通用户不发 owner_user_id，后端归一为自己；代建者显式指定归属用户
      ...(hasManage && ownerUserId ? { owner_user_id: ownerUserId } : {}),
      user_name: currentUserName || '',
      user_id: currentUserId || null,
      machine_id: machineId,
      image_id: selectedImage.image_id,
      container: {
        GPU_LIST: gpuList,
        CPU_NUMBER: safeCpu,
        MEMORY: safeMemory,
        NAME: name.trim(),
        shared_memory: safeShared,
      },
      public_key: publicKey || '',
    };
    setSubmitting(true);
    try {
      await createContainer(payload);
      message.success('容器创建请求已发送');
      try {
        // 跳转「我的容器」并携带 startHeartbeat，由 Home 跟踪启动状态
        navigate('/index', { state: { startHeartbeat: { machine_id: machineId, container_name: payload.container.NAME } } });
      } catch {
        navigate('/index');
      }
    } catch (err) {
      console.error('createContainer failed', err);
      await showErrorModal({
        message: err?.body || err || '创建容器失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="cc-page">
      {/* 窄列：选择镜像 */}
      <aside className="cc-images">
        <div className="cc-panel-head">
          <div className="cc-panel-title-row">
            <span className="cc-step-no">01</span>
            <Typography.Text strong className="cc-panel-title">选择镜像</Typography.Text>
          </div>
          <Typography.Text type="secondary" className="cc-panel-sub">选择运行环境模板</Typography.Text>
        </div>
        <Input
          className="cc-image-search"
          prefix={<SearchOutlined />}
          placeholder="搜索镜像"
          value={imageKeyword}
          onChange={e => setImageKeyword(e.target.value)}
        />
        <div className="cc-image-list">
          {imagesLoading ? (
            <div className="cc-images-loading"><Spin /></div>
          ) : images.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="无匹配镜像" />
          ) : images.map(img => {
            const isSel = String(selectedImage?.image_id) === String(img.image_id);
            return (
              <button
                key={img.image_id}
                type="button"
                className={`cc-image-card${isSel ? ' is-selected' : ''}`}
                onClick={() => selectImage(img)}
              >
                <span className="cc-image-icon">{IMAGE_ICONS[img.icon] || <CodeOutlined />}</span>
                <span className="cc-image-body">
                  <span className="cc-image-name">{img.name}</span>
                  <span className="cc-image-ref">{img.base_image || "未记录基础镜像"}</span>
                  <span className="cc-image-tag">{img.description || img.status}</span>
                </span>
                {isSel && <CheckCircleFilled className="cc-card-check" />}
              </button>
            );
          })}
        </div>
      </aside>

      {/* 宽列：选择机器 + 输入配置 */}
      <section className="cc-main">
        {/* 机器：可滚动 grid，仅运行中可选 */}
        <div className="cc-machines">
          <div className="cc-panel-head cc-machines-head">
            <div className="cc-panel-title-row">
              <span className="cc-step-no">02</span>
              <Typography.Text strong className="cc-panel-title">选择机器</Typography.Text>
            </div>
            <Typography.Text type="secondary" className="cc-panel-sub">仅运行中的机器可选</Typography.Text>
          </div>
          {machinesLoading ? (
            <div className="cc-machines-loading"><Spin /></div>
          ) : onlineMachines.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无运行中的机器" />
          ) : (
            <div className="cc-machine-grid">
              {onlineMachines.map(m => {
                const mid = m.machine_id ?? m.id;
                const isSel = selectedMachine && String(selectedMachine.machine_id ?? selectedMachine.id) === String(mid);
                const isGpu = (m.machine_type || '').toUpperCase() === 'GPU';
                return (
                  <button
                    key={String(mid)}
                    type="button"
                    className={`cc-machine-card${isSel ? ' is-selected' : ''}`}
                    onClick={() => handleSelectMachine(m)}
                  >
                    <span className="cc-machine-card-head">
                      <span className="cc-machine-name">{m.machine_name || String(mid)}</span>
                      {isSel && <CheckCircleFilled className="cc-card-check" />}
                    </span>
                    <span className="cc-machine-spec">{m.machine_ip} · {m.machine_type}</span>
                    <span className="cc-machine-status"><i className="cc-dot" />运行中</span>
                    <span className="cc-machine-meters">
                      <ResourceMeter label="CPU" capacity={m.cpu_core_number} allocatable={m.max_cpu_core_number} unit="核" />
                      <ResourceMeter label="内存" capacity={m.memory_size_gb} allocatable={m.max_memory_gb} unit="G" tone="memory" />
                      {isGpu && <ResourceMeter label="GPU" capacity={m.gpu_number} allocatable={m.max_gpu_number} tone="gpu" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 输入配置：分组卡片 grid */}
        <div className="cc-form">
          <div className="cc-panel-head">
            <div className="cc-panel-title-row">
              <span className="cc-step-no">03</span>
              <Typography.Text strong className="cc-panel-title">输入配置</Typography.Text>
            </div>
            <Typography.Text type="secondary" className="cc-panel-sub">上限随机器配置限额与本次申请内存联动，不是实时空闲量</Typography.Text>
          </div>

          <div className="cc-form-groups">
            <Card size="small" title="基础" className="cc-form-card">
              {hasManage && (
                <div className="cc-field">
                  <label className="cc-field-label" htmlFor="cc-owner">ROOT 用户</label>
                  <Select
                    id="cc-owner"
                    showSearch
                    optionFilterProp="label"
                    placeholder="选择容器归属用户"
                    value={ownerUserId}
                    onChange={setOwnerUserId}
                    loading={rootUsersLoading}
                    disabled={!selectedMachine || (!rootUsersLoading && rootUsers.length === 0)}
                    options={rootUsers.map(u => ({ value: u.id, label: u.name }))}
                    notFoundContent={
                      !selectedMachine ? '请先选择机器' : (rootUsersLoading ? '加载中' : '暂无已授权用户')
                    }
                  />
                </div>
              )}
              <div className="cc-field">
                <label className="cc-field-label" htmlFor="cc-name">容器名 <span className="cc-required">*</span><span className={nameInvalid ? 'cc-name-rule is-error' : 'cc-name-rule'}>2-115 位，仅字母/数字/下划线</span></label>
                <Input
                  id="cc-name"
                  value={name}
                  status={nameInvalid ? 'error' : undefined}
                  onChange={e => {
                    setName(e.target.value);
                    if (nameInvalid) setNameInvalid(false);
                  }}
                  onFocus={() => { if (nameInvalid) setNameInvalid(false); }}
                  placeholder="必填，2-115 位，仅字母、数字、下划线"
                />
              </div>
              <div className="cc-field">
                <label className="cc-field-label" htmlFor="cc-remark">备注</label>
                <Input id="cc-remark" value={remark} onChange={e => setRemark(e.target.value)} />
              </div>
            </Card>

            <Card size="small" title="访问" className="cc-form-card">
              <div className="cc-field">
                <label className="cc-field-label" htmlFor="cc-key">SSH 公钥（可选）</label>
                <Input.TextArea
                  id="cc-key"
                  rows={2}
                  value={publicKey}
                  onChange={e => setPublicKey(e.target.value)}
                />
              </div>
            </Card>

            <Card
              size="small"
              title="资源配额"
              className={`cc-form-card cc-form-card-wide cc-quota-card${selectedMachine ? '' : ' is-locked'}`}
              extra={!selectedMachine && (
                <Typography.Text type="secondary" className="cc-quota-lock-hint">
                  <LockOutlined /> 请先选择机器
                </Typography.Text>
              )}
            >
              <div className="cc-quota-grid">
                <QuotaRow
                  rowKey="gpu"
                  label="GPU 数" unit="块"
                  effectiveLimit={effectiveLimits.gpu} machineLimit={machineLimits.gpu} capacity={hardwareCapacity.gpu}
                  value={gpuCount} min={0}
                  onChange={makeQuotaChange('gpu', setGpuCount, 0)}
                  disabled={!selectedMachine || !isGpuMachine}
                  disabledHint={!selectedMachine ? '请先选择机器' : '本机为 CPU 机器，不提供 GPU'}
                />
                <QuotaRow
                  rowKey="cpu"
                  label="CPU 核数" unit="核"
                  effectiveLimit={effectiveLimits.cpu} machineLimit={machineLimits.cpu} capacity={hardwareCapacity.cpu}
                  value={cpuCount} min={1}
                  onChange={makeQuotaChange('cpu', setCpuCount, 1)}
                  disabled={!selectedMachine}
                  disabledHint="请先选择机器"
                />
                <QuotaRow
                  rowKey="memory"
                  label="内存" unit="GB"
                  effectiveLimit={effectiveLimits.memory} machineLimit={machineLimits.memory} capacity={hardwareCapacity.memory}
                  value={memoryGb} min={1}
                  onChange={makeQuotaChange('memory', setMemoryGb, 1)}
                  disabled={!selectedMachine}
                  disabledHint="请先选择机器"
                />
                <QuotaRow
                  rowKey="shared"
                  label="共享内存" unit="GB"
                  effectiveLimit={effectiveLimits.shared} machineLimit={machineLimits.shared} capacity={hardwareCapacity.memory}
                  detail={`共享内存不得超过本次申请内存 ${memoryGb ?? '-'} GB，故上限取机器配置限额与该值的较小者`}
                  value={sharedGb} min={0}
                  onChange={makeQuotaChange('shared', setSharedGb, 0)}
                  disabled={!selectedMachine}
                  disabledHint="请先选择机器"
                />
              </div>
              <div className="cc-quota-legend">
                硬件容量＝机器物理规格；机器配置限额＝管理员在机器详情页设定的可分配上限；本次可申请上限＝机器配置限额再叠加本次申请的限制。以上均为配置上限，非实时空闲量。
              </div>
              {quotaError ? <div className="cc-quota-error" role="alert">{quotaError}</div> : null}
            </Card>
          </div>

          {/* 已选配置 + 提交 */}
          <div className="cc-submit-row">
            <div className="cc-summary">
              <span className="cc-summary-item">环境 <b className="cc-mono">{selectedImage?.name || selectedImage?.base_image || '—'}</b></span>
              <span className="cc-summary-item">机器 <b className="cc-mono">{selectedMachine?.machine_name || '—'}</b></span>
              <span className="cc-summary-item">配额 <b className="cc-mono">{gpuCount || 0} GPU / {cpuCount || 1} 核 / {memoryGb || 1}G / 共享 {sharedGb || 0}G</b></span>
            </div>
            <Button
              type="primary"
              loading={submitting}
              onClick={handleSubmit}
              disabled={!selectedImage || !selectedMachine || !name.trim()}
            >创建容器</Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default CreateContainer;
