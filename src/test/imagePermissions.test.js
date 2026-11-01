import { describe, it, expect } from 'vitest';
import { canEditImages, canManageImages } from '../utils/imagePermissions';

// 只判方法级；资源级由 /users/me/permissions 的 image_resource_unrestricted 直接给出。
describe('imagePermissions 方法级口径', () => {
  it('删除等管理端点要直持 image:manage', () => {
    expect(canManageImages(['image:manage'])).toBe(true);
    expect(canManageImages(['bypass_resource'])).toBe(false);
    expect(canManageImages(['bypass_auth_entity', 'image:manage'])).toBe(true);
  });

  it('页面编辑门要 image:edit（或同域 manage）', () => {
    expect(canEditImages(['image:edit'])).toBe(true);
    expect(canEditImages(['image:manage'])).toBe(true);
    expect(canEditImages(['image:view'])).toBe(false);
    expect(canEditImages(['bypass_resource'])).toBe(false);
    expect(canEditImages([])).toBe(false);
    expect(canEditImages(undefined)).toBe(false);
  });
});
