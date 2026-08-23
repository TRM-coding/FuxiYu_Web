import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserPermissions } from '../api/user_api';
import { handleAuthError } from '../utils/authHelpers';
import { useNavigate } from 'react-router-dom';

const PermissionContext = createContext({ entities: [], loaded: false, hasPermission: () => false });

export const PermissionProvider = ({ children }) => {
  const [entities, setEntities] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const list = await getUserPermissions();
        if (mounted) setEntities(list || []);
      } catch (err) {
        if (err?.status === 401) handleAuthError(401, navigate);
      } finally {
        if (mounted) setLoaded(true);
      }
    })();
    return () => { mounted = false; };
  }, [navigate]);

  const hasPermission = (code) => entities.includes(code);
  const hasAnyManage = () => entities.some(code => code.endsWith(':manage'));
  return (
    <PermissionContext.Provider value={{ entities, loaded, hasPermission, hasAnyManage }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermission = () => useContext(PermissionContext);
