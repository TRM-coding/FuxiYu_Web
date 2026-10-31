import { describe, expect, it } from 'vitest';

import {
  BYPASS_AUTH_ENTITY,
  BYPASS_RESOURCE,
  COVERAGE_BYPASS_AUTH,
  COVERAGE_MANAGE,
  RBAC_GROUP_NAME_RE,
  entityCoverage,
  manageEntityFor,
  validateGroupName,
} from '../utils/rbacMatrix';

/**
 * 与 Ctrl `services/rbac_service.py` 的 AUTH_ENTITIES 同构的合法码集合。
 * `entityCoverage` 的 manage 派生必须要求 manage 码真实存在，故这里作为第三参传入。
 */
const VALID_CODES = new Set([
  'machine:register',
  'machine:manage',
  'machine:view',
  'container:create',
  'container:operation',
  'container:manage',
  'container:view',
  'user:manage',
  'announcement:manage',
  'announcement:view',
  'operation_log:manage',
  'image:edit',
  'image:manage',
  'image:view',
  'settings:manage',
  'rbac:manage',
  BYPASS_RESOURCE,
  BYPASS_AUTH_ENTITY,
]);

const codes = (...items) => new Set(items);
const entity = code => ({ code });

describe('validateGroupName（对齐 Ctrl _GROUP_NAME_RE）', () => {
  it.each(['ab', 'teacher', 'a_b-c', 'A1', 'Op_2', 'a'.repeat(64)])(
    '接受合法组名 %s',
    (name) => {
      expect(RBAC_GROUP_NAME_RE.test(name)).toBe(true);
      expect(validateGroupName(name)).toEqual({ ok: true, message: null });
    },
  );

  it.each([
    ['', '请填写角色名称'],
    ['   ', '请填写角色名称'],
    ['a', '角色名称至少 2 个字符'],
    ['a'.repeat(65), '角色名称不能超过 64 个字符'],
    ['1abc', '角色名称必须以英文字母开头'],
    ['_abc', '角色名称必须以英文字母开头'],
    ['-abc', '角色名称必须以英文字母开头'],
    ['角色', '角色名称必须以英文字母开头'],
    ['a b', '角色名称只能包含英文字母、数字、下划线或连字符'],
    ['ab@c', '角色名称只能包含英文字母、数字、下划线或连字符'],
    ['ab中', '角色名称只能包含英文字母、数字、下划线或连字符'],
  ])('拒绝非法组名 %j，并给出具体原因', (name, message) => {
    expect(RBAC_GROUP_NAME_RE.test(name)).toBe(false);
    expect(validateGroupName(name)).toEqual({ ok: false, message });
  });

  it('长度边界 2 / 64 合法，1 / 65 非法', () => {
    expect(validateGroupName(`a${'b'.repeat(63)}`).ok).toBe(true);
    expect(validateGroupName(`a${'b'.repeat(62)}`).ok).toBe(true);
    expect(validateGroupName('a').ok).toBe(false);
    expect(validateGroupName(`a${'b'.repeat(64)}`).ok).toBe(false);
  });
});

describe('manageEntityFor（对齐 Ctrl _manage_entity_for）', () => {
  it('非 manage 且有冒号的权限点派生同域 manage', () => {
    expect(manageEntityFor('container:view', VALID_CODES)).toBe('container:manage');
    expect(manageEntityFor('image:edit', VALID_CODES)).toBe('image:manage');
    expect(manageEntityFor('machine:register', VALID_CODES)).toBe('machine:manage');
  });

  it('manage 自身、bypass、无冒号、以及 manage 码不存在的都不派生', () => {
    expect(manageEntityFor('container:manage', VALID_CODES)).toBeNull();
    expect(manageEntityFor(BYPASS_AUTH_ENTITY, VALID_CODES)).toBeNull();
    expect(manageEntityFor(BYPASS_RESOURCE, VALID_CODES)).toBeNull();
    expect(manageEntityFor('nocolon', VALID_CODES)).toBeNull();
    expect(manageEntityFor('', VALID_CODES)).toBeNull();
    expect(manageEntityFor('announcement:view', codes('announcement:view'))).toBeNull();
  });
});

describe('entityCoverage（与 Ctrl user_has_entity 同口径）', () => {
  it('直接赋予显示为直接，不被通配改写成派生覆盖', () => {
    expect(entityCoverage(entity('container:create'), codes('container:create'), VALID_CODES)).toBeNull();
    expect(
      entityCoverage(entity('container:create'), codes('container:create', BYPASS_AUTH_ENTITY), VALID_CODES),
    ).toBeNull();
  });

  it('未赋予返回 null（界面显示未启用）', () => {
    expect(entityCoverage(entity('container:create'), codes('machine:view'), VALID_CODES)).toBeNull();
    expect(entityCoverage(entity('container:manage'), codes(), VALID_CODES)).toBeNull();
  });

  it('方法实体通配覆盖普通权限点，也覆盖各域 manage', () => {
    const held = codes(BYPASS_AUTH_ENTITY);
    expect(entityCoverage(entity('container:view'), held, VALID_CODES)).toBe(COVERAGE_BYPASS_AUTH);
    expect(entityCoverage(entity('container:manage'), held, VALID_CODES)).toBe(COVERAGE_BYPASS_AUTH);
    expect(entityCoverage(entity('machine:manage'), held, VALID_CODES)).toBe(COVERAGE_BYPASS_AUTH);
    expect(entityCoverage(entity('settings:manage'), held, VALID_CODES)).toBe(COVERAGE_BYPASS_AUTH);
  });

  it('方法实体通配不派生 bypass_resource 本身', () => {
    expect(entityCoverage(entity(BYPASS_RESOURCE), codes(BYPASS_AUTH_ENTITY), VALID_CODES)).toBeNull();
    expect(entityCoverage(entity(BYPASS_AUTH_ENTITY), codes(BYPASS_RESOURCE), VALID_CODES)).toBeNull();
  });

  it('资源通配只具资源语义，不覆盖任何方法权限点', () => {
    const held = codes(BYPASS_RESOURCE);
    expect(entityCoverage(entity('container:create'), held, VALID_CODES)).toBeNull();
    expect(entityCoverage(entity('container:manage'), held, VALID_CODES)).toBeNull();
    expect(entityCoverage(entity('machine:manage'), held, VALID_CODES)).toBeNull();
    expect(entityCoverage(entity(BYPASS_AUTH_ENTITY), held, VALID_CODES)).toBeNull();
  });

  it('同域 manage 派生同域普通权限点', () => {
    expect(
      entityCoverage(entity('container:create'), codes('container:manage'), VALID_CODES),
    ).toBe(COVERAGE_MANAGE);
    expect(
      entityCoverage(entity('container:operation'), codes('container:manage'), VALID_CODES),
    ).toBe(COVERAGE_MANAGE);
    expect(
      entityCoverage(entity('image:edit'), codes('image:manage'), VALID_CODES),
    ).toBe(COVERAGE_MANAGE);
  });

  it('manage 派生不覆盖 manage 自身，也不跨域', () => {
    expect(
      entityCoverage(entity('container:manage'), codes('container:manage'), VALID_CODES),
    ).toBeNull();
    expect(
      entityCoverage(entity('machine:view'), codes('container:manage'), VALID_CODES),
    ).toBeNull();
  });

  it('manage 码不存在时不产生派生（对齐 _manage_entity_for 的有效码校验）', () => {
    expect(
      entityCoverage(entity('announcement:view'), codes('announcement:manage'), codes('announcement:view')),
    ).toBeNull();
  });

  it('方法通配优先于同域 manage 派生（与后端判定顺序一致）', () => {
    expect(
      entityCoverage(entity('container:create'), codes(BYPASS_AUTH_ENTITY, 'container:manage'), VALID_CODES),
    ).toBe(COVERAGE_BYPASS_AUTH);
  });
});
