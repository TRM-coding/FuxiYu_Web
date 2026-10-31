import { useContext } from 'react';
import { PermissionContext } from './permissionContextValue';

export { PermissionProvider } from './PermissionProvider';

export const usePermission = () => useContext(PermissionContext);
