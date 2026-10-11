import { can } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { OverviewScreen } from './OverviewScreen';

export default async function OverviewPage() {
  const admin = await requireAdmin('overview');
  const data = await source();
  return (
    <OverviewScreen
      overview={await data.overview()}
      now={data.now().toISOString()}
      canExport={can(admin.role, 'dataset')}
      canQueue={can(admin.role, 'personal')}
    />
  );
}
