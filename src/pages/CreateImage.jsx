import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, message, Modal, Select, Spin, Switch, Tag, Typography } from 'antd';
import {
  CodeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import showErrorModal from '../utils/showErrorModal';
import { handleAuthError } from '../utils/authHelpers';
import { useNavigate } from 'react-router-dom';
import { getUserPermissions } from '../api/user_api';
import {
  createImage,
  deleteImage,
  getImageDetailInformation,
  listImageBrefInformation,
  updateImage,
} from '../api/image_api';
import './CreateImage.css';

const EMPTY_FORM = {
  image_id: null,
  name: '',
  description: '',
  status: 'draft',
  dockerfile: 'FROM ubuntu:22.04\n',
  pre_build: '',
  created_by_user_id: null,
};

const statusText = {
  draft: '草稿',
  ready: '可用',
  disabled: '停用',
};

const statusColor = {
  draft: 'default',
  ready: 'green',
  disabled: 'red',
};

const normalizeImage = (image = {}) => ({
  image_id: image.image_id ?? image.id ?? null,
  name: image.name || '',
  description: image.description || '',
  status: image.status || 'draft',
  dockerfile: image.dockerfile ?? '',
  pre_build: image.pre_build ?? '',
  created_by_user_id: image.created_by_user_id ?? null,
  updated_at: image.updated_at || null,
});

export default function CreateImage() {
  const navigate = useNavigate();
  const [currentUserId, setCurrentUserId] = useState(null);
  const [permissions, setPermissions] = useState([]);
  const [images, setImages] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [mineOnly, setMineOnly] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const canManage = permissions.includes('image:manage');
  const canEdit = permissions.includes('image:edit') || canManage;

  const visibleImages = useMemo(() => {
    if (!mineOnly || !canManage) return images;
    return images.filter(item => Number(item.created_by_user_id || 0) === Number(currentUserId || 0));
  }, [images, mineOnly, canManage, currentUserId]);

  const loadImages = async (search = keyword) => {
    setLoadingList(true);
    try {
      const result = await listImageBrefInformation({
        page_number: 1,
        page_size: 100,
        image_search: search,
      });
      const items = Array.isArray(result?.images) ? result.images.map(normalizeImage) : [];
      setImages(items);
      if (!selectedId && items.length > 0) {
        await selectImage(items[0].image_id);
      }
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '加载环境模板失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setLoadingList(false);
    }
  };

  const selectImage = async (imageId) => {
    if (!imageId) return;
    setSelectedId(imageId);
    setLoadingDetail(true);
    try {
      const result = await getImageDetailInformation(imageId);
      setForm(normalizeImage(result?.image || {}));
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '加载模板详情失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  useEffect(() => {
    const name = localStorage.getItem('currentUserName');
    const id = localStorage.getItem('currentUserId');
    if (!name || !id) {
      handleAuthError(401, navigate);
      return;
    }
    setCurrentUserId(Number(id));
    let mounted = true;
    (async () => {
      try {
        const list = await getUserPermissions();
        if (mounted) setPermissions(Array.isArray(list) ? list : []);
      } catch (err) {
        if (err?.status === 401) handleAuthError(401, navigate);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  useEffect(() => {
    loadImages('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
  };

  const saveImage = async () => {
    const name = form.name.trim();
    const dockerfile = form.dockerfile.trimEnd();
    if (!name) {
      message.warning('请填写模板名称');
      return;
    }
    if (!dockerfile.trim()) {
      message.warning('Dockerfile 不能为空');
      return;
    }
    setSaving(true);
    try {
      if (form.image_id) {
        await updateImage({
          image_id: form.image_id,
          name,
          description: form.description || '',
          status: form.status,
          dockerfile,
          pre_build: form.pre_build || '',
        });
        message.success('模板已保存');
        await selectImage(form.image_id);
      } else {
        const result = await createImage({
          name,
          description: form.description || '',
          dockerfile,
          pre_build: form.pre_build || null,
        });
        message.success('模板已创建');
        await loadImages(keyword);
        if (result?.image_id) await selectImage(result.image_id);
      }
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '保存环境模板失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setSaving(false);
    }
  };

  const doRemoveImage = async () => {
    if (!form.image_id) return;
    setDeleting(true);
    try {
      await deleteImage(form.image_id);
      message.success('模板已删除');
      setSelectedId(null);
      setForm(EMPTY_FORM);
      await loadImages(keyword);
    } catch (err) {
      await showErrorModal({
        message: err?.body || err || '删除环境模板失败',
        status: err?.status || err?.response?.status,
        route: err?.route || err?.response?.url,
      });
    } finally {
      setDeleting(false);
    }
  };

  const removeImage = () => {
    Modal.confirm({
      title: '删除环境模板',
      content: `确认删除「${form.name || form.image_id}」？此操作会同时移除 Dockerfile 与 pre_build.sh 文件。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: doRemoveImage,
    });
  };

  return (
    <div className="ci-page">
      <aside className="ci-list-panel">
        <div className="ci-panel-head">
          <div>
            <Typography.Title level={4} className="ci-title">环境模板</Typography.Title>
            <Typography.Text type="secondary" className="ci-subtitle">Dockerfile 与构建前脚本</Typography.Text>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={startCreate} disabled={!canEdit}>
            新建
          </Button>
        </div>

        <div className="ci-search-row">
          <Input.Search
            allowClear
            placeholder="搜索模板、ID、描述"
            value={keyword}
            onChange={e => setKeyword(e.target.value)}
            onSearch={value => loadImages(value)}
          />
          <Button icon={<ReloadOutlined />} onClick={() => loadImages(keyword)} />
        </div>

        {canManage && (
          <div className="ci-mine-row">
            <span>仅看我创建的</span>
            <Switch size="small" checked={mineOnly} onChange={setMineOnly} />
          </div>
        )}

        <div className="ci-image-list">
          {loadingList ? (
            <div className="ci-loading"><Spin /></div>
          ) : visibleImages.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无环境模板" />
          ) : visibleImages.map(item => (
            <button
              type="button"
              key={item.image_id}
              className={`ci-image-card ${String(selectedId) === String(item.image_id) ? 'is-selected' : ''}`}
              onClick={() => selectImage(item.image_id)}
            >
              <span className="ci-image-icon"><CodeOutlined /></span>
              <span className="ci-image-copy">
                <span className="ci-image-name">{item.name}</span>
                <span className="ci-image-desc">{item.description || '未填写描述'}</span>
                <span className="ci-image-meta">
                  <span>ID {item.image_id}</span>
                  <Tag color={statusColor[item.status] || 'default'}>{statusText[item.status] || item.status}</Tag>
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className="ci-editor-panel">
        <div className="ci-editor-head">
          <div>
            <Typography.Title level={4} className="ci-title">
              {form.image_id ? form.name || '编辑模板' : '新建环境模板'}
            </Typography.Title>
            <Typography.Text type="secondary" className="ci-subtitle">
              前台称为环境模板，技术层保存为镜像定义
            </Typography.Text>
          </div>
          <div className="ci-actions">
            {form.image_id && canManage && (
              <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={removeImage}>
                删除
              </Button>
            )}
            <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveImage} disabled={!canEdit}>
              保存
            </Button>
          </div>
        </div>

        <Spin spinning={loadingDetail}>
          <div className="ci-form-grid">
            <label className="ci-field">
              <span>模板名称</span>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} disabled={!canEdit} />
            </label>
            <label className="ci-field">
              <span>状态</span>
              <Select
                value={form.status}
                onChange={value => updateField('status', value)}
                disabled={!canEdit}
                options={[
                  { value: 'draft', label: '草稿' },
                  { value: 'ready', label: '可用' },
                  { value: 'disabled', label: '停用' },
                ]}
              />
            </label>
            <label className="ci-field ci-field-wide">
              <span>描述</span>
              <Input.TextArea
                autoSize={{ minRows: 2, maxRows: 4 }}
                value={form.description}
                onChange={e => updateField('description', e.target.value)}
                disabled={!canEdit}
              />
            </label>
          </div>

          <div className="ci-code-grid">
            <div className="ci-code-card">
              <div className="ci-code-head">
                <span><FileTextOutlined /> Dockerfile</span>
                <Tag color="blue">必填</Tag>
              </div>
              <Input.TextArea
                className="ci-code-area"
                value={form.dockerfile}
                onChange={e => updateField('dockerfile', e.target.value)}
                disabled={!canEdit}
                spellCheck={false}
              />
            </div>

            <div className="ci-code-card">
              <div className="ci-code-head">
                <span><FileTextOutlined /> pre_build.sh</span>
                <Tag>可选</Tag>
              </div>
              <Input.TextArea
                className="ci-code-area"
                value={form.pre_build}
                onChange={e => updateField('pre_build', e.target.value)}
                disabled={!canEdit}
                spellCheck={false}
                placeholder="# docker build 前的准备脚本"
              />
            </div>
          </div>

          <div className="ci-review-placeholder">
            <Typography.Text strong>静态检查与审查结果</Typography.Text>
            <Typography.Text type="secondary">hadolint / ShellCheck / 审查流后续接入，这里先保留固定位置。</Typography.Text>
          </div>
        </Spin>
      </section>
    </div>
  );
}
