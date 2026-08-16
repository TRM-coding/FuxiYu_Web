import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Typography, Row, Col, Button, Card, Input, Space, Select,
  Tag, message, Divider, DatePicker, TimePicker, Tooltip
} from 'antd';
import {
  SaveOutlined, ArrowLeftOutlined, ThunderboltOutlined,
  FileTextOutlined, EditOutlined, SmileOutlined,
  DesktopOutlined, CloudServerOutlined, ClockCircleOutlined,
  CheckOutlined
} from '@ant-design/icons';
import { saveDraft, getDraft, listTemplates } from '../api/announcement_api';
import { listAllMachineBrefInformation, getDetailInformation } from '../api/machine_api';
import { listAllContainerBrefInformation, getContainerDetailInformation } from '../api/container_api';
import showErrorModal from '../utils/showErrorModal';
import './AnnouncementEditor.css';

const { Text, Title } = Typography;
const { TextArea } = Input;

// ── 静态元素内容 ──────────────────────────────────────────────────────

const GREETINGS = [
  { label: '标准问候', text: '您好！' },
  { label: '正式问候', text: '各位用户，您好！' },
  { label: '尊敬问候', text: '尊敬的用户，您好！' },
  { label: '简单问候', text: '您好，' },
];

const CLOSINGS = [
  { label: '此致敬礼', text: '此致\n敬礼' },
  { label: '祝使用愉快', text: '祝您使用愉快！' },
  { label: '感谢配合', text: '感谢您的理解与配合！' },
  { label: '联系管理员', text: '如有问题请联系管理员。' },
];

// 机器属性标签映射
const MACHINE_ATTRS = [
  { key: 'machine_name_ip', label: '机器名(IP)', get: m => `${m.machine_name} (${m.machine_ip})` },
  { key: 'machine_name', label: '机器名', get: m => m.machine_name },
  { key: 'machine_ip', label: 'IP 地址', get: m => m.machine_ip },
  { key: 'machine_type', label: '机器类型', get: m => (m.machine_type || '').toUpperCase() },
  { key: 'cpu', label: 'CPU 核心数', get: m => String(m.cpu_core_number ?? '-') },
  { key: 'memory', label: '内存(GB)', get: m => String(m.memory_size_gb ?? '-') },
  { key: 'gpu', label: 'GPU 数量', get: m => String(m.gpu_number ?? 0) },
  { key: 'gpu_type', label: 'GPU 型号', get: m => m.gpu_type || '-' },
  { key: 'disk', label: '磁盘(GB)', get: m => String(m.disk_size_gb ?? '-') },
  { key: 'description', label: '机器描述', get: m => m.machine_description || '-' },
];

// 容器属性标签映射
const CONTAINER_ATTRS = [
  { key: 'container_name_port', label: '容器名(端口)', get: c => `${c.container_name} (端口:${c.port})` },
  { key: 'container_name', label: '容器名', get: c => c.container_name },
  { key: 'container_port', label: '端口', get: c => String(c.port || '') },
  { key: 'container_image', label: '镜像', get: c => c.image || c.container_image || '' },
  { key: 'container_cpu', label: 'CPU 数', get: c => String(c.cpu_number ?? '-') },
  { key: 'container_memory', label: '内存(GB)', get: c => String(c.memory_gb ?? '-') },
  { key: 'container_gpu', label: 'GPU 数', get: c => String(c.gpu_number ?? 0) },
];

/** 当前北京时间字面值（固定 UTC+8，用于插入公告模板），形如 "2026-08-17 00:03:33" */
const beijingNowText = () => new Date()
  .toLocaleString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false })
  .replace(',', '');

/** 把 picker 选中的瞬时转北京时间日期/时间字面值（与浏览器时区解耦） */
const beijingDateText = (d) => new Date(d.toDate()).toLocaleDateString('sv-SE', { timeZone: 'Asia/Shanghai' });
const beijingTimeText = (d) => new Date(d.toDate()).toLocaleTimeString('sv-SE', { timeZone: 'Asia/Shanghai', hour12: false });

export default function AnnouncementEditor() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const draftId = searchParams.get('draft_id');
  const textareaRef = useRef(null);

  // ── 编辑器状态 ────────────────────────────────────────────────────
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [rawContent, setRawContent] = useState('');
  const [templateId, setTemplateId] = useState(null);
  const [saving, setSaving] = useState(false);

  // ── 模板 ──────────────────────────────────────────────────────────
  const [templates, setTemplates] = useState([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);

  // ── 机器选择器 ────────────────────────────────────────────────────
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [machineDetail, setMachineDetail] = useState(null);

  // ── 容器选择器 ────────────────────────────────────────────────────
  const [containers, setContainers] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState(null);
  const [containerDetail, setContainerDetail] = useState(null);

  // ══════════════════════════════════════════════════════════════════
  // 加载草稿
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (draftId) {
      (async () => {
        try {
          const res = await getDraft(Number(draftId));
          const d = res?.draft || {};
          setTitle(d.title || '');
          setContent(d.content || '');
          setRawContent(d.raw_content || d.content || '');
          setTemplateId(d.template_id || null);
        } catch (e) {
          console.error('load draft', e);
        }
      })();
    }
  }, [draftId]);

  // ══════════════════════════════════════════════════════════════════
  // 加载模板列表
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    (async () => {
      setTemplatesLoading(true);
      try {
        const res = await listTemplates({ limit: 200 });
        setTemplates(res?.templates || []);
      } catch (e) {
        console.error('load templates', e);
      } finally {
        setTemplatesLoading(false);
      }
    })();
  }, []);

  // ══════════════════════════════════════════════════════════════════
  // 按需加载机器/容器（选择器展开时才拉取）
  // ══════════════════════════════════════════════════════════════════

  const [machinesLoading, setMachinesLoading] = useState(false);
  const [containersLoading, setContainersLoading] = useState(false);

  const loadMachines = async () => {
    if (machines.length > 0) return; // 已加载则跳过
    setMachinesLoading(true);
    try {
      const res = await listAllMachineBrefInformation({ page_number: 1, page_size: 500 });
      setMachines((res?.machines || []).map(m => ({
        value: m.machine_id,
        label: `${m.machine_name} (${m.machine_ip})`,
        ...m,
      })));
    } catch (e) { console.error('load machines', e); }
    finally { setMachinesLoading(false); }
  };

  const loadContainers = async () => {
    if (containers.length > 0) return;
    setContainersLoading(true);
    try {
      const res = await listAllContainerBrefInformation({ machine_id: '', page_number: 1, page_size: 500 });
      setContainers((res?.containers_info || res?.containers || []).map(c => ({
        value: c.container_id || c.id,
        label: `${c.container_name || c.name} (port:${c.port})`,
        ...c,
      })));
    } catch (e) { console.error('load containers', e); }
    finally { setContainersLoading(false); }
  };

  // ══════════════════════════════════════════════════════════════════
  // 机器选中 → 拉取详情
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!selectedMachineId) { setMachineDetail(null); return; }
    (async () => {
      try {
        const detail = await getDetailInformation(Number(selectedMachineId));
        setMachineDetail(detail || {});
      } catch (e) { setMachineDetail(null); }
    })();
  }, [selectedMachineId]);

  // ══════════════════════════════════════════════════════════════════
  // 容器选中 → 拉取详情
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!selectedContainerId) { setContainerDetail(null); return; }
    (async () => {
      try {
        const detail = await getContainerDetailInformation(Number(selectedContainerId));
        const c = detail?.container_info || detail?.container || detail || {};
        setContainerDetail({
          container_name: c.container_name || c.name || '',
          port: c.port || '',
          image: c.container_image || c.image || '',
          cpu_number: c.cpu_number ?? null,
          memory_gb: c.memory_gb ?? null,
          gpu_number: c.gpu_number ?? 0,
        });
      } catch (e) { setContainerDetail(null); }
    })();
  }, [selectedContainerId]);

  // ══════════════════════════════════════════════════════════════════
  // 在光标位置插入文本
  // ══════════════════════════════════════════════════════════════════

  const insertAtCursor = (text) => {
    const el = textareaRef.current?.resizableTextArea?.textArea;
    if (el && document.activeElement === el) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      const before = content.substring(0, start);
      const after = content.substring(end);
      const newContent = before + text + after;
      setContent(newContent);
      setRawContent(newContent);
      setTimeout(() => {
        el.focus();
        const pos = start + text.length;
        el.setSelectionRange(pos, pos);
      }, 0);
    } else {
      const newContent = content + text;
      setContent(newContent);
      setRawContent(newContent);
    }
  };

  const insertAtCursorWithNewline = (text) => {
    insertAtCursor(text + '\n');
  };

  // ══════════════════════════════════════════════════════════════════
  // 模板选择
  // ══════════════════════════════════════════════════════════════════

  const handleTemplateSelect = (tid) => {
    if (!tid) { setTemplateId(null); return; }
    const t = templates.find(tp => tp.id === tid);
    if (!t) return;
    setTemplateId(tid);
    setContent(t.body_template || '');
    setRawContent(t.body_template || '');
    if (t.subject_template && !title) {
      setTitle(t.subject_template);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 保存
  // ══════════════════════════════════════════════════════════════════

  const handleSave = async () => {
    if (!title.trim()) { message.warning('请输入标题'); return; }
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        content: content || rawContent,
        raw_content: rawContent || content,
        template_id: templateId,
      };
      if (draftId) payload.draft_id = Number(draftId);
      const res = await saveDraft(payload);
      message.success('草稿已保存');
      if (!draftId && res?.draft_id) {
        navigate(`/admin/announcements/editor?draft_id=${res.draft_id}`, { replace: true });
      }
    } catch (err) {
      await showErrorModal({ message: '保存草稿失败', status: err?.status });
    } finally {
      setSaving(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 时间快捷插入
  // ══════════════════════════════════════════════════════════════════

  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState(false);

  // ══════════════════════════════════════════════════════════════════

  return (
    <div className="ann-editor-root">
      {/* ── 顶部导航 ─────────────────────────────────────────────── */}
      <Row justify="space-between" align="middle" className="ann-editor-top">
        <Col>
          <Space>
            <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/announcements')}>
              返回门户
            </Button>
            <Title level={4} style={{ margin: 0 }}>
              {draftId ? '编辑草稿' : '新建公告'}
            </Title>
          </Space>
        </Col>
        <Col>
          <Button type="primary" icon={<SaveOutlined />} loading={saving} onClick={handleSave} size="large">
            保存草稿
          </Button>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <Row gutter={24}>
        {/* ── 左侧：编辑区 ────────────────────────────────────────── */}
        <Col xs={24} md={16}>
          <Card size="small" title="标题">
            <Input
              placeholder="输入公告标题（邮件主题）"
              value={title}
              onChange={e => setTitle(e.target.value)}
              size="large"
            />
          </Card>

          <Card size="small" title="正文" style={{ marginTop: 12 }}>
            <TextArea
              ref={textareaRef}
              className="ann-editor-textarea"
              placeholder="在此编写公告正文...&#10;&#10;点击右侧元素按钮直接在光标位置插入内容。"
              value={content}
              onChange={e => { setContent(e.target.value); setRawContent(e.target.value); }}
              rows={18}
              autoSize={{ minRows: 14, maxRows: 35 }}
            />
          </Card>
        </Col>

        {/* ── 右侧：元素快填 ──────────────────────────────────────── */}
        <Col xs={24} md={8}>
          {/* 问候语 */}
          <Card size="small" title={<span><SmileOutlined /> 问候语</span>}>
            <Space wrap size={[4, 4]}>
              {GREETINGS.map(g => (
                <Tooltip key={g.label} title={g.text}>
                  <Button size="small" onClick={() => insertAtCursorWithNewline(g.text)}>
                    {g.label}
                  </Button>
                </Tooltip>
              ))}
            </Space>
          </Card>

          {/* 机器属性 */}
          <Card size="small" title={<span><DesktopOutlined /> 机器属性</span>} style={{ marginTop: 12 }}>
            <Select
              placeholder="输入机器名搜索..."
              allowClear
              showSearch
              loading={machinesLoading}
              style={{ width: '100%', marginBottom: 8 }}
              value={selectedMachineId}
              onChange={setSelectedMachineId}
              onDropdownVisibleChange={(open) => { if (open) loadMachines(); }}
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={machinesLoading ? '加载中...' : '输入关键字搜索机器'}
              options={machines}
            />
            {machineDetail && (
              <Space wrap size={[4, 4]}>
                {MACHINE_ATTRS.map(attr => {
                  const val = attr.get(machineDetail);
                  return (
                    <Tooltip key={attr.key} title={val}>
                      <Button
                        size="small"
                        onClick={() => insertAtCursor(val)}
                        style={{ fontSize: 12 }}
                      >
                        {attr.label}: <Text code style={{ fontSize: 11 }}>{val.length > 30 ? val.slice(0, 30) + '...' : val}</Text>
                      </Button>
                    </Tooltip>
                  );
                })}
              </Space>
            )}
          </Card>

          {/* 容器属性 */}
          <Card size="small" title={<span><CloudServerOutlined /> 容器属性</span>} style={{ marginTop: 12 }}>
            <Select
              placeholder="输入容器名搜索..."
              allowClear
              showSearch
              loading={containersLoading}
              style={{ width: '100%', marginBottom: 8 }}
              value={selectedContainerId}
              onChange={setSelectedContainerId}
              onDropdownVisibleChange={(open) => { if (open) loadContainers(); }}
              filterOption={(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              }
              notFoundContent={containersLoading ? '加载中...' : '输入关键字搜索容器'}
              options={containers}
            />
            {containerDetail && (
              <Space wrap size={[4, 4]}>
                {CONTAINER_ATTRS.map(attr => {
                  const val = attr.get(containerDetail);
                  return (
                    <Tooltip key={attr.key} title={val}>
                      <Button
                        size="small"
                        onClick={() => insertAtCursor(val)}
                        style={{ fontSize: 12 }}
                      >
                        {attr.label}: <Text code style={{ fontSize: 11 }}>{val.length > 25 ? val.slice(0, 25) + '...' : val}</Text>
                      </Button>
                    </Tooltip>
                  );
                })}
              </Space>
            )}
          </Card>

          {/* 时间类信息 */}
          <Card size="small" title={<span><ClockCircleOutlined /> 时间类信息</span>} style={{ marginTop: 12 }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <DatePicker
                  open={datePickerOpen}
                  onOpenChange={setDatePickerOpen}
                  onChange={(d) => {
                    if (d) {
                      insertAtCursor(beijingDateText(d));
                      setDatePickerOpen(false);
                    }
                  }}
                  style={{ width: 160 }}
                  placeholder="选择日期"
                />
                <TimePicker
                  open={timePickerOpen}
                  onOpenChange={setTimePickerOpen}
                  onChange={(t) => {
                    if (t) {
                      insertAtCursor(beijingTimeText(t));
                      setTimePickerOpen(false);
                    }
                  }}
                  format="HH:mm:ss"
                  style={{ width: 140 }}
                  placeholder="选择时间"
                />
              </Space>
              <Space wrap size={[4, 4]}>
                <Button size="small" onClick={() => insertAtCursor(beijingNowText().slice(0, 10))}>
                  今天日期
                </Button>
                <Button size="small" onClick={() => insertAtCursor(beijingNowText())}>
                  当前日期时间
                </Button>
              </Space>
            </Space>
          </Card>

          {/* 结束语 */}
          <Card size="small" title={<span><CheckOutlined /> 结束语</span>} style={{ marginTop: 12 }}>
            <Space wrap size={[4, 4]}>
              {CLOSINGS.map(c => (
                <Tooltip key={c.label} title={c.text}>
                  <Button size="small" onClick={() => insertAtCursorWithNewline(c.text)}>
                    {c.label}
                  </Button>
                </Tooltip>
              ))}
            </Space>
          </Card>

          {/* 模板选择 */}
          <Card
            size="small"
            title={<span><FileTextOutlined /> 模板选择</span>}
            style={{ marginTop: 12 }}
          >
            <Select
              placeholder="选择模板填充编辑器"
              allowClear
              style={{ width: '100%' }}
              loading={templatesLoading}
              value={templateId}
              onChange={handleTemplateSelect}
              options={templates.map(t => ({
                value: t.id,
                label: t.name,
              }))}
            />
            <Divider style={{ margin: '8px 0' }} />
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate('/admin/announcements/templates')}
              block
            >
              编辑此模板
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
