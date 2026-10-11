import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { drawerPermissions } from '@/ui/drawer-permissions';
import { UsersScreen } from './UsersScreen';

export default async function UsersPage({ searchParams }: { searchParams: Promise<{ user?: string; via?: string }> }) {
  const admin = await requireAdmin('personal');
  const data = await source();
  const { user, via } = await searchParams;
  const { rows, total } = await data.users('', 'all');
  return <UsersScreen initialRows={rows} total={total} now={data.now().toISOString()} can={drawerPermissions(admin)} openId={user ?? null} openVia={via} />;
}
