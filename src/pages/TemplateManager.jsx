import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography, Row, Col, Button, Card, Input, Space, Tag, Modal,
  Form, Select, message, Empty, Popconfirm, Divider, Pagination
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined, ArrowLeftOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import {
  listTemplates, createTemplate, updateTemplate, deleteTemplate, getTemplate
} from '../api/announcement_api';
import showErrorModal from '../utils/showErrorModal';
import './TemplateManager.css';

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const TEMPLATE_PAGE_SIZE = 200;

export default function TemplateManager() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const deepLinkId = searchParams.get('template_id');

  // ── 列表状态 ──────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState(null);

  // ── 编辑弹窗状态 ──────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editMode, setEditMode] = useState('create'); // create | edit
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const deepLinkHandledRef = useRef(null);

  // ══════════════════════════════════════════════════════════════════
  // 编辑/新建
  // ══════════════════════════════════════════════════════════════════

  const openCreate = () => {
    setEditMode('create');
    setEditTarget(null);
    form.resetFields();
    form.setFieldsValue({ category: 'custom' });
    setEditVisible(true);
  };

  const openEdit = useCallback((template) => {
    setEditMode('edit');
    setEditTarget(template);
    form.setFieldsValue({
      name: template.name,
      description: template.description,
      subject_template: template.subject_template,
      body_template: template.body_template,
      category: template.category,
    });
    setEditVisible(true);
  }, [form]);

  // ══════════════════════════════════════════════════════════════════
  // 数据加载：按 200/页取服务端列表；深链目标不在当前页时用 getTemplate 定位。
  // ══════════════════════════════════════════════════════════════════

  const loadTemplates = useCallback(async (targetPage) => {
    setLoading(true);
    try {
      const offset = targetPage * TEMPLATE_PAGE_SIZE;
      const res = await listTemplates({ limit: TEMPLATE_PAGE_SIZE, offset });
      const items = res?.templates || [];
      setTemplates(items);
      setTotal(Number(res?.total) || items.length);

      if (!deepLinkId || deepLinkHandledRef.current === deepLinkId) return;
      deepLinkHandledRef.current = deepLinkId;
      setDeepLinkError(null);

      const target = items.find(tp => String(tp.id) === String(deepLinkId));
      if (target) {
        openEdit(target);
        return;
      }

      const numericId = Number(deepLinkId);
      if (!Number.isInteger(numericId) || numericId <= 0) {
        setDeepLinkError('模板不存在');
        return;
      }
      try {
        const detail = await getTemplate(numericId);
        const targetTemplate = detail?.template || detail;
        if (targetTemplate && targetTemplate.id != null) {
          openEdit(targetTemplate);
        } else {
          setDeepLinkError('模板不存在');
        }
      } catch {
        setDeepLinkError('模板不存在');
      }
    } catch (e) {
      console.error('loadTemplates', e);
    } finally {
      setLoading(false);
    }
  }, [deepLinkId, openEdit]);

  useEffect(() => { loadTemplates(page); }, [loadTemplates, page]);

  const isSystemEdit = editMode === 'edit' && editTarget?.category === 'system';

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        name: values.name,
        subject_template: values.subject_template,
        body_template: values.body_template,
        description: values.description,
        category: isSystemEdit ? editTarget.category : values.category,
      };

      if (editMode === 'edit' && editTarget) {
        await updateTemplate(editTarget.id, payload);
        message.success('模板已更新');
      } else {
        await createTemplate(payload);
        message.success('模板已创建');
      }
      setEditVisible(false);
      loadTemplates(page);
    } catch (err) {
      // 表单校验失败不是接口错误，不弹错误弹窗；接口错误统一传结构化 body + route/status。
      if (err?.errorFields) return;
      await showErrorModal({
        message: err?.body || err,
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    try {
      await deleteTemplate(template.id);
      message.success('模板已删除');
      loadTemplates(page);
    } catch (err) {
      await showErrorModal({
        message: err?.body || err,
        status: err?.status,
        route: err?.route,
      });
    }
  };

  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="tm-root">
      {/* ── 顶部导航 ─────────────────────────────────────────────── */}
      <Row justify="space-between" align="middle" className="tm-top-bar">
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/announcements')}>
              返回门户
            </Button>
            <Title level={4} style={{ margin: 0 }}>模板管理</Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新建模板
          </Button>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {deepLinkError ? (
        <div className="tm-deep-link-error">
          <Text type="danger">{deepLinkError}</Text>
        </div>
      ) : null}

      {/* ── 模板列表 ─────────────────────────────────────────────── */}
      <Row gutter={[16, 16]}>
        {templates.map(t => {
          const isSystem = t.category === 'system';
          return (
            <Col xs={24} sm={12} md={8} lg={6} key={t.id}>
              <Card
                size="small"
                hoverable
                className="tm-card"
                actions={[
                  <EditOutlined key="edit" onClick={() => openEdit(t)} />,
                  !isSystem && (
                    <Popconfirm
                      key="delete"
                      title="确定删除此模板？"
                      onConfirm={() => handleDelete(t)}
                      okText="删除" cancelText="取消"
                    >
                      <DeleteOutlined style={{ color: '#ff4d4f' }} />
                    </Popconfirm>
                  ),
                ].filter(Boolean)}
              >
                <Card.Meta
                  title={
                    <Space>
                      <Text ellipsis style={{ maxWidth: 160 }}>{t.name}</Text>
                      <Tag color={isSystem ? 'blue' : 'green'}>{isSystem ? '系统' : '自定义'}</Tag>
                    </Space>
                  }
                  description={
                    <>
                      <Paragraph ellipsis={{ rows: 1 }} type="secondary">
                        {t.description || '(无描述)'}
                      </Paragraph>
                      <div style={{ marginTop: 8 }}>
                        <Paragraph ellipsis={{ rows: 2 }} type="secondary" style={{ fontSize: 12 }}>
                          主题: {t.subject_template}
                        </Paragraph>
                      </div>
                    </>
                  }
                />
              </Card>
            </Col>
          );
        })}
        {templates.length === 0 && !loading && (
          <Col span={24}>
            <Empty description="暂无模板" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          </Col>
        )}
      </Row>

      {total > TEMPLATE_PAGE_SIZE ? (
        <div className="tm-pagination">
          <Pagination
            current={page + 1}
            pageSize={TEMPLATE_PAGE_SIZE}
            total={total}
            showSizeChanger={false}
            onChange={(nextPage) => setPage(nextPage - 1)}
          />
        </div>
      ) : null}

      {/* ── 新建/编辑模板弹窗 ─────────────────────────────────────── */}
      <Modal
        open={editVisible}
        title={editMode === 'create' ? '新建模板' : `编辑模板 — ${editTarget?.name || ''}`}
        onCancel={() => setEditVisible(false)}
        onOk={handleSave}
        confirmLoading={saving}
        width={700}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={16}>
              <Form.Item
                name="name"
                label="模板名称"
                rules={[{ required: true, message: '请输入模板名称' }]}
              >
                <Input placeholder="模板名称" maxLength={120} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="category" label="类别" initialValue="custom">
                <Select disabled={isSystemEdit}>
                  <Select.Option value="custom">自定义</Select.Option>
                  <Select.Option value="system">系统</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="描述">
            <Input placeholder="模板描述（可选）" maxLength={500} />
          </Form.Item>

          <Form.Item
            name="subject_template"
            label="主题模板"
            rules={[{ required: true, message: '请输入主题模板' }]}
          >
            <Input placeholder="邮件主题（纯文字）" maxLength={200} />
          </Form.Item>

          <Form.Item
            name="body_template"
            label="正文模板"
            rules={[{ required: true, message: '请输入正文模板' }]}
          >
            <TextArea
              placeholder="邮件正文（纯文字）"
              rows={8}
              autoSize={{ minRows: 6, maxRows: 20 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
