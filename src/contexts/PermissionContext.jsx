import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getUserPermissions } from '../api/user_api';
import { clearAuth, shouldHandleAuthExpiry } from '../utils/authHelpers';
import { useNavigate } from 'react-router-dom';

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
const PermissionContext = createContext({
  entities: [],
  loaded: false,
  userId: null,
  userName: '',
  hasPermission: () => false,
  hasAnyManage: () => false,
  refresh: async () => {},
  clear: () => {},
});

const EMPTY_IDENTITY = { userId: null, userName: '' };

export const PermissionProvider = ({ children }) => {
  const [entities, setEntities] = useState([]);
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const apply = useCallback((result) => {
    setEntities((result && result.entities) || []);
    setIdentity({ userId: (result && result.userId) ?? null, userName: (result && result.userName) || '' });
  }, []);

  // 登录成功后由 Login 调用：换账号必须重建快照，否则会看到上一个人的菜单
  const refresh = useCallback(async () => {
    const result = await getUserPermissions();
    apply(result);
    setLoaded(true);
    return result;
  }, [apply]);

  const clear = useCallback(() => {
    setEntities([]);
    setIdentity(EMPTY_IDENTITY);
  }, []);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const result = await getUserPermissions();
        if (mounted) apply(result);
      } catch {
        // 401 不是"错误"，是"没登录"：保持空集，让用户去登录页（下面的监听器负责）
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [apply]);

  useEffect(() => {
    const onExpired = () => {
      if (!shouldHandleAuthExpiry()) return;
      clearAuth();
      clear();
      navigate('/', { replace: true });
    };
    window.addEventListener('auth:expired', onExpired);
    return () => window.removeEventListener('auth:expired', onExpired);
  }, [clear, navigate]);

  // useCallback：函数引用稳定，页面 effect 依赖 hasPermission 时不会因每次 render 重跑
  const hasPermission = useCallback((code) => entities.includes(code), [entities]);
  const hasAnyManage = useCallback(() => entities.some(code => code.endsWith(':manage')), [entities]);

  const value = useMemo(() => ({
    entities,
    loaded,
    userId: identity.userId,
    userName: identity.userName,
    hasPermission,
    hasAnyManage,
    refresh,
    clear,
  }), [entities, loaded, identity, hasPermission, hasAnyManage, refresh, clear]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
