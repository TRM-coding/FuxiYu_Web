/** 镜像方法权限；资源范围另取 PermissionContext 的后端能力字段。 */

export const IMAGE_MANAGE = 'image:manage';
export const IMAGE_EDIT = 'image:edit';

export const hasEntity = (entities, code) => (entities || []).includes(code);

/** 方法级管理权限：删除等挂在 `require_permission("image:manage")` 的端点。 */
export const canManageImages = (entities) => hasEntity(entities, IMAGE_MANAGE);

/** 页面编辑门：create / update / 完整详情都要 `image:edit`。 */
export const canEditImages = (entities) => hasEntity(entities, IMAGE_EDIT) || canManageImages(entities);
