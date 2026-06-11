import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Typography, Row, Col, Button, Card, Checkbox, Tag, Space, Modal, Select,
  Input, message, Spin, Empty, Popconfirm, Descriptions, Divider
} from 'antd';
import {
  PlusOutlined, SendOutlined, EditOutlined, DeleteOutlined,
  ReloadOutlined, CopyOutlined, FileTextOutlined, TeamOutlined,
  DesktopOutlined, CloudServerOutlined, UserOutlined, CloseOutlined
} from '@ant-design/icons';
import {
  listDrafts, deleteDraft, batchSendDrafts, resolveTargets,
  listAnnouncements, copyAnnouncementAsDraft, resendAnnouncement, convertToTemplate,
  deleteAnnouncement, batchDeleteAnnouncements
} from '../api/announcement_api';
import { listAllMachineBrefInformation } from '../api/machine_api';
import { listAllContainerBrefInformation } from '../api/container_api';
import { listAllUserBrefInformation } from '../api/user_api';
import showErrorModal from '../utils/showErrorModal';
import './Announcements.css';

const { Text, Title } = Typography;

const STATUS_COLOR = { sent: 'green', partial: 'orange', failed: 'red' };
const STATUS_LABEL = { sent: '已发送', partial: '部分失败', failed: '发送失败' };

export default function Announcements() {
  const navigate = useNavigate();

  // ── 收件人选择栏状态 ──────────────────────────────────────────────
  const [selectedTargets, setSelectedTargets] = useState([]);        // [{type, id, label}]
  const [recipientCount, setRecipientCount] = useState(0);
  const [resolvingTargets, setResolvingTargets] = useState(false);
  const [targetPickerVisible, setTargetPickerVisible] = useState(false);
  const [targetPickerType, setTargetPickerType] = useState('user');    // user | machine | container
  const [targetPickerOptions, setTargetPickerOptions] = useState([]);
  const [targetPickerLoading, setTargetPickerLoading] = useState(false);

  // ── 草稿区状态 ─────────────────────────────────────────────────────
  const [drafts, setDrafts] = useState([]);
  const [draftsLoading, setDraftsLoading] = useState(false);
  const [checkedDraftIds, setCheckedDraftIds] = useState([]);

  // ── 已发送区状态 ──────────────────────────────────────────────────
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [partialCount, setPartialCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // ── 批量发送状态 ──────────────────────────────────────────────────
  const [sending, setSending] = useState(false);
  const [sendResultVisible, setSendResultVisible] = useState(false);
  const [sendResults, setSendResults] = useState([]);
  const [checkedAnnouncementIds, setCheckedAnnouncementIds] = useState([]);
  const [deleting, setDeleting] = useState(false);

  // ══════════════════════════════════════════════════════════════════
  // 数据加载
  // ══════════════════════════════════════════════════════════════════

  const loadDrafts = useCallback(async () => {
    setDraftsLoading(true);
    try {
      const res = await listDrafts({ limit: 100 });
      setDrafts(res?.drafts || []);
    } catch (e) {
      console.error('loadDrafts', e);
    } finally {
      setDraftsLoading(false);
    }
  }, []);

  const loadAnnouncements = useCallback(async () => {
    setAnnouncementsLoading(true);
    try {
      const res = await listAnnouncements({ limit: 50 });
      setAnnouncements(res?.announcements || []);
      setSentCount(res?.sent_count ?? 0);
      setPartialCount(res?.partial_count ?? 0);
      setFailedCount(res?.failed_count ?? 0);
    } catch (e) {
      console.error('loadAnnouncements', e);
    } finally {
      setAnnouncementsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDrafts();
    loadAnnouncements();
  }, [loadDrafts, loadAnnouncements]);

  // ══════════════════════════════════════════════════════════════════
  // 收件人选择
  // ══════════════════════════════════════════════════════════════════

  const refreshRecipientCount = async (targets) => {
    if (!targets || targets.length === 0) {
      setRecipientCount(0);
      return;
    }
    setResolvingTargets(true);
    try {
      const res = await resolveTargets(targets.map(t => ({ type: t.type, id: t.id })));
      setRecipientCount(res?.recipient_count ?? 0);
    } catch (e) {
      setRecipientCount(0);
    } finally {
      setResolvingTargets(false);
    }
  };

  const openTargetPicker = async (type) => {
    setTargetPickerType(type);
    setTargetPickerVisible(true);
    setTargetPickerLoading(true);
    try {
      let items = [];
      if (type === 'machine') {
        const res = await listAllMachineBrefInformation({ page_number: 0, page_size: 500 });
        items = (res?.machines || []).map(m => ({
          id: m.machine_id,
          label: `${m.machine_name} (${m.machine_ip})`,
          type: 'machine'
        }));
      } else if (type === 'container') {
        const res = await listAllContainerBrefInformation({ page_number: 0, page_size: 500 });
        items = (res?.containers_info || res?.containers || []).map(c => ({
          id: c.container_id || c.id,
          label: `${c.container_name || c.name} (port:${c.port})`,
          type: 'container'
        }));
      } else {
        const res = await listAllUserBrefInformation({ page_number: 0, page_size: 500 });
        items = (res?.users || res?.users_info || []).map(u => ({
          id: u.user_id || u.id,
          label: `${u.username || u.name} (${u.email || ''})`,
          type: 'user'
        }));
      }
      setTargetPickerOptions(items);
    } catch (e) {
      console.error('load target options', e);
      setTargetPickerOptions([]);
    } finally {
      setTargetPickerLoading(false);
    }
  };

  const addTarget = (item) => {
    const key = `${item.type}-${item.id}`;
    if (selectedTargets.find(t => `${t.type}-${t.id}` === key)) return;
    const updated = [...selectedTargets, item];
    setSelectedTargets(updated);
    refreshRecipientCount(updated);
    setTargetPickerVisible(false);
  };

  const removeTarget = (item) => {
    const updated = selectedTargets.filter(t => !(t.type === item.type && t.id === item.id));
    setSelectedTargets(updated);
    refreshRecipientCount(updated);
  };

  // ══════════════════════════════════════════════════════════════════
  // 草稿操作
  // ══════════════════════════════════════════════════════════════════

  const handleToggleDraft = (draftId) => {
    setCheckedDraftIds(prev =>
      prev.includes(draftId) ? prev.filter(id => id !== draftId) : [...prev, draftId]
    );
  };

  const handleEditDraft = (draftId, e) => {
    e.stopPropagation();
    navigate(`/admin/announcements/editor?draft_id=${draftId}`);
  };

  const handleDeleteDraft = async (draftId, e) => {
    e?.stopPropagation();
    try {
      await deleteDraft(draftId);
      message.success('草稿已删除');
      setCheckedDraftIds(prev => prev.filter(id => id !== draftId));
      loadDrafts();
    } catch (err) {
      await showErrorModal({ message: '删除草稿失败', status: err?.status });
    }
  };

  const handleBatchSend = async () => {
    if (checkedDraftIds.length === 0) {
      message.warning('请至少勾选一个草稿');
      return;
    }
    if (selectedTargets.length === 0) {
      message.warning('请添加收件人');
      return;
    }
    setSending(true);
    try {
      const res = await batchSendDrafts({
        draft_ids: checkedDraftIds,
        targets: selectedTargets.map(t => ({ type: t.type, id: t.id })),
      });
      setSendResults(res?.results || []);
      setSendResultVisible(true);
      setCheckedDraftIds([]);
      setSelectedTargets([]);
      setRecipientCount(0);
      loadDrafts();
      loadAnnouncements();
    } catch (err) {
      await showErrorModal({ message: err?.body?.message || '批量发送失败', status: err?.status });
    } finally {
      setSending(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 已发送公告操作
  // ══════════════════════════════════════════════════════════════════

  const handleResend = async (annId) => {
    try {
      await resendAnnouncement(annId);
      message.success('已重新发送');
      loadAnnouncements();
    } catch (err) {
      await showErrorModal({ message: err?.body?.message || '重发失败', status: err?.status });
    }
  };

  const handleCopyAsDraft = async (annId) => {
    try {
      const res = await copyAnnouncementAsDraft(annId);
      message.success('已复用为草稿');
      loadDrafts();
    } catch (err) {
      await showErrorModal({ message: '复用失败', status: err?.status });
    }
  };

  const handleConvertToTemplate = async (annId) => {
    try {
      await convertToTemplate(annId);
      message.success('已转为模板');
    } catch (err) {
      await showErrorModal({ message: '转模板失败', status: err?.status });
    }
  };

  const handleToggleAnnouncement = (annId) => {
    setCheckedAnnouncementIds(prev =>
      prev.includes(annId) ? prev.filter(id => id !== annId) : [...prev, annId]
    );
  };

  const handleDeleteAnnouncement = async (annId, e) => {
    e?.stopPropagation();
    try {
      await deleteAnnouncement(annId);
      message.success('公告已删除');
      setCheckedAnnouncementIds(prev => prev.filter(id => id !== annId));
      loadAnnouncements();
    } catch (err) {
      await showErrorModal({ message: '删除失败', status: err?.status });
    }
  };

  const handleBatchDeleteAnnouncements = async () => {
    if (checkedAnnouncementIds.length === 0) {
      message.warning('请至少勾选一个公告');
      return;
    }
    setDeleting(true);
    try {
      await batchDeleteAnnouncements({ announcement_ids: checkedAnnouncementIds });
      message.success(`已删除 ${checkedAnnouncementIds.length} 条公告`);
      setCheckedAnnouncementIds([]);
      loadAnnouncements();
    } catch (err) {
      await showErrorModal({ message: '批量删除失败', status: err?.status });
    } finally {
      setDeleting(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 导航
  // ══════════════════════════════════════════════════════════════════

  const goToEditor = () => navigate('/admin/announcements/editor');
  const goToTemplates = () => navigate('/admin/announcements/templates');

  // ══════════════════════════════════════════════════════════════════
  // 渲染
  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="ann-root">
      {/* ── 顶部导航 ───────────────────────────────────────────── */}
      <Row justify="space-between" align="middle" className="ann-top-bar">
        <Col>
          <Title level={4} style={{ margin: 0 }}>公告管理</Title>
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={goToEditor}>创建公告</Button>
            <Button icon={<FileTextOutlined />} onClick={goToTemplates}>模板管理</Button>
            <Button icon={<ReloadOutlined />} onClick={() => { loadDrafts(); loadAnnouncements(); }}>刷新</Button>
          </Space>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      {/* ── 收件人选择栏（公共操作区）───────────────────────────── */}
      <Card size="small" className="ann-recipient-bar">
        <Row align="middle" gutter={[12, 8]}>
          <Col flex="auto">
            <Space wrap size={[4, 4]}>
              {selectedTargets.map(t => (
                <Tag
                  key={`${t.type}-${t.id}`}
                  closable
                  onClose={() => removeTarget(t)}
                  icon={t.type === 'machine' ? <DesktopOutlined /> : t.type === 'container' ? <CloudServerOutlined /> : <UserOutlined />}
                  color={t.type === 'machine' ? 'blue' : t.type === 'container' ? 'green' : 'purple'}
                >
                  {t.label}
                </Tag>
              ))}
              <Button
                size="small"
                type="dashed"
                icon={<PlusOutlined />}
                onClick={() => setTargetPickerVisible(true)}
              >
                添加目标
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Text type="secondary">
                收件人: {resolvingTargets ? <Spin size="small" /> : <strong>{recipientCount}</strong>}人
              </Text>
              <Button
                type="primary"
                danger
                icon={<SendOutlined />}
                loading={sending}
                disabled={checkedDraftIds.length === 0 || selectedTargets.length === 0}
                onClick={handleBatchSend}
              >
                批量发送 ({checkedDraftIds.length})
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ── 待发送区 ────────────────────────────────────────────── */}
      <Card
        size="small"
        title={<span>待发送区 <Text type="secondary">({drafts.length} 条草稿)</Text></span>}
        className="ann-section-card"
        loading={draftsLoading}
      >
        {drafts.length === 0 ? (
          <Empty description="暂无草稿" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[16, 16]}>
            {drafts.map(draft => {
              const checked = checkedDraftIds.includes(draft.id);
              const preview = (draft.content || '').substring(0, 120);
              return (
                <Col xs={24} sm={12} md={8} lg={6} key={draft.id}>
                  <Card
                    size="small"
                    hoverable
                    className={`ann-draft-card ${checked ? 'ann-draft-checked' : ''}`}
                    onClick={() => handleToggleDraft(draft.id)}
                  >
                    <Checkbox checked={checked} style={{ pointerEvents: 'none' }}>
                      <Text strong ellipsis>{draft.title || '(无标题)'}</Text>
                    </Checkbox>
                    <div className="ann-card-preview">
                      <Text type="secondary" ellipsis={{ rows: 2 }}>{preview || '(空正文)'}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <Row justify="end" gutter={8}>
                      <Col>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          onClick={(e) => handleEditDraft(draft.id, e)}
                        >
                          编辑
                        </Button>
                      </Col>
                      <Col>
                        <Popconfirm
                          title="确定删除此草稿？"
                          onConfirm={(e) => handleDeleteDraft(draft.id, e)}
                          onCancel={e => e?.stopPropagation()}
                          okText="删除" cancelText="取消"
                        >
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={e => e.stopPropagation()}
                          >
                            删除
                          </Button>
                        </Popconfirm>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )}
      </Card>

      {/* ── 已发送区 ────────────────────────────────────────────── */}
      <Card
        size="small"
        title={
          <Row justify="space-between" align="middle" style={{ width: '100%' }}>
            <Col>
              <Space>
                <span>已发送区</span>
                <Tag color="green">已发送 {sentCount}</Tag>
                <Tag color="orange">部分失败 {partialCount}</Tag>
                <Tag color="red">失败 {failedCount}</Tag>
              </Space>
            </Col>
            <Col>
              <Popconfirm
                title={`确定删除勾选的 ${checkedAnnouncementIds.length} 条公告？`}
                onConfirm={handleBatchDeleteAnnouncements}
                okText="删除" cancelText="取消"
                disabled={checkedAnnouncementIds.length === 0}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  loading={deleting}
                  disabled={checkedAnnouncementIds.length === 0}
                >
                  批量删除 ({checkedAnnouncementIds.length})
                </Button>
              </Popconfirm>
            </Col>
          </Row>
        }
        className="ann-section-card"
        loading={announcementsLoading}
      >
        {announcements.length === 0 ? (
          <Empty description="暂无发送记录" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        ) : (
          <Row gutter={[16, 16]}>
            {announcements.map(ann => (
              <Col xs={24} sm={12} md={8} lg={6} key={ann.id}>
                <Card
                  size="small"
                  className={`ann-sent-card ${checkedAnnouncementIds.includes(ann.id) ? 'ann-draft-checked' : ''}`}
                  onClick={() => handleToggleAnnouncement(ann.id)}
                >
                  <Checkbox checked={checkedAnnouncementIds.includes(ann.id)} style={{ pointerEvents: 'none' }}>
                    <Text strong ellipsis>{ann.title}</Text>
                  </Checkbox>
                  <div className="ann-card-meta">
                    <Text type="secondary">
                      收件人: {ann.recipient_count}人
                      {ann.success_count > 0 && ` | 成功: ${ann.success_count}`}
                      {ann.fail_count > 0 && ` | 失败: ${ann.fail_count}`}
                    </Text>
                  </div>
                  <div className="ann-card-meta">
                    <Tag color={STATUS_COLOR[ann.status] || 'default'}>
                      {STATUS_LABEL[ann.status] || ann.status}
                    </Tag>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {ann.sent_at ? new Date(ann.sent_at).toLocaleString() : '-'}
                    </Text>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <Row justify="end" gutter={[4, 4]}>
                    <Col>
                      <Button size="small" icon={<SendOutlined />} onClick={(e) => { e.stopPropagation(); handleResend(ann.id); }}>重发</Button>
                    </Col>
                    <Col>
                      <Button size="small" icon={<CopyOutlined />} onClick={(e) => { e.stopPropagation(); handleCopyAsDraft(ann.id); }}>复用</Button>
                    </Col>
                    <Col>
                      <Button size="small" icon={<FileTextOutlined />} onClick={(e) => { e.stopPropagation(); handleConvertToTemplate(ann.id); }}>转模板</Button>
                    </Col>
                    <Col>
                      <Popconfirm
                        title="确定删除此公告？"
                        onConfirm={(e) => handleDeleteAnnouncement(ann.id, e)}
                        onCancel={e => e?.stopPropagation()}
                        okText="删除" cancelText="取消"
                      >
                        <Button
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={e => e.stopPropagation()}
                        >删除</Button>
                      </Popconfirm>
                    </Col>
                  </Row>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Card>

      {/* ── 目标选择器弹窗 ──────────────────────────────────────── */}
      <Modal
        open={targetPickerVisible}
        title={`选择目标 — ${targetPickerType === 'machine' ? '机器' : targetPickerType === 'container' ? '容器' : '用户'}`}
        onCancel={() => setTargetPickerVisible(false)}
        footer={null}
        width={500}
      >
        <Space style={{ marginBottom: 12 }}>
          <Button
            type={targetPickerType === 'user' ? 'primary' : 'default'}
            size="small"
            onClick={() => openTargetPicker('user')}
          >
            用户
          </Button>
          <Button
            type={targetPickerType === 'machine' ? 'primary' : 'default'}
            size="small"
            onClick={() => openTargetPicker('machine')}
          >
            机器
          </Button>
          <Button
            type={targetPickerType === 'container' ? 'primary' : 'default'}
            size="small"
            onClick={() => openTargetPicker('container')}
          >
            容器
          </Button>
          <Button
            type="primary"
            size="small"
            icon={<TeamOutlined />}
            onClick={() => {
              addTarget({ type: 'all', id: 0, label: '全员' });
            }}
          >
            全员
          </Button>
        </Space>
        <Spin spinning={targetPickerLoading}>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {targetPickerOptions.map(item => {
              const alreadySelected = selectedTargets.find(t => t.type === item.type && t.id === item.id);
              return (
                <Card
                  key={`${item.type}-${item.id}`}
                  size="small"
                  hoverable={!alreadySelected}
                  style={{ marginBottom: 8, opacity: alreadySelected ? 0.5 : 1 }}
                  onClick={() => !alreadySelected && addTarget(item)}
                >
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        {item.type === 'machine' ? <DesktopOutlined /> :
                         item.type === 'container' ? <CloudServerOutlined /> : <UserOutlined />}
                        <Text>{item.label}</Text>
                      </Space>
                    </Col>
                    <Col>
                      {alreadySelected ? <Tag>已添加</Tag> : <Button size="small" type="link">添加</Button>}
                    </Col>
                  </Row>
                </Card>
              );
            })}
            {targetPickerOptions.length === 0 && !targetPickerLoading && (
              <Empty description="无可用选项" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            )}
          </div>
        </Spin>
      </Modal>

      {/* ── 发送结果弹窗 ────────────────────────────────────────── */}
      <Modal
        open={sendResultVisible}
        title="发送结果"
        onCancel={() => setSendResultVisible(false)}
        footer={<Button onClick={() => setSendResultVisible(false)}>关闭</Button>}
        width={600}
      >
        {sendResults.map((r, i) => (
          <Card key={i} size="small" style={{ marginBottom: 8 }}>
            <Descriptions column={2} size="small">
              <Descriptions.Item label="草稿ID">{r.draft_id}</Descriptions.Item>
              <Descriptions.Item label="状态">
                <Tag color={r.status === 'sent' ? 'green' : r.status === 'partial' ? 'orange' : 'red'}>
                  {r.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="收件人数">{r.recipient_count}</Descriptions.Item>
              <Descriptions.Item label="成功/失败">{r.success_count} / {r.fail_count}</Descriptions.Item>
              {r.failures && r.failures.length > 0 && (
                <Descriptions.Item label="失败详情" span={2}>
                  {r.failures.map((f, j) => (
                    <Text key={j} type="danger" style={{ display: 'block', fontSize: 12 }}>
                      {f.email}: {f.error}
                    </Text>
                  ))}
                </Descriptions.Item>
              )}
            </Descriptions>
          </Card>
        ))}
      </Modal>
    </div>
  );
}
