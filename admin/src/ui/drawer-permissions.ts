import 'server-only';

import { can } from '@/auth/permissions';
import type { Admin } from '@/auth/session';
import type { DrawerPermissions } from './UserDrawer';

export const drawerPermissions = (admin: Admin): DrawerPermissions => ({
  trial: can(admin.role, 'trial'),
  grant: can(admin.role, 'grant'),
  exportUser: can(admin.role, 'export-user'),
  fix: can(admin.role, 'fix'),
  suspend: can(admin.role, 'suspend'),
  delete: can(admin.role, 'delete'),
});
