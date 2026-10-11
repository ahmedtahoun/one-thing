import { can } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { GrowthScreen } from './GrowthScreen';

export default async function GrowthPage() {
  const admin = await requireAdmin('overview');
  const data = await source();
  return <GrowthScreen growth={await data.growth()} canCodes={can(admin.role, 'codes')} />;
}
