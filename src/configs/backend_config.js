// 单文件配置，移除对 config.js 的依赖

// Use Vite-provided environment variable when available (import.meta.env.VITE_*).
// Default to relative path so requests like /api/** go through Vite dev proxy.
// Example (shell): VITE_BACKEND_BASE_URL=https://localhost:5000 npm run dev
// 弃 export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL ?? '';
// Compute a runtime origin to use when constructing full URLs.
// If VITE_BACKEND_BASE_URL is provided use it, otherwise fall back to the current page origin.
export const BACKEND_ORIGIN = (typeof window !== 'undefined' ? window.location.origin : '');
// Optional: front-end can know whether it should operate in HTTPS mode
// (useful for building URLs or toggling secure cookies). Set VITE_ENABLE_SSL=true
// when launching Vite to indicate HTTPS mode.
// Default to true (HTTPS enabled) unless explicitly disabled by VITE_ENABLE_SSL='false'
export const ENABLE_SSL = (import.meta.env.VITE_ENABLE_SSL === 'false') ? false : true;
// 同步请求（用户在等结果的那些）：45s。
// 定这么宽是因为**卡住的多半是网络/排队，后端往往最终会成功**——15s 太容易让前端先松手，
// 弹一个"请求超时"，而服务端其实已经把事做完了（2026-09 用户反馈"几乎每个操作都弹超时"）。
// 上限受反向代理约束：若有 nginx，proxy_read_timeout 默认 60s，别再往上加。
export const REQUEST_TIMEOUT = 45000;

// 轮询请求（状态探活、列表刷新）：**刻意不跟着放宽**。
// 轮询要的是"这一拍的新鲜度"：等 45s 只会让状态显示滞后，而且 5s 一次的节奏会长出
// 一堆并发请求（Home/ManageX 的列表轮询有 in-flight 守卫、不会堆；但两个详情页的
// setInterval(loadStatus, 5000) 没有守卫，全靠这个超时把并发压在 3 个以内）。
// 取 15s = 调整前的有效值，即轮询行为保持原样。
export const POLL_TIMEOUT = 15000;

export const CREDENTIALS = 'include'; // 携带 cookies

export const API_ROUTES = {
	// User routes
	LOGIN: '/api/login',
	LOGOUT: '/api/logout',
	REGISTER: '/api/register',
	REQUEST_REGISTER_CODE: '/api/request_register_code',
	USERS_CHANGE_PASSWORD: '/api/users/change_password',
	USERS_DELETE: '/api/users/delete_user',
	USERS_GET_DETAIL: '/api/users/get_user_detail_information',
	USERS_UPDATE: '/api/users/update_user',
	USERS_RESET_PASSWORD: '/api/users/reset_password',
	USERS_LIST: '/api/users/list_all_user_bref_information',

	// Machine routes
	MACHINES_REGISTER: '/api/machines/register_machine',
	MACHINES_REMOVE: '/api/machines/remove_machine',
	MACHINES_UPDATE: '/api/machines/update_machine',
	MACHINES_SET_MAINTENANCE: '/api/machines/set_maintenance',
	MACHINES_RENEW_TRUST: '/api/machines/renew_machine_trust',
	MACHINES_GET_DETAIL: '/api/machines/get_detail_information',
	MACHINES_STATUS: '/api/machines/machine_status',
	MACHINES_LIST: '/api/machines/list_all_machine_bref_information',
	MACHINES_ADD_PERMISSION: '/api/machines/add_machine_permission',
	MACHINES_REMOVE_PERMISSION: '/api/machines/remove_machine_permission',
	MACHINES_LIST_PERMISSION: '/api/machines/list_machine_permissions',

	// Container routes
	CONTAINERS_OPERATION_LOGS: '/api/containers/get_container_operation_logs',
	CONTAINERS_CREATE: '/api/containers/create_container',
	CONTAINERS_DELETE: '/api/containers/delete_container',
	CONTAINERS_ADD_COLLABORATOR: '/api/containers/add_collaborator',
	CONTAINERS_REMOVE_COLLABORATOR: '/api/containers/remove_collaborator',
	CONTAINERS_UPDATE_ROLE: '/api/containers/update_role',
	CONTAINERS_GET_DETAIL: '/api/containers/get_container_detail_information',
	CONTAINERS_STATUS: '/api/containers/container_status',
	CONTAINERS_LIST: '/api/containers/list_all_container_bref_information',
	CONTAINERS_START: '/api/containers/start_container',
	CONTAINERS_STOP: '/api/containers/stop_container',
	CONTAINERS_RESTART: '/api/containers/restart_container',
	CONTAINERS_REFRESH_LAST_SSH_TIME: '/api/containers/refresh_last_ssh_login_time',
	CONTAINERS_UNPAUSE: '/api/containers/unpause_container',
	CONTAINERS_SET_LONG_TERM: '/api/containers/set_long_term_container',
	CONTAINERS_LIST_DELETED: '/api/containers/list_deleted_containers',
	CONTAINERS_CLEAN_DELETED_MOUNT: '/api/containers/clean_deleted_container_mount',
	CONTAINERS_RESURRECT_DELETED: '/api/containers/resurrect_container',

	// Image routes
	IMAGES_CREATE: '/api/images/create_image',
	IMAGES_UPDATE: '/api/images/update_image',
	IMAGES_DELETE: '/api/images/delete_image',
	IMAGES_GET_DETAIL: '/api/images/get_image_detail_information',
	IMAGES_LIST: '/api/images/list_image_bref_information',

	// Admin routes
	ADMIN_OPERATION_LOGS: '/api/admin/operation_logs',
	ADMIN_OPERATION_LOGS_STATS: '/api/admin/operation_logs/stats',
	SETTINGS_LIST: '/api/settings',
	SETTINGS_UPDATE: '/api/settings',
	RBAC_MATRIX: '/api/rbac/matrix',
	RBAC_GROUPS: '/api/rbac/groups',
	RBAC_UPDATE_GROUP_ENTITIES: (groupId) => `/api/rbac/groups/${groupId}/entities`,
	RBAC_USER_GROUPS: (userId) => `/api/rbac/users/${userId}/groups`,

	// Announcement routes
	ANNOUNCEMENTS_TEMPLATES: '/api/announcements/templates',
	ANNOUNCEMENTS_RESOLVE_TARGETS: '/api/announcements/resolve-targets',
	ANNOUNCEMENTS_LIST: '/api/announcements/list',
	ANNOUNCEMENTS_BASE: '/api/announcements',
	ANNOUNCEMENTS_DRAFTS: '/api/announcements/drafts',
	ANNOUNCEMENTS_DRAFTS_SAVE: '/api/announcements/drafts/save',
	ANNOUNCEMENTS_DRAFTS_BATCH_SEND: '/api/announcements/drafts/batch-send',
	
};

export default {
	BACKEND_ORIGIN,
	REQUEST_TIMEOUT,
	POLL_TIMEOUT,
	CREDENTIALS,
	API_ROUTES,
};
