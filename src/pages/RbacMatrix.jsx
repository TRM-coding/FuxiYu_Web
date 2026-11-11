import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, message, Spin, Tag, Typography } from 'antd';
import { PlusOutlined, ReloadOutlined, SafetyCertificateOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { createRbacGroup, getRbacMatrix, updateRbacGroupEntities } from '../api/rbac_api';
import { usePermission } from '../contexts/PermissionContext';
import { handleAuthError } from '../utils/authHelpers';
import {
  COVERAGE_BYPASS_AUTH,
  COVERAGE_LABELS,
  COVERAGE_MANAGE,
  COVERAGE_TITLES,
  entityAction,
  entityCoverage,
  entityDomain,
  validateGroupName,
} from '../utils/rbacMatrix';
import showErrorModal from '../utils/showErrorModal';
import './RbacMatrix.css';

const DOMAIN_LABELS = {
  machine: '机器',
  container: '容器',
  user: '用户',
  announcement: '公告',
  operation_log: '日志',
  image: '镜像',
  settings: '设置',
  rbac: '权限',
  bypass: '通配',
};

const ACTION_LABELS = {
  view: '查看',
  create: '创建',
  register: '接入',
  operation: '操作',
  edit: '编辑',
  manage: '管理',
  bypass_resource: '资源通配',
  bypass_auth_entity: '权限通配',
};

const ACTION_ORDER = ['view', 'create', 'register', 'operation', 'edit', 'manage', 'bypass_resource', 'bypass_auth_entity'];
const DANGER_CODES = new Set(['bypass_auth_entity', 'bypass_resource', 'rbac:manage', 'settings:manage']);
const actionRank = action => {
  const index = ACTION_ORDER.indexOf(action);
  return index === -1 ? 999 : index;
};

const normalizeCodes = (codes) => Array.from(new Set((codes || []).map(code => String(code))));

const sameCodeSet = (a, b) => {
  const left = normalizeCodes(a).sort();
  const right = normalizeCodes(b).sort();
  if (left.length !== right.length) return false;
  return left.every((code, index) => code === right[index]);
};

const buildPermissionSections = (entities) => {
  const groups = new Map();
  for (const entity of entities) {
    const domain = entityDomain(entity.code);
    const action = entityAction(entity.code);
    if (!groups.has(domain)) {
      groups.set(domain, {
        domain,
        label: DOMAIN_LABELS[domain] || domain,
        entities: [],
      });
    }
    groups.get(domain).entities.push({ ...entity, action });
  }
  return Array.from(groups.values()).map(group => ({
    ...group,
    entities: group.entities.sort((left, right) => {
      const leftIndex = actionRank(left.action);
      const rightIndex = actionRank(right.action);
      if (leftIndex !== rightIndex) return leftIndex - rightIndex;
      return left.code.localeCompare(right.code);
    }),
  }));
};

export default function RbacMatrix() {
  const navigate = useNavigate();
  const { hasPermission, loaded } = usePermission();
  const [entities, setEntities] = useState([]);
  const [groups, setGroups] = useState([]);
  const [draft, setDraft] = useState({});
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const canManageRbac = hasPermission('rbac:manage');

  const loadMatrix = useCallback(async () => {
    if (!canManageRbac) return;
    setLoading(true);
    try {
      const res = await getRbacMatrix();
      const nextEntities = Array.isArray(res?.entities) ? res.entities : [];
      const nextGroups = Array.isArray(res?.groups) ? res.groups : [];
      setEntities(nextEntities);
      setGroups(nextGroups);
      setDraft(Object.fromEntries(nextGroups.map(group => [group.id, normalizeCodes(group.entity_codes)])));
      setSelectedGroupId(prev => {
        if (prev && nextGroups.some(group => String(group.id) === String(prev))) return prev;
        const userGroup = nextGroups.find(group => group.name === 'user');
        return userGroup?.id ?? nextGroups[0]?.id ?? null;
      });
      setCreating(false);
      setNewGroupName('');
      setNewGroupDescription('');
    } catch (err) {
      // 401 认证失效交给全局；403 是业务拒绝（例如本页权限被撤后后端拒绝），
      // 必须留在本页并把后端原因显示出来，不能当成认证问题把人踢走。
      if (err?.status === 401) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: '读取权限矩阵失败',
        message: err?.body?.message || err?.message || '无法读取权限矩阵',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setLoading(false);
    }
  }, [canManageRbac, navigate]);

  useEffect(() => {
    if (!loaded) return;
    if (!canManageRbac) {
      setLoading(false);
      return;
    }
    loadMatrix();
  }, [loaded, canManageRbac, loadMatrix]);

  const selectedGroup = useMemo(
    () => groups.find(group => String(group.id) === String(selectedGroupId)) || null,
    [groups, selectedGroupId],
  );
  const currentCodes = useMemo(
    () => (creating ? (draft.__new__ || []) : (draft[selectedGroupId] || [])),
    [creating, draft, selectedGroupId],
  );
  const currentLockedCodes = useMemo(
    () => (creating ? [] : (selectedGroup?.locked_entity_codes || [])),
    [creating, selectedGroup],
  );
  const currentLockedSet = useMemo(() => new Set(currentLockedCodes), [currentLockedCodes]);
  const permissionSections = useMemo(() => buildPermissionSections(entities), [entities]);
  const validCodeSet = useMemo(() => new Set(entities.map(entity => entity.code)), [entities]);
  const currentCodeSet = useMemo(() => new Set(currentCodes), [currentCodes]);
  const newGroupNameError = useMemo(
    () => (creating && newGroupName.trim() ? validateGroupName(newGroupName).message : null),
    [creating, newGroupName],
  );
  const selectedDirty = !creating && selectedGroup ? !sameCodeSet(draft[selectedGroupId], selectedGroup.entity_codes) : false;
  const newDirty = creating && (newGroupName.trim() || newGroupDescription.trim() || !sameCodeSet(draft.__new__, []));

  const selectGroup = (groupId) => {
    setCreating(false);
    setSelectedGroupId(groupId);
  };

  const startCreateGroup = () => {
    const userGroup = groups.find(group => group.name === 'user');
    setCreating(true);
    setSelectedGroupId(null);
    setNewGroupName('');
    setNewGroupDescription('');
    setDraft(prev => ({ ...prev, __new__: normalizeCodes(userGroup?.entity_codes || []) }));
  };

  const updateCurrentDraft = (code) => {
    if (!creating && !selectedGroup) return;
    if (currentLockedSet.has(code)) return;
    const key = creating ? '__new__' : selectedGroupId;
    setDraft(prev => {
      const current = new Set(prev[key] || []);
      if (current.has(code)) {
        current.delete(code);
      } else {
        current.add(code);
      }
      for (const lockedCode of currentLockedCodes) current.add(lockedCode);
      return { ...prev, [key]: Array.from(current) };
    });
  };

  const resetCurrent = () => {
    if (creating) {
      const userGroup = groups.find(group => group.name === 'user');
      setNewGroupName('');
      setNewGroupDescription('');
      setDraft(prev => ({ ...prev, __new__: normalizeCodes(userGroup?.entity_codes || []) }));
      return;
    }
    if (!selectedGroup) return;
    setDraft(prev => ({ ...prev, [selectedGroup.id]: normalizeCodes(selectedGroup.entity_codes) }));
  };

  const saveCurrent = async () => {
    if (creating) {
      const nameCheck = validateGroupName(newGroupName);
      if (!nameCheck.ok) {
        message.warning(nameCheck.message);
        return;
      }
    }
    if (!creating && !selectedGroup) return;
    setSaving(true);
    try {
      if (creating) {
        const res = await createRbacGroup({
          name: newGroupName.trim(),
          description: newGroupDescription.trim(),
          entity_codes: draft.__new__ || [],
        });
        const group = res?.group;
        if (group) {
          setGroups(prev => [...prev, group]);
          setDraft(prev => ({ ...prev, [group.id]: normalizeCodes(group.entity_codes), __new__: [] }));
          setSelectedGroupId(group.id);
          setCreating(false);
          setNewGroupName('');
          setNewGroupDescription('');
        }
        message.success('角色已创建');
      } else {
        const res = await updateRbacGroupEntities({
          group_id: selectedGroup.id,
          entity_codes: draft[selectedGroup.id] || [],
        });
        const group = res?.group;
        if (group) {
          setGroups(prev => prev.map(item => (String(item.id) === String(group.id) ? group : item)));
          setDraft(prev => ({ ...prev, [group.id]: normalizeCodes(group.entity_codes) }));
        }
        message.success('权限已保存');
      }
    } catch (err) {
      // 同上：403 走普通错误反馈（后端原因可见），不导航、不清身份。
      if (err?.status === 401) {
        handleAuthError(err.status, navigate);
        return;
      }
      showErrorModal({
        title: creating ? '创建角色失败' : '保存权限失败',
        message: err?.body?.message || err?.message || '权限管理操作失败',
        status: err?.status,
        route: err?.route,
      });
    } finally {
      setSaving(false);
    }
  };

  if (loaded && !canManageRbac) {
    return (
      <div className="rbac-page">
        <div className="rbac-denied">403 - 无权限矩阵管理权限</div>
      </div>
    );
  }

  return (
    <div className="rbac-page">
      <div className="rbac-toolbar">
        <div className="rbac-title-wrap">
          <Typography.Title level={2} className="rbac-title">
            <SafetyCertificateOutlined />
            权限管理
          </Typography.Title>
          <Typography.Text type="secondary">选择身份组后编辑其方法级权限点</Typography.Text>
        </div>
        <div className="rbac-actions">
          {selectedDirty || newDirty ? <Tag color="blue">当前角色有改动</Tag> : <Tag>无改动</Tag>}
          <Button icon={<ReloadOutlined />} onClick={loadMatrix} disabled={loading || saving}>刷新</Button>
          <Button icon={<UndoOutlined />} onClick={resetCurrent} disabled={saving || (!selectedDirty && !newDirty)}>重置</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={saveCurrent} loading={saving} disabled={!creating && !selectedDirty}>
            保存
          </Button>
        </div>
      </div>

      <Spin spinning={loading}>
        {entities.length && groups.length ? (
          <div className="rbac-workspace">
            <aside className="rbac-role-panel">
              <Button type="primary" icon={<PlusOutlined />} block onClick={startCreateGroup} disabled={saving}>
                创建新角色
              </Button>
              <div className="rbac-role-grid">
                {groups.map(group => {
                  const active = !creating && String(group.id) === String(selectedGroupId);
                  return (
                    <button
                      className={active ? 'rbac-role-card rbac-role-card-active' : 'rbac-role-card'}
                      key={group.id}
                      type="button"
                      onClick={() => selectGroup(group.id)}
                      disabled={saving}
                    >
                      <span className="rbac-role-name">{group.name}</span>
                      <span className="rbac-role-count">{normalizeCodes(group.entity_codes).length}</span>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="rbac-editor-card">
              <div className="rbac-editor-head">
                {creating ? (
                  <div className="rbac-new-role-fields">
                    <div className="rbac-field">
                      <Input
                        value={newGroupName}
                        placeholder="角色名称"
                        status={newGroupNameError ? 'error' : undefined}
                        onChange={(event) => setNewGroupName(event.target.value)}
                        disabled={saving}
                      />
                      {newGroupNameError ? (
                        <span className="rbac-field-error" role="alert">{newGroupNameError}</span>
                      ) : null}
                    </div>
                    <div className="rbac-field">
                      <Input
                        value={newGroupDescription}
                        placeholder="角色说明"
                        onChange={(event) => setNewGroupDescription(event.target.value)}
                        disabled={saving}
                      />
                    </div>
                  </div>
                ) : (
                  <div>
                    <Typography.Title level={3}>{selectedGroup?.name || '-'}</Typography.Title>
                    <Typography.Text type="secondary">{selectedGroup?.description || '无说明'}</Typography.Text>
                  </div>
                )}
                <Tag color={creating ? 'blue' : 'default'}>{currentCodes.length} 个权限点</Tag>
              </div>

              <div className="rbac-permission-sections">
                {permissionSections.map(section => {
                  const selectedCount = section.entities.filter(entity => currentCodeSet.has(entity.code)).length;
                  return (
                    <section className="rbac-permission-section" key={section.domain}>
                      <div className="rbac-section-head">
                        <div>
                          <span className="rbac-section-title">{section.label}</span>
                          <span className="rbac-section-subtitle">{section.domain}</span>
                        </div>
                        <span className="rbac-section-count">{selectedCount}/{section.entities.length}</span>
                      </div>
                      <div className="rbac-entity-grid">
                        {section.entities.map(entity => {
                          const enabled = currentCodeSet.has(entity.code);
                          const locked = currentLockedSet.has(entity.code);
                          const danger = DANGER_CODES.has(entity.code);
                          const coverage = entityCoverage(entity, currentCodeSet, validCodeSet);
                          const coverageLabel = coverage ? COVERAGE_LABELS[coverage] : null;
                          // 方法通配覆盖的 *:manage 只是方法层允许；Ctrl 只有直持
                          // {type}:manage 才扩资源范围，所以这类 chip 仍可直接勾选/取消。
                          const manageGrantable = coverage === COVERAGE_BYPASS_AUTH && entity.action === 'manage';
                          const derivedOnly = Boolean(coverage) && !manageGrantable;
                          const actionLabel = ACTION_LABELS[entity.action] || entity.action;
                          const description = entity.description || entity.name || entity.code;
                          const coverageTitle = coverage
                            ? (manageGrantable
                                ? `${COVERAGE_TITLES[coverage]}；直接勾选才会把该管理权限写入本组（资源类管理权限据此扩大资源范围）`
                                : COVERAGE_TITLES[coverage])
                            : description;
                          return (
                            <button
                              className={[
                                'rbac-permission-chip',
                                enabled ? 'rbac-permission-chip-on' : 'rbac-permission-chip-off',
                                entity.action === 'manage' ? 'rbac-permission-chip-manage' : '',
                                danger ? 'rbac-permission-chip-danger' : '',
                                locked ? 'rbac-permission-chip-locked' : '',
                                coverage ? 'rbac-permission-chip-covered' : '',
                                coverage === COVERAGE_BYPASS_AUTH ? 'rbac-permission-chip-covered-auth' : '',
                                coverage === COVERAGE_MANAGE ? 'rbac-permission-chip-covered-manage' : '',
                                manageGrantable ? 'rbac-permission-chip-grantable' : '',
                              ].filter(Boolean).join(' ')}
                              type="button"
                              key={entity.code}
                              aria-label={`${enabled ? '关闭' : '开启'} ${entity.code}`}
                              title={`${entity.code}\n${coverageTitle}`}
                              onClick={() => updateCurrentDraft(entity.code)}
                              disabled={saving || locked || derivedOnly}
                            >
                              <span className="rbac-chip-label">{actionLabel}</span>
                              <span className="rbac-chip-state">
                                {locked ? '锁定' : coverageLabel || (enabled ? '启用' : '未启用')}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="rbac-permission-legend">
                <span><i className="rbac-legend-on" />已开启</span>
                <span><i className="rbac-legend-off" />未开启</span>
                <span><i className="rbac-legend-covered rbac-legend-covered-auth" />实体通配覆盖（管理点可再直接授予）</span>
                <span><i className="rbac-legend-covered rbac-legend-covered-manage" />管理派生覆盖</span>
                <span><i className="rbac-legend-locked" />锁定</span>
              </div>
            </section>
          </div>
        ) : (
          <Empty description="暂无权限矩阵" />
        )}
      </Spin>
    </div>
  );
}
