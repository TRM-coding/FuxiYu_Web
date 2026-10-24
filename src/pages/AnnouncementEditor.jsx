import React, { useState, useEffect, useRef } from 'react';
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
  { key: 'image_name', label: '镜像', get: c => c.image_name || '' },
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
  const [templatesLoadingMore, setTemplatesLoadingMore] = useState(false);
  const [templateTotal, setTemplateTotal] = useState(0);

  // ── 机器选择器 ────────────────────────────────────────────────────
  const [machines, setMachines] = useState([]);
  const [selectedMachineId, setSelectedMachineId] = useState(null);
  const [machineDetail, setMachineDetail] = useState(null);

  // ── 容器选择器 ────────────────────────────────────────────────────
  const [containers, setContainers] = useState([]);
  const [selectedContainerId, setSelectedContainerId] = useState(null);
  const [containerDetail, setContainerDetail] = useState(null);

  // 机器/容器是两个独立插入属性选择器：各自的列表请求只按本选择器的
  // 请求序号防过期/卸载；容器列表始终取全量容器，不绑定机器选择。
  const machineListSeqRef = useRef(0);
  const containerSeqRef = useRef(0);
  const mountedRef = useRef(true);
  // 文本域失焦前的选区缓存（按钮夺焦后仍按原选区插入）。
  const cachedSelectionRef = useRef(null);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

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
          // 草稿与模板没有持久关联（Q06/Q07）：重开草稿不恢复、也不重放任何模板选择，
          // 内容只来自草稿自己的快照——否则模板会覆盖用户在草稿里已经改过的内容。
          setTemplateId(null);
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
    let cancelled = false;
    (async () => {
      setTemplatesLoading(true);
      try {
        const res = await listTemplates({ limit: 200, offset: 0 });
        if (cancelled) return;
        setTemplates(res?.templates || []);
        setTemplateTotal(Number(res?.total) || (res?.templates || []).length);
      } catch (e) {
        if (!cancelled) console.error('load templates', e);
      } finally {
        if (!cancelled) setTemplatesLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /** 模板下拉按 200/页继续取，失败时保留已加载项并给出可读错误。 */
  const loadMoreTemplates = async () => {
    if (templatesLoadingMore || templates.length >= templateTotal) return;
    setTemplatesLoadingMore(true);
    try {
      const res = await listTemplates({ limit: 200, offset: templates.length });
      const more = res?.templates || [];
      setTemplates(prev => {
        const known = new Set(prev.map(tp => tp.id));
        return [...prev, ...more.filter(tp => !known.has(tp.id))];
      });
      if (Number.isFinite(Number(res?.total))) {
        setTemplateTotal(Number(res.total));
      } else {
        setTemplateTotal(prev => prev + more.length);
      }
    } catch (e) {
      console.error('load more templates', e);
      message.error('加载更多模板失败，请稍后重试');
    } finally {
      setTemplatesLoadingMore(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 按需加载机器/容器（选择器展开时才拉取）
  // ══════════════════════════════════════════════════════════════════

  const [machinesLoading, setMachinesLoading] = useState(false);
  const [containersLoading, setContainersLoading] = useState(false);

  const loadMachines = async () => {
    if (machines.length > 0) return; // 已加载则跳过
    const requestId = machineListSeqRef.current + 1;
    machineListSeqRef.current = requestId;
    setMachinesLoading(true);
    try {
      const res = await listAllMachineBrefInformation({ page_number: 0, page_size: 500 });
      if (!mountedRef.current || requestId !== machineListSeqRef.current) return;
      setMachines((res?.machines || []).map(m => ({
        value: m.machine_id,
        label: `${m.machine_name} (${m.machine_ip})`,
        ...m,
      })));
    } catch (e) {
      if (mountedRef.current && requestId === machineListSeqRef.current) {
        console.error('load machines', e);
      }
    } finally {
      if (mountedRef.current && requestId === machineListSeqRef.current) setMachinesLoading(false);
    }
  };

  const loadContainers = async () => {
    if (containers.length > 0) return;
    const requestId = containerSeqRef.current + 1;
    containerSeqRef.current = requestId;
    setContainersLoading(true);
    try {
      // 容器选择器独立于机器选择器：保持现有全量列表口径。
      const res = await listAllContainerBrefInformation({ machine_id: '', page_number: 0, page_size: 500 });
      if (!mountedRef.current || requestId !== containerSeqRef.current) return;
      setContainers((res?.containers_info || res?.containers || []).map(c => ({
        value: c.container_id || c.id,
        label: `${c.container_name || c.name} (port:${c.port})`,
        ...c,
      })));
    } catch (e) {
      if (mountedRef.current && requestId === containerSeqRef.current) {
        console.error('load containers', e);
      }
    } finally {
      if (mountedRef.current && requestId === containerSeqRef.current) setContainersLoading(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════
  // 机器选中 → 拉取详情
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!selectedMachineId) { setMachineDetail(null); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const detail = await getDetailInformation(Number(selectedMachineId));
        if (!cancelled) setMachineDetail(detail || {});
      } catch {
        if (!cancelled) setMachineDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedMachineId]);

  // ══════════════════════════════════════════════════════════════════
  // 容器选中 → 拉取详情
  // ══════════════════════════════════════════════════════════════════

  useEffect(() => {
    if (!selectedContainerId) { setContainerDetail(null); return undefined; }
    let cancelled = false;
    (async () => {
      try {
        const detail = await getContainerDetailInformation(Number(selectedContainerId));
        if (cancelled) return;
        const c = detail?.container_info || detail?.container || detail || {};
        setContainerDetail({
          container_name: c.container_name || c.name || '',
          port: c.port || '',
          // 键名与出参一致：这里曾叫 image，于是下面 CONTAINER_ATTRS 里出现 c.image，
          // 看起来像在回落一个早已退役的字段，实际读的是这个 state 的键。同名就没有这层歧义。
          image_name: c.image_name || '',
          cpu_number: c.cpu_number ?? null,
          memory_gb: c.memory_gb ?? null,
          gpu_number: c.gpu_number ?? 0,
        });
      } catch {
        if (!cancelled) setContainerDetail(null);
      }
    })();
    return () => { cancelled = true; };
  }, [selectedContainerId]);

  // ══════════════════════════════════════════════════════════════════
  // 在光标位置插入文本
  // ══════════════════════════════════════════════════════════════════

  const rememberSelection = () => {
    const el = textareaRef.current?.resizableTextArea?.textArea;
    if (!el) return;
    cachedSelectionRef.current = {
      start: el.selectionStart ?? 0,
      end: el.selectionEnd ?? 0,
    };
  };

  const insertAtCursor = (text) => {
    const el = textareaRef.current?.resizableTextArea?.textArea;
    const focused = !!el && document.activeElement === el;
    const fallback = content.length;
    const cached = cachedSelectionRef.current;
    const rawStart = focused ? (el.selectionStart ?? fallback) : (cached?.start ?? fallback);
    const rawEnd = focused ? (el.selectionEnd ?? fallback) : (cached?.end ?? fallback);
    // 内容可能已被模板/草稿替换，缓存选区必须钳制在当前正文范围内。
    const start = Math.min(Math.max(Number(rawStart) || 0, 0), content.length);
    const end = Math.min(Math.max(Number(rawEnd) || start, start), content.length);
    const newContent = content.slice(0, start) + text + content.slice(end);
    setContent(newContent);
    setRawContent(newContent);
    cachedSelectionRef.current = { start: start + text.length, end: start + text.length };
    setTimeout(() => {
      const current = textareaRef.current?.resizableTextArea?.textArea;
      if (!current) return;
      current.focus();
      const pos = start + text.length;
      current.setSelectionRange(pos, pos);
    }, 0);
  };

  const insertAtCursorWithNewline = (text) => {
    insertAtCursor(text + '\n');
  };

  // ══════════════════════════════════════════════════════════════════
  // 模板选择
  // ══════════════════════════════════════════════════════════════════

  // 模板选择 = 复制初值（Q06/Q07）：把 subject/body 复制进编辑器，草稿保存的是此后
  // 编辑出来的独立内容快照，与模板之间没有持久关联。清空选择只清选择，不动内容。
  const handleTemplateSelect = (tid) => {
    setTemplateId(tid ?? null);
    if (!tid) return;
    const t = templates.find(tp => tp.id === tid);
    if (!t) return;
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
        // 刻意不带 template_id：模板选择只是复制初值，草稿不保留模板关联（Q06/Q07）。
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
              onSelect={rememberSelection}
              onKeyUp={rememberSelection}
              onClick={rememberSelection}
              onBlur={rememberSelection}
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
            {templates.length < templateTotal && (
              <Button
                size="small"
                block
                loading={templatesLoadingMore}
                style={{ marginTop: 8 }}
                onClick={loadMoreTemplates}
              >
                加载更多（已加载 {templates.length}/{templateTotal}）
              </Button>
            )}
            <Divider style={{ margin: '8px 0' }} />
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigate(
                templateId
                  ? `/admin/announcements/templates?template_id=${templateId}`
                  : '/admin/announcements/templates'
              )}
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
