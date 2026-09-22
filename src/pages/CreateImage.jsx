import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Empty, Input, message, Modal, Segmented, Select, Spin, Switch, Tag, Typography } from 'antd';
import {
  CodeOutlined,
  DeleteOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import showErrorModal from '../utils/showErrorModal';
import { usePermission } from '../contexts/PermissionContext';
import {
  createImage,
  deleteImage,
  getImageDetailInformation,
  listImageBrefInformation,
  setImageValidRange,
  setImageVisibleUsers,
  updateImage,
} from '../api/image_api';
import { listAllUserBrefInformation } from '../api/user_api';
import './CreateImage.css';

const EMPTY_FORM = {
  image_id: null,
  name: '',
  description: '',
  status: 'draft',
  base_image: 'ubuntu:22.04',
  dockerfile_body: '',
  entrypoint: '',
  created_by_user_id: null,
  // 可见范围三态（后端唯一决定可见性的字段）：private / everyone / custom
  valid_range: 'custom',
  // 仅 custom 态后端才回显；其它态为 null（名单存着但不生效）
  visible_user_ids: [],
};

// 可见范围三态的中文口径。文案要能被"我要给谁看"直接对上：
// 平台此前"系统内置 = 全员可见"是派生规则，现在只有这一处开关说了算。
const VALID_RANGE_OPTIONS = [
  { value: 'private', label: '仅自己可见' },
  { value: 'everyone', label: '所有人可见' },
  { value: 'custom', label: '自定义可见范围' },
];

const VALID_RANGE_HINT = {
  private: '只有你自己能看到和使用这个模板。',
  everyone: '平台所有用户都能看到并使用这个模板。',
};

const sameIdSet = (a = [], b = []) => {
  const norm = list => [...new Set((list || []).map(String))].sort().join(',');
  return norm(a) === norm(b);
};

const normalizeUser = user => ({
  id: user?.id ?? user?.user_id ?? user?.key,
  username: user?.username || user?.name || '',
  name: user?.name || user?.username || '',
  // 邮箱不是展示字段（标签里太占地方），但**要能被搜出来**——同名同姓时它才是
  // 真正能把人区分开的那个标识（与 ManageMachine 的可用者选择器同一考虑）
  email: user?.email || '',
});

// 下拉项：列表里给全信息（含邮箱），标签里只留短的那一份。
// 搜索走 searchText 而不是 label：邮箱只在"搜"的时候参与，不在"显示"的时候占位。
const userOption = user => {
  const short = `${user.name} @${user.username}`;
  return {
    value: user.id,
    label: user.email ? `${short} <${user.email}>` : short,
    tagLabel: short,
    searchText: [user.name, user.username, user.email].join(' ').toLowerCase(),
  };
};

const filterUserOption = (input, option) =>
  String(option?.searchText || '').includes(String(input || '').toLowerCase());

const PLATFORM_INJECTION_PREVIEW = [
  '# 平台自动注入片段，实际内容由 ctrl 配置文件维护',
  'USER root',
  'RUN ... install openssh-server / useradd tools ...',
  'EXPOSE 22',
].join('\n');

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
  base_image: image.base_image || 'ubuntu:22.04',
  dockerfile_body: image.dockerfile_body ?? '',
  entrypoint: image.entrypoint ?? '',
  created_by_user_id: image.created_by_user_id ?? null,
  updated_at: image.updated_at || null,
  valid_range: image.valid_range || 'custom',
  // 非 custom 态后端不发这个键（它存着但不生效），折成空数组免得勾选状态画错
  visible_user_ids: Array.isArray(image.visible_user_ids) ? image.visible_user_ids : [],
});

export default function CreateImage() {
  // 身份与权限都来自 PermissionContext（服务端那一次请求给的）：不再自己发一份、
  // 也不读 localStorage 副本，页面不做认证门禁（2026-09 决策）。
  const {
    userId: currentUserId,
    entities: permissions,
    loaded: permissionsLoaded,
  } = usePermission();
  const [images, setImages] = useState([]);
  const [keyword, setKeyword] = useState('');
  const [mineOnly, setMineOnly] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  // 加载时的原始值快照：与当前表单逐字段比较，有变化才展示保存键
  const [originalForm, setOriginalForm] = useState(EMPTY_FORM);
  // 用户名单（自定义可见范围的选择器数据源）：按需加载，进页面不白拉一份
  const [usersList, setUsersList] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const canManage = permissions.includes('image:manage');
  const canEdit = permissions.includes('image:edit') || canManage;

  // ★ 两层口径，与后端逐条对齐（不是页面上自己发明的一套）：
  //   - `image:edit`（上面那层）：能不能碰这个页面
  //   - `image:owner`（这一层）：**只能动自己建的**——后端 update 与两个可见性入口
  //     挂的都是 require_resource("image:owner")，即 created_by_user_id == 自己。
  //   `image:manage` 是资源通配（user_has_resource 第 0 步直接放行），所以管理员照旧能改全部。
  //
  // 新建态（还没有 image_id）视为"将是自己的"，否则新建表单一点开就是灰的。
  const isOwner =
    form.created_by_user_id != null
    && String(form.created_by_user_id) === String(currentUserId);
  const canEditThis = canEdit && (!form.image_id || isOwner || canManage);

  // 脏检查：编辑字段与加载快照不一致 → 显示保存键（新建模式填了内容同样触发）
  const formDirty = useMemo(() => {
    const keys = ['name', 'description', 'status', 'base_image', 'dockerfile_body', 'entrypoint'];
    return (
      keys.some(k => (form[k] ?? '') !== (originalForm[k] ?? ''))
      || (form.valid_range || 'custom') !== (originalForm.valid_range || 'custom')
      || !sameIdSet(form.visible_user_ids, originalForm.visible_user_ids)
    );
  }, [form, originalForm]);

  const visibleImages = images;

  const loadImages = async (search = keyword) => {
    setLoadingList(true);
    try {
      const result = await listImageBrefInformation({
        page_number: 1,
        page_size: 100,
        image_search: search,
        mine_only: mineOnly || !canManage,
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
      const loaded = normalizeImage(result?.image || {});
      setForm(loaded);
      setOriginalForm(loaded);
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
    if (!permissionsLoaded || !currentUserId) return;
    loadImages(keyword);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permissionsLoaded, currentUserId, mineOnly, canManage]);

  useEffect(() => {
    if (!selectedId) return;
    if (visibleImages.some(item => String(item.image_id) === String(selectedId))) return;
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setOriginalForm(EMPTY_FORM);
  }, [selectedId, visibleImages]);

  const updateField = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  // 自定义可见范围要用到用户列表：切到 custom（或选中一个 custom 模板）时才拉，
  // 加载失败不阻断编辑——名单选择器空着即可，别的字段照常改。
  //
  // 用 ref 做"只拉一次"的闸，而不是把 usersList.length / usersLoading 放进依赖：
  // 后者会让 setUsersLoading(true) 自己触发一次重跑，上一次的 cleanup 把结果丢掉
  // （cancelled=true）→ 名单永远填不上（2026-09 被单测逮到）。
  const usersRequestedRef = useRef(false);
  useEffect(() => {
    // 只对**已存在**的模板拉：新建态还没有 image_id，可见范围那一栏根本不渲染
    if (!canEdit || !form.image_id) return;
    if ((form.valid_range || 'custom') !== 'custom') return;
    if (usersRequestedRef.current) return;
    usersRequestedRef.current = true;
    setUsersLoading(true);
    listAllUserBrefInformation({ page_number: 1, page_size: 200 })
      .then(res => {
        const raw = res?.users || res?.user_list || res?.data || [];
        setUsersList(
          Array.isArray(raw)
            ? raw.map(normalizeUser).filter(u => u.id !== undefined && u.id !== null)
            : []
        );
      })
      .catch(() => {
        // 失败就把闸放开：切走再切回来能重试，而不是一直空着
        usersRequestedRef.current = false;
      })
      .finally(() => setUsersLoading(false));
  }, [canEdit, form.image_id, form.valid_range]);

  const startCreate = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setOriginalForm(EMPTY_FORM);
  };

  const saveImage = async () => {
    const name = form.name.trim();
    const baseImage = form.base_image.trim();
    const dockerfileBody = form.dockerfile_body.trimEnd();
    // entrypoint 的"空"是**有意义的取值**（= 回到平台默认），所以必须原样发空串：
    // 后端 update 走 exclude_none，发 null 会被丢掉 = 什么都不改，"清空"就成了假功能。
    const entrypoint = form.entrypoint.trim();
    if (!name) {
      message.warning('请填写模板名称');
      return;
    }
    if (!baseImage) {
      message.warning('请填写基础镜像');
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
          base_image: baseImage,
          dockerfile_body: dockerfileBody,
          entrypoint,
        });
        // 可见范围走**它自己的两个入口**，不并进 update_image：那是分享事件，
        // 与"改内容"分开记审计。顺序是硬约束——先定态、再改名单，否则后端按
        // not_custom_range 拒绝（非 custom 态下改名单是没有意义的行为）。
        const rangeChanged = (form.valid_range || 'custom') !== (originalForm.valid_range || 'custom');
        const usersChanged = !sameIdSet(form.visible_user_ids, originalForm.visible_user_ids);
        if (rangeChanged) {
          await setImageValidRange({ image_id: form.image_id, valid_range: form.valid_range });
        }
        if ((form.valid_range || 'custom') === 'custom' && (rangeChanged || usersChanged)) {
          await setImageVisibleUsers({
            image_id: form.image_id,
            user_ids: (form.visible_user_ids || []).map(Number),
          });
        }
        message.success('模板已保存');
        await selectImage(form.image_id);
      } else {
        const result = await createImage({
          name,
          description: form.description || '',
          status: form.status,
          base_image: baseImage,
          dockerfile_body: dockerfileBody,
          entrypoint,
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
      setOriginalForm(EMPTY_FORM);
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
      content: `确认删除「${form.name || form.image_id}」？此操作会移除该环境模板。`,
      okText: '删除',
      okType: 'danger',
      cancelText: '取消',
      onOk: doRemoveImage,
    });
  };

  if (!permissionsLoaded) {
    return (
      <div className="ci-page ci-denied" style={{ padding: 48, textAlign: 'center' }}>
        <Spin />
      </div>
    );
  }
  if (!canEdit) {
    return (
      <div className="ci-page ci-denied" style={{ padding: 48, textAlign: 'center' }}>
        <Typography.Title level={4}>无权限</Typography.Title>
        <Typography.Text type="secondary">环境模板为编辑管理页，需要 image:edit 权限（教师/管理员），请联系管理员。</Typography.Text>
      </div>
    );
  }

  return (
    <div className="ci-page">
      <aside className="ci-list-panel">
        <div className="ci-panel-head">
          <div>
            <Typography.Title level={4} className="ci-title">环境模板</Typography.Title>
            <Typography.Text type="secondary" className="ci-subtitle">Dockerfile 环境定义</Typography.Text>
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
            {/* 灰着就得说清为什么灰：否则用户会以为是页面坏了（后端那条闸也是
                created_by == 自己，这里只是把它说出口） */}
            {form.image_id && !canEditThis ? (
              <Typography.Text type="secondary" className="ci-readonly-hint">
                该模板由他人创建，你只能查看——内容编辑与可见范围都只对自己创建的模板开放。
              </Typography.Text>
            ) : null}
          </div>
          <div className="ci-actions">
            {form.image_id && canManage && (
              <Button danger icon={<DeleteOutlined />} loading={deleting} onClick={removeImage}>
                删除
              </Button>
            )}
            {formDirty && (
              <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveImage} disabled={!canEditThis}>
                保存
              </Button>
            )}
          </div>
        </div>

        <Spin spinning={loadingDetail}>
          <div className="ci-form-grid">
            <label className="ci-field">
              <span>模板名称</span>
              <Input value={form.name} onChange={e => updateField('name', e.target.value)} disabled={!canEditThis} />
            </label>
            <label className="ci-field">
              <span>状态</span>
              <Select
                value={form.status}
                onChange={value => updateField('status', value)}
                disabled={!canEditThis}
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
                disabled={!canEditThis}
              />
            </label>

            {/* 可见范围：只对**已存在**的模板开放（新建时还没有 image_id，无从设置）。
                前端只在 custom 态给名单选择器——非 custom 态后端会拒绝改名单，
                所以这里干脆不提供入口，免得点了才发现无效。 */}
            {form.image_id ? (
              <div className="ci-field ci-field-wide">
                <span>可见范围</span>
                <Segmented
                  value={form.valid_range || 'custom'}
                  onChange={value => updateField('valid_range', value)}
                  disabled={!canEditThis}
                  options={VALID_RANGE_OPTIONS}
                />
                {(form.valid_range || 'custom') === 'custom' ? (
                  <Select
                    mode="multiple"
                    allowClear
                    showSearch
                    placeholder="选择可以使用这个模板的用户（可按姓名、用户名或邮箱搜索）"
                    filterOption={filterUserOption}
                    // 标签用短的（tagLabel），下拉里用长的（label）——邮箱不挤进标签
                    optionLabelProp="tagLabel"
                    loading={usersLoading}
                    disabled={!canEditThis}
                    value={(form.visible_user_ids || []).map(Number)}
                    onChange={values => updateField('visible_user_ids', values)}
                    options={usersList.map(userOption)}
                  />
                ) : (
                  <Typography.Text type="secondary" className="ci-range-hint">
                    {VALID_RANGE_HINT[form.valid_range] || ''}
                    原有的授权名单会保留，切回「自定义可见范围」即可继续编辑。
                  </Typography.Text>
                )}
              </div>
            ) : null}
          </div>

          <div className="ci-code-grid">
            <div className="ci-code-card">
              <div className="ci-code-head">
                <span><FileTextOutlined /> Dockerfile</span>
              </div>
              <div className="ci-code-section ci-code-from-row">
                <span className="ci-code-from-label">FROM</span>
                <Input.TextArea
                  className="ci-code-area ci-code-area-from"
                  value={form.base_image}
                  onChange={e => updateField('base_image', e.target.value)}
                  disabled={!canEditThis}
                  spellCheck={false}
                  autoSize={{ minRows: 1, maxRows: 2 }}
                  placeholder="ubuntu:22.04"
                />
              </div>
              <div className="ci-code-section">
                <Input.TextArea
                  className="ci-code-area ci-code-area-platform"
                  value={PLATFORM_INJECTION_PREVIEW}
                  disabled
                  spellCheck={false}
                />
              </div>
              <div className="ci-code-section">
                <Input.TextArea
                  className="ci-code-area ci-code-area-body"
                  value={form.dockerfile_body}
                  onChange={e => updateField('dockerfile_body', e.target.value)}
                  disabled={!canEditThis}
                  spellCheck={false}
                  placeholder="WORKDIR /workspace&#10;RUN pip install -r requirements.txt"
                />
              </div>
              <div className="ci-code-section ci-code-entrypoint-row">
                <span className="ci-code-from-label">ENTRYPOINT</span>
                <Input.TextArea
                  className="ci-code-area ci-code-area-entrypoint"
                  value={form.entrypoint}
                  onChange={e => updateField('entrypoint', e.target.value)}
                  disabled={!canEditThis}
                  spellCheck={false}
                  maxLength={255}
                  autoSize={{ minRows: 1, maxRows: 2 }}
                  placeholder="留空 = 平台默认（保持容器存活）"
                />
              </div>
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
