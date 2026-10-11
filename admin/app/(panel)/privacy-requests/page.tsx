import { can } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { RequestsScreen } from './RequestsScreen';

export default async function RequestsPage() {
  const admin = await requireAdmin('personal');
  const data = await source();
  return (
    <RequestsScreen
      requests={await data.requests()}
      now={data.now().toISOString()}
      canDelete={can(admin.role, 'delete')}
      canExport={can(admin.role, 'export-user')}
    />
  );
}
