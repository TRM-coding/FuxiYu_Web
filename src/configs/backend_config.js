// 单文件配置，移除对 config.js 的依赖

export const BACKEND_BASE_URL = 'http://localhost:5000';
export const REQUEST_TIMEOUT = 5000;
export const CREDENTIALS = 'include'; // 携带 cookies

export const API_ROUTES = {
	LOGIN: '/api/login',
	REGISTER: '/api/register',
	LOGOUT: '/api/logout',
};

export default {
	BACKEND_BASE_URL,
	REQUEST_TIMEOUT,
	CREDENTIALS,
	API_ROUTES,
};
