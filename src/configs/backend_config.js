// 单文件配置，移除对 config.js 的依赖

// Use Vite-provided environment variables when available (import.meta.env.VITE_*),
// otherwise fall back to the hardcoded address. This lets you switch between
// http/https without editing source.
// Example (shell): VITE_BACKEND_BASE_URL=https://localhost:5000 npm run dev
export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || 'http://192.168.5.230:5000';
// Optional: front-end can know whether it should operate in HTTPS mode
// (useful for building URLs or toggling secure cookies). Set VITE_ENABLE_SSL=true
// when launching Vite to indicate HTTPS mode.
// Default to true (HTTPS enabled) unless explicitly disabled by VITE_ENABLE_SSL='false'
export const ENABLE_SSL = (import.meta.env.VITE_ENABLE_SSL === 'false') ? false : true;
export const REQUEST_TIMEOUT = 5000;
export const CREDENTIALS = 'include'; // 携带 cookies

export const API_ROUTES = {
	// User routes
	LOGIN: '/api/login',
	REGISTER: '/api/register',
	REQUEST_REGISTER_CODE: '/api/request_register_code',
	USERS_CHANGE_PASSWORD: '/api/users/change_password',
	USERS_DELETE: '/api/users/delete_user',
	USERS_GET_DETAIL: '/api/users/get_user_detail_information',
	USERS_UPDATE: '/api/users/update_user',
	USERS_RESET_PASSWORD: '/api/users/reset_password',
	USERS_LIST: '/api/users/list_all_user_bref_information',

	// Machine routes
	MACHINES_ADD: '/api/machines/add_machine',
	MACHINES_REMOVE: '/api/machines/remove_machine',
	MACHINES_UPDATE: '/api/machines/update_machine',
	MACHINES_GET_DETAIL: '/api/machines/get_detail_information',
	MACHINES_LIST: '/api/machines/list_all_machine_bref_information',
	MACHINES_ADD_PERMISSION: '/api/machines/add_machine_permission',
	MACHINES_LIST_PERMISSION: '/api/machines/list_machine_permissions',

	// Container routes
	CONTAINERS_CREATE: '/api/containers/create_container',
	CONTAINERS_DELETE: '/api/containers/delete_container',
	CONTAINERS_ADD_COLLABORATOR: '/api/containers/add_collaborator',
	CONTAINERS_REMOVE_COLLABORATOR: '/api/containers/remove_collaborator',
	CONTAINERS_UPDATE_ROLE: '/api/containers/update_role',
	CONTAINERS_GET_DETAIL: '/api/containers/get_container_detail_information',
	CONTAINERS_LIST: '/api/containers/list_all_container_bref_information',
	CONTAINERS_START: '/api/containers/start_container',
	CONTAINERS_STOP: '/api/containers/stop_container',
	CONTAINERS_RESTART: '/api/containers/restart_container',
	CONTAINERS_REFRESH_LAST_SSH_TIME: '/api/containers/refresh_last_ssh_login_time',
	
};

export default {
	BACKEND_BASE_URL,
	REQUEST_TIMEOUT,
	CREDENTIALS,
	API_ROUTES,
};
