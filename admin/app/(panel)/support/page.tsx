import { can } from '@/auth/permissions';
import { requireAdmin } from '@/auth/session';
import { source } from '@/config';
import { SupportScreen } from './SupportScreen';

export default async function SupportPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  const admin = await requireAdmin('personal');
  const data = await source();
  const { tickets, avgFirstReplyMinutes } = await data.tickets();
  const { ticket } = await searchParams;
  return (
    <SupportScreen
      initial={tickets}
      avgFirstReplyMinutes={avgFirstReplyMinutes}
      now={data.now().toISOString()}
      selected={ticket ?? null}
      canReply={can(admin.role, 'reply')}
    />
  );
}
