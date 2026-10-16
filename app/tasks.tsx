import { Redirect } from 'expo-router';

/** The Agenda screen is gone: what it showed is on Today ("Next" and "Coming up"). */
export default function Tasks() {
  return <Redirect href="/today" />;
}
