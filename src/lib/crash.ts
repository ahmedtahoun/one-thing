/**
 * Crash reporting, and nothing else.
 *
 * Off unless `EXPO_PUBLIC_SENTRY_DSN` is set, so a checkout without one
 * behaves exactly as it did before this file existed — no network, no
 * initialisation, no warning. That matters more than it sounds: the DSN is
 * the switch, so turning reporting off in a hurry is deleting one variable
 * rather than shipping a build.
 *
 * What it may send is deliberately narrow. This app's content is the thing
 * the Privacy Policy is careful about — task titles are "Call the lawyer",
 * contacts are other people's details — and a crash reporter will happily
 * carry all of it in breadcrumbs if you let it. So: no PII, no performance
 * traces (they capture screen names and parameters and cost money for data
 * nobody reads), and no console breadcrumbs, which is where a stray
 * `console.log(task)` would otherwise end up.
 *
 * Sentry is a recipient of data and sits outside both the Kingdom and Egypt,
 * which is why it is named in the Privacy Policy under "Who we share it
 * with" rather than left under "trusted providers".
 */
import * as Sentry from '@sentry/react-native';

const DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;

/** Whether reports will actually go anywhere. */
export const crashReportingOn = Boolean(DSN);

/** Starts reporting if it is configured. Safe to call more than once. */
export function startCrashReporting(): void {
  if (!DSN) return;
  Sentry.init({
    dsn: DSN,
    // No IP address, no device identifiers beyond what a stack trace needs.
    sendDefaultPii: false,
    // Crashes only. Tracing records screen names and route parameters.
    tracesSampleRate: 0,
    beforeBreadcrumb: (crumb) =>
      // `console` and `http` crumbs are the two that carry user content:
      // the first whatever was logged, the second request bodies.
      crumb.category === 'console' || crumb.category === 'http' ? null : crumb,
    beforeSend: (event) => {
      // Belt and braces: even with sendDefaultPii off, never let a build
      // that enables it by accident send these.
      delete event.user;
      delete event.request;
      return event;
    },
  });
}
