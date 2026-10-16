import { Redirect } from 'expo-router';

/**
 * Follow-ups now live inside People, as the chip after Recent. Notifications,
 * the Assistant and older links still point here, so this sends them on.
 */
export default function FollowUps() {
  return <Redirect href="/people?tab=followups" />;
}
