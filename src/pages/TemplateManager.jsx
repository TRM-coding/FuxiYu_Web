import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Row, Col, Button, Card, Input, Space, Tag, Modal,
  Form, Select, message, Empty, Popconfirm, Divider
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

export default function TemplateManager() {
  const navigate = useNavigate();

  // ── 列表状态 ──────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);

  // ── 编辑弹窗状态 ──────────────────────────────────────────────────
  const [editVisible, setEditVisible] = useState(false);
  const [editMode, setEditMode] = useState('create'); // create | edit
  const [editTarget, setEditTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  // ══════════════════════════════════════════════════════════════════
  // 数据加载
  // ══════════════════════════════════════════════════════════════════

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTemplates({ limit: 200 });
      setTemplates(res?.templates || []);
    } catch (e) {
      console.error('loadTemplates', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

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

  const openEdit = async (template) => {
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
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setSaving(true);
      const payload = {
        name: values.name,
        subject_template: values.subject_template,
        body_template: values.body_template,
        description: values.description,
        category: values.category,
      };

      if (editMode === 'edit' && editTarget) {
        await updateTemplate(editTarget.id, payload);
        message.success('模板已更新');
      } else {
        await createTemplate(payload);
        message.success('模板已创建');
      }
      setEditVisible(false);
      loadTemplates();
    } catch (err) {
      if (err?.body) {
        await showErrorModal({ message: err.body.message || '保存失败', status: err.status });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (template) => {
    try {
      await deleteTemplate(template.id);
      message.success('模板已删除');
      loadTemplates();
    } catch (err) {
      await showErrorModal({ message: err?.body?.message || '删除失败', status: err?.status });
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
                <Select>
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
