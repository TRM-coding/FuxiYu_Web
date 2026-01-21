// 单文件配置，移除对 config.js 的依赖

export const BACKEND_BASE_URL = 'http://localhost:5000';
export const REQUEST_TIMEOUT = 5000;
export const CREDENTIALS = 'include'; // 携带 cookies

export const API_ROUTES = {
	LOGIN: '/api/login',
	REGISTER: '/api/register',
	// Machine routes
	MACHINES_ADD: '/api/machines/add_machine',
	MACHINES_REMOVE: '/api/machines/remove_machine',
	MACHINES_UPDATE: '/api/machines/update_machine',
	MACHINES_GET_DETAIL: '/api/machines/get_detail_information',
	MACHINES_LIST: '/api/machines/list_all_machine_bref_information',

	// Container routes
	CONTAINERS_CREATE: '/api/containers/create_container',
	CONTAINERS_DELETE: '/api/containers/delete_container',
	CONTAINERS_ADD_COLLABORATOR: '/api/containers/add_collaborator',
	CONTAINERS_REMOVE_COLLABORATOR: '/api/containers/remove_collaborator',
	CONTAINERS_UPDATE_ROLE: '/api/containers/update_role',
	CONTAINERS_GET_DETAIL: '/api/containers/get_container_detail_information',
	CONTAINERS_LIST: '/api/containers/list_all_container_bref_information',
	
};

export default {
	BACKEND_BASE_URL,
	REQUEST_TIMEOUT,
	CREDENTIALS,
	API_ROUTES,
};
