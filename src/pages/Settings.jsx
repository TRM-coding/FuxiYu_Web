import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, InputNumber, message, Spin, Switch, Tag, Typography } from 'antd';
import { ReloadOutlined, SaveOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listSystemSettings, updateSystemSettings } from '../api/settings_api';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import showErrorModal from '../utils/showErrorModal';
import './Settings.css';

// 与 Ctrl 实际分组逐字对齐；未知分组按 999 排最后，不能把已知组挤出顺序。
const GROUP_ORDER = ['容器清理', '磁盘策略', '已删除容器', '公告', '镜像'];
const REMINDER_HOURS_KEY = 'container.cleanup_reminder_hours';

const normalizeValue = (item, value) => {
  if (item.value_type === 'boolean') return Boolean(value);
  if (item.value_type === 'integer') {
    // 加载时保留服务端原值：非法小数不能在这里被静默取整，保存前必须报错。
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (item.min_value ?? 0);
  }
  return value ?? '';
};

const sameValue = (item, a, b) => {
  if (item.value_type === 'boolean') return Boolean(a) === Boolean(b);
  if (item.value_type === 'integer') {
    const aBlank = a === '' || a === null || a === undefined;
    const bBlank = b === '' || b === null || b === undefined;
    if (aBlank || bBlank) return aBlank && bBlank;
    return Number(a) === Number(b);
  }
  return String(a ?? '') === String(b ?? '');
};

const isBlank = value => value === '' || value === null || value === undefined;

const validateReminderHours = (value) => {
  const text = String(value ?? '');
  if (!text.trim()) return '清理提醒节点至少需要一个正整数';
  for (const part of text.split(',')) {
    const item = part.trim();
    if (!item) return '清理提醒节点不能包含空项';
    if (!/^\d+$/.test(item)) {
      return `清理提醒节点必须为逗号分隔的正整数（非法项：${item}）`;
    }
    const hours = Number(item);
    if (!Number.isSafeInteger(hours) || hours <= 0) {
      return `清理提醒节点必须为正整数（非法项：${item}）`;
    }
  }
  return '';
};

const validateSettingValue = (item, value) => {
  if (item.key === REMINDER_HOURS_KEY) return validateReminderHours(value);
  if (item.value_type !== 'integer') return '';
  if (isBlank(value)) return '该设置必须为整数';
  const number = Number(value);
  if (!Number.isInteger(number)) return '该设置必须为整数';
  if (item.min_value != null && number < item.min_value) {
    return `该设置不能小于 ${item.min_value}`;
  }
  if (item.max_value != null && number > item.max_value) {
    return `该设置不能大于 ${item.max_value}`;
  }
  return '';
};

function SettingControl({ item, value, onChange }) {
  if (item.value_type === 'boolean') {
    return (
      <Switch
        checked={Boolean(value)}
        checkedChildren="开"
        unCheckedChildren="关"
        onChange={onChange}
      />
    );
  }

  if (item.value_type === 'integer') {
    // 原样保留 null/小数，交给保存前校验；这里取整或回落 min 会掩盖非法输入。
    return (
      <InputNumber
        value={value}
        min={item.min_value ?? undefined}
        max={item.max_value ?? undefined}
        addonAfter={item.unit || undefined}
        onChange={onChange}
      />
    );
  }

  if (item.multiline) {
    return (
      <Input.TextArea
        className="settings-field-textarea"
        value={value}
        autoSize={{ minRows: 8, maxRows: 14 }}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }

  return (
    <Input
      value={value}
      onChange={(event) => onChange(event.target.value)}
    />
  );
}

export default function Settings() {
  const navigate = useNavigate();
  const { hasPermission, loaded } = usePermission();
  const [settings, setSettings] = useState([]);
  const [draft, setDraft] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // 字段级校验：非法值在对应设置项下就地提示，并阻止整次保存。
  const [fieldErrors, setFieldErrors] = useState({});

  const canManageSettings = hasPermission('settings:manage');

  const loadSettings = useCallback(async () => {
    if (!canManageSettings) return;
    setLoading(true);
    try {
      const res = await listSystemSettings();
      const list = Array.isArray(res?.settings) ? res.settings : [];
      setSettings(list);
      setDraft(Object.fromEntries(list.map(item => [item.key, normalizeValue(item, item.value)])));
      setFieldErrors({});
    } catch (err) {
      // 401 认证失效交给全局；403 是业务拒绝，留在本页并显示后端原因。
      if (err?.status === 401) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '读取设置失败',
        // 传 err.body 对象而不是它的 message 字符串，路由 + error_reason 映射才能命中。
        message: err?.body || err || '无法读取系统设置',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setLoading(false);
    }
  }, [canManageSettings, navigate]);

  useEffect(() => {
    if (!loaded) return;
    if (!canManageSettings) {
      setLoading(false);
      return;
    }
    loadSettings();
  }, [loaded, canManageSettings, loadSettings]);

  const dirtyValues = useMemo(() => {
    const values = {};
    for (const item of settings) {
      const current = draft[item.key];
      if (!sameValue(item, current, item.value)) values[item.key] = current;
    }
    return values;
  }, [draft, settings]);

  const dirtyCount = Object.keys(dirtyValues).length;

  const groupedSettings = useMemo(() => {
    const groups = new Map();
    for (const item of settings) {
      if (!groups.has(item.group)) groups.set(item.group, []);
      groups.get(item.group).push(item);
    }
    return Array.from(groups.entries()).sort((a, b) => {
      const ai = GROUP_ORDER.indexOf(a[0]);
      const bi = GROUP_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });
  }, [settings]);

  const updateDraft = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }));
    // 用户重新输入时先撤掉该字段的旧错误，下一次保存再统一校验。
    setFieldErrors(prev => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const resetDraft = () => {
    setDraft(Object.fromEntries(settings.map(item => [item.key, normalizeValue(item, item.value)])));
    setFieldErrors({});
  };

  const collectFieldErrors = () => {
    const errors = {};
    for (const item of settings) {
      const error = validateSettingValue(item, draft[item.key]);
      if (error) errors[item.key] = error;
    }
    return errors;
  };

  const saveSettings = async () => {
    if (!dirtyCount) return;
    // 先校验、后提交：整数小数/空值、提醒节点非法项都不能被静默取整或丢弃。
    const errors = collectFieldErrors();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setSaving(true);
    try {
      const res = await updateSystemSettings(dirtyValues);
      const list = Array.isArray(res?.settings) ? res.settings : [];
      setSettings(list);
      setDraft(Object.fromEntries(list.map(item => [item.key, normalizeValue(item, item.value)])));
      setFieldErrors({});
      message.success('设置已保存');
    } catch (err) {
      // 同上：403 走普通错误反馈，不导航。
      if (err?.status === 401) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '保存设置失败',
        message: err?.body || err || '无法保存系统设置',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loaded && !canManageSettings) {
    return (
      <div className="settings-page">
        <div className="settings-denied">403 - 无设置管理权限</div>
      </div>
    );
  }

  return (
    <div className="settings-page">
      <div className="settings-toolbar">
        <div className="settings-title-wrap">
          <Typography.Title level={2} className="settings-title">
            <SettingOutlined />
            系统设置
          </Typography.Title>
          <Typography.Text type="secondary">运行策略、阈值、默认值、清理周期、提醒时间、镜像注入模板与页面开关</Typography.Text>
        </div>
        <div className="settings-actions">
          {dirtyCount > 0 ? <Tag color="blue">{dirtyCount} 项待保存</Tag> : <Tag>无改动</Tag>}
          <Button icon={<ReloadOutlined />} onClick={loadSettings} disabled={loading || saving}>刷新</Button>
          <Button icon={<UndoOutlined />} onClick={resetDraft} disabled={!dirtyCount || saving}>重置</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveSettings} loading={saving} disabled={!dirtyCount}>
            保存
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {groupedSettings.length ? (
          <div className="settings-sections">
            {groupedSettings.map(([group, items]) => (
              <section className="settings-section" key={group}>
                <div className="settings-section-head">
                  <Typography.Title level={4}>{group}</Typography.Title>
                  <Typography.Text type="secondary">{items.length} 项</Typography.Text>
                </div>
                <div className="settings-grid">
                  {items.map(item => (
                    <div className={item.multiline ? 'settings-item settings-item-wide' : 'settings-item'} key={item.key}>
                      <div className="settings-item-copy">
                        <div className="settings-item-title">
                          <span>{item.label}</span>
                          <code>{item.key}</code>
                        </div>
                        <Typography.Text type="secondary">{item.description}</Typography.Text>
                      </div>
                      <div className="settings-item-control">
                        <SettingControl
                          item={item}
                          value={draft[item.key]}
                          onChange={(value) => updateDraft(item.key, value)}
                        />
                      </div>
                      {fieldErrors[item.key] ? (
                        <div className="settings-item-error" role="alert">
                          {fieldErrors[item.key]}
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <Empty description="暂无设置项" />
        )}
      </Spin>
    </div>
  );
}
