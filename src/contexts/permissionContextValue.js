import { createContext } from 'react';

/**
 * 身份 + 权限的唯一来源（2026-09 决策）。
 *
 * ★ 一次应用加载只问一次 `/api/users/me/permissions`，它同时交付三样：
 *   认证信号（200/401）、授权数据（entities）、身份（user_id/username）。
 *
 * ★ 为什么身份也走这里：cookie 是 HttpOnly，前端读不到它，"我是谁"只能从响应体来。
 *   此前身份被存在 localStorage 里当登录标记，于是和服务端各说各话——401 要想清本地
 *   （cookie 又清不掉）、登录页又凭本地标记把人推进去，两个方向互相推。
 *
 * ★ 认证失效（401）只在这里处置一次：清空快照 + 客户端回登录页。**不做整页重载**，
 *   所以必须幂等（闩在 authHelpers.shouldHandleAuthExpiry）。
 */
export const PermissionContext = createContext({
  entities: [],
  imageResourceUnrestricted: false,
  containerResourceUnrestricted: false,
  loaded: false,
  userId: null,
  userName: '',
  hasPermission: () => false,
  hasAnyManage: () => false,
  refresh: async () => {},
  clear: () => {},
});
