import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getUserPermissions } from '../api/user_api';
import { clearAuth, shouldHandleAuthExpiry } from '../utils/authHelpers';
import { useNavigate } from 'react-router-dom';
import { PermissionContext } from './permissionContextValue';

const EMPTY_IDENTITY = { userId: null, userName: '' };

export const PermissionProvider = ({ children }) => {
  const [entities, setEntities] = useState([]);
  // 资源级通配由服务端明说（image_resource_unrestricted）；缺失即 false，
  // 前端不从 entities 反推资源能力。
  const [imageResourceUnrestricted, setImageResourceUnrestricted] = useState(false);
  const [identity, setIdentity] = useState(EMPTY_IDENTITY);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  const apply = useCallback((result) => {
    setEntities((result && result.entities) || []);
    setImageResourceUnrestricted((result && result.imageResourceUnrestricted) === true);
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
    setImageResourceUnrestricted(false);
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
    imageResourceUnrestricted,
    loaded,
    userId: identity.userId,
    userName: identity.userName,
    hasPermission,
    hasAnyManage,
    refresh,
    clear,
  }), [entities, imageResourceUnrestricted, loaded, identity, hasPermission, hasAnyManage, refresh, clear]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
};
