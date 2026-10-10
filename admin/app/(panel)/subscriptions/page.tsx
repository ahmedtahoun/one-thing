import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { drawerPermissions } from '@/ui/drawer-permissions';
import { SubscriptionsScreen } from './SubscriptionsScreen';

export default async function SubscriptionsPage() {
  const admin = await requireAdmin('personal');
  const data = await source();
  const { rows, stats } = await data.subscriptions('all');
  return <SubscriptionsScreen initialRows={rows} stats={stats} now={data.now().toISOString()} can={drawerPermissions(admin)} />;
}
