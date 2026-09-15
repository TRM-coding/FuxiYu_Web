import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Typography, Input, InputNumber, Button, Card, Tag, message, Empty, Spin, Slider, Select } from 'antd';
import { SearchOutlined, CheckCircleFilled, ThunderboltOutlined, CodeOutlined, LockOutlined } from '@ant-design/icons';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { listAllMachineBrefInformation, getDetailInformation, listMachinePermissions } from '../api/machine_api';
import { getUserPermissions, listAllUserBrefInformation } from '../api/user_api';
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

// 配额行：滑条为主、读数加粗、窄输入框为辅（与「编辑机器」弹窗同一套交互语言）
const QuotaRow = ({ label, unit, limit, value, min = 1, onChange, disabled }) => {
  const lmt = typeof limit === 'number' && limit > 0 ? limit : null;
  const locked = disabled || lmt == null;
  return (
    <div className="cc-quota-row">
      <div className="cc-quota-row-head">
        <label className="cc-field-label">{label}</label>
        <Typography.Text type="secondary" className="cc-quota-limit">上限 {lmt != null ? `${lmt} ${unit}` : '—'}</Typography.Text>
      </div>
      <div className="cc-quota-row-controls">
        <Slider
          className="cc-quota-slider"
          min={min}
          max={lmt ?? min}
          step={1}
          value={value ?? min}
          onChange={onChange}
          disabled={locked}
        />
        <span className="cc-quota-value">{value ?? min} {unit}</span>
        <InputNumber
          className="cc-quota-input"
          min={min}
          max={lmt}
          step={1}
          precision={0}
          value={value}
          onChange={onChange}
          disabled={locked}
        />
      </div>
    </div>
  );
};

// 机器资源计量条（与「机器管理」rail 同款语义色：CPU 蓝 / 内存绿 / GPU 紫）
const ResourceMeter = ({ label, cur, max, unit = '', tone = 'cpu' }) => {
  const maxN = Number(max || 0);
  const pct = maxN > 0 ? Math.min(Math.round((Number(cur || 0) / maxN) * 100), 100) : 0;
  return (
    <span className="cc-machine-meter">
      <span className="cc-machine-meter-head">
        <span>{label}</span>
        <span className="cc-mono">{cur ?? '-'}{unit} / {max ?? '-'}{unit}</span>
      </span>
      <span className="cc-machine-meter-track">
        <span className={`cc-machine-meter-fill ${tone}`} style={{ width: `${pct}%` }} />
      </span>
    </span>
  );
};

const clampNum = (v, max, min) => {
  if (v == null) return null;
  const n = Number(v);
  const top = typeof max === 'number' && max > 0 ? max : n;
  return Math.min(Math.max(n, min), Math.max(top, min));
};

const CreateContainer = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUserName, setCurrentUserName] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

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

  // 代建门禁：持有 container:manage 才显示 ROOT 用户选择器
  const [hasManage, setHasManage] = useState(false);
  const [rootUsers, setRootUsers] = useState([]);
  const [rootUsersLoading, setRootUsersLoading] = useState(false);
  const [ownerUserId, setOwnerUserId] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const name = localStorage.getItem('currentUserName');
        const id = localStorage.getItem('currentUserId');
        // 需要同时拥有 name 和 id；缺失则清 auth 并强制登录
        if (!name || !id) {
          if (!sessionStorage.getItem('auth_modal_shown')) {
            try {
              sessionStorage.setItem('auth_modal_shown', '1');
              await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
            } finally {
              sessionStorage.removeItem('auth_modal_shown');
            }
          }
          handleAuthError(401, navigate);
          return;
        }
        setCurrentUserName(name);
        setCurrentUserId(id);
      } catch (e) {
        if (!sessionStorage.getItem('auth_modal_shown')) {
          try {
            sessionStorage.setItem('auth_modal_shown', '1');
            await showErrorModal({ title: '未登录', message: '登录已失效，请重新登录', status: 401 });
          } finally {
            sessionStorage.removeItem('auth_modal_shown');
          }
        }
        handleAuthError(401, navigate);
      }
    };
    checkAuth();
  }, [navigate]);

  const fetchImages = async (keyword = '') => {
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
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchImages(imageKeyword);
    }, 250);
    return () => clearTimeout(timer);
  }, [imageKeyword]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectImage = (image) => {
    const imageId = image?.image_id;
    if (!imageId) return;
    if (String(selectedImage?.image_id) === String(imageId)) {
      setSelectedImage(null);
      return;
    }
    setSelectedImage(image);
  };

  const fetchMachines = async () => {
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
            max_gpu_number: detail.max_gpu_number ?? 0,
            max_shared_gb: detail.max_shared_gb ?? 0,
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
  };

  useEffect(() => {
    fetchMachines();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 从管理页「创建容器」跳转进入：机器列表加载完成后自动选中对应机器（仅执行一次）
  const preselectMachineId = location.state?.machineId ?? null;
  const preselectHandledRef = useRef(false);
  useEffect(() => {
    if (preselectHandledRef.current || !preselectMachineId || machines.length === 0) return;
    const target = machines.find(m => String(m.machine_id ?? m.id) === String(preselectMachineId));
    if (target) {
      preselectHandledRef.current = true;
      handleSelectMachine(target);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [machines, preselectMachineId]);

  // 代建门禁：权限接口失败时保守隐藏选择器（按无代建能力处理）
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const entities = await getUserPermissions();
        if (mounted) setHasManage(Array.isArray(entities) && entities.includes('container:manage'));
      } catch (err) {
        if (mounted) setHasManage(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // 仅运行中的机器可创建（维护/离线机器不可选）
  const onlineMachines = machines.filter(m => (m.machine_status || '').toLowerCase() === 'online');

  // 选择机器：配额初始化/收敛进新机器的上限；CPU 机器 GPU 恒为 0。
  // 代建者：拉取该机器已授权用户作为 ROOT 用户候选，默认当前用户。
  const handleSelectMachine = async (m) => {
    const mid = m.machine_id ?? m.id;
    if (selectedMachine && String(selectedMachine.machine_id ?? selectedMachine.id) === String(mid)) {
      setSelectedMachine(null);
      setGpuCount(0);
      setCpuCount(1);
      setMemoryGb(1);
      setSharedGb(0);
      setRootUsers([]);
      setOwnerUserId(null);
      return;
    }
    setSelectedMachine(m);
    const isGpu = (m.machine_type || '').toUpperCase() === 'GPU';
    setGpuCount(!isGpu || (m.max_gpu_number ?? 0) <= 0 ? 0 : clampNum(gpuCount ?? 1, m.max_gpu_number, 0));
    setCpuCount(clampNum(cpuCount ?? 1, m.max_cpu_core_number, 1));
    setMemoryGb(clampNum(memoryGb ?? 1, m.max_memory_gb, 1));
    setSharedGb(clampNum(sharedGb ?? 0, m.max_shared_gb, 0));
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
      const cur = Number(localStorage.getItem('currentUserId') || 0);
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
  };

  const machineType = (selectedMachine?.machine_type || '').toUpperCase();
  const gpuLimit = machineType === 'GPU' ? (selectedMachine?.max_gpu_number ?? 0) : 0;

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
    const machineId = selectedMachine.machine_id ?? selectedMachine.id;
    const gpuList = gpuCount > 0 ? Array.from({ length: gpuCount }, (_, i) => i) : [];
    const payload = {
      // 普通用户不发 owner_user_id，后端归一为自己；代建者显式指定归属用户
      ...(hasManage && ownerUserId ? { owner_user_id: ownerUserId } : {}),
      user_name: currentUserName || '',
      user_id: currentUserId || null,
      machine_id: machineId,
      image_id: selectedImage.image_id,
      container: {
        GPU_LIST: gpuList,
        CPU_NUMBER: cpuCount || 1,
        MEMORY: memoryGb || 1,
        NAME: name.trim(),
        shared_memory: sharedGb || 0,
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
      } catch (e) {
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
                      <ResourceMeter label="CPU" cur={m.cpu_core_number} max={m.max_cpu_core_number} unit="核" />
                      <ResourceMeter label="内存" cur={m.memory_size_gb} max={m.max_memory_gb} unit="G" tone="memory" />
                      {isGpu && <ResourceMeter label="GPU" cur={m.gpu_number} max={m.max_gpu_number} tone="gpu" />}
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
            <Typography.Text type="secondary" className="cc-panel-sub">配额上限随所选机器自动约束</Typography.Text>
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
                  label="GPU 数" unit="块"
                  limit={gpuLimit} value={gpuCount} min={0}
                  onChange={setGpuCount}
                  disabled={!selectedMachine || machineType !== 'GPU'}
                />
                <QuotaRow
                  label="CPU 核数" unit="核"
                  limit={selectedMachine?.max_cpu_core_number ?? null} value={cpuCount} min={1}
                  onChange={setCpuCount}
                  disabled={!selectedMachine}
                />
                <QuotaRow
                  label="内存" unit="GB"
                  limit={selectedMachine?.max_memory_gb ?? null} value={memoryGb} min={1}
                  onChange={setMemoryGb}
                  disabled={!selectedMachine}
                />
                <QuotaRow
                  label="共享内存" unit="GB"
                  limit={selectedMachine?.max_shared_gb ?? 0} value={sharedGb} min={0}
                  onChange={setSharedGb}
                  disabled={!selectedMachine}
                />
              </div>
            </Card>
          </div>

          {/* 已选配置 + 提交 */}
          <div className="cc-submit-row">
            <div className="cc-summary">
              <span className="cc-summary-item">环境 <b className="cc-mono">{selectedImage?.name || selectedImage?.base_image || '—'}</b></span>
              <span className="cc-summary-item">机器 <b className="cc-mono">{selectedMachine?.machine_name || '—'}</b></span>
              <span className="cc-summary-item">配额 <b className="cc-mono">{gpuCount || 0} GPU / {cpuCount || 1} 核 / {memoryGb || 1}G</b></span>
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
