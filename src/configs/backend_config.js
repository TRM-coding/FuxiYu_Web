// src/configs/backend_config.js
// 后端配置（可通过 Vite 环境变量 VITE_BACKEND_BASE_URL 覆盖）

export const BACKEND_BASE_URL = import.meta.env.VITE_BACKEND_BASE_URL || '';

export const API_ROUTES = {
  REGISTER: '/register',
  LOGIN: '/login',
  // 根据后端实际接口添加更多路由
};
