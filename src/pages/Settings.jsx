import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, InputNumber, message, Spin, Switch, Tag, Typography } from 'antd';
import { ReloadOutlined, SaveOutlined, SettingOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { listSystemSettings, updateSystemSettings } from '../api/settings_api';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import showErrorModal from '../utils/showErrorModal';
import './Settings.css';

const GROUP_ORDER = ['容器策略', '磁盘策略', '已删除清理', '公告', '镜像'];

const normalizeValue = (item, value) => {
  if (item.value_type === 'boolean') return Boolean(value);
  if (item.value_type === 'integer') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : (item.min_value ?? 0);
  }
  return value ?? '';
};

const sameValue = (item, a, b) => {
  if (item.value_type === 'boolean') return Boolean(a) === Boolean(b);
  if (item.value_type === 'integer') return Number(a) === Number(b);
  return String(a ?? '') === String(b ?? '');
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
    return (
      <InputNumber
        value={value}
        min={item.min_value ?? undefined}
        max={item.max_value ?? undefined}
        addonAfter={item.unit || undefined}
        onChange={(next) => onChange(next ?? item.min_value ?? 0)}
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

  const canManageSettings = hasPermission('settings:manage');

  const loadSettings = useCallback(async () => {
    if (!canManageSettings) return;
    setLoading(true);
    try {
      const res = await listSystemSettings();
      const list = Array.isArray(res?.settings) ? res.settings : [];
      setSettings(list);
      setDraft(Object.fromEntries(list.map(item => [item.key, normalizeValue(item, item.value)])));
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '读取设置失败',
        message: err?.body?.message || err?.message || '无法读取系统设置',
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
  };

  const resetDraft = () => {
    setDraft(Object.fromEntries(settings.map(item => [item.key, normalizeValue(item, item.value)])));
  };

  const saveSettings = async () => {
    if (!dirtyCount) return;
    setSaving(true);
    try {
      const res = await updateSystemSettings(dirtyValues);
      const list = Array.isArray(res?.settings) ? res.settings : [];
      setSettings(list);
      setDraft(Object.fromEntries(list.map(item => [item.key, normalizeValue(item, item.value)])));
      message.success('设置已保存');
    } catch (err) {
      if (err?.status === 401 || err?.status === 403) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '保存设置失败',
        message: err?.body?.message || err?.message || '无法保存系统设置',
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
