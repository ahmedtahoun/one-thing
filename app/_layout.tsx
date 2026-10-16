import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
  useFonts,
} from '@expo-google-fonts/ibm-plex-sans-arabic';

import { startCrashReporting } from '@/lib/crash';
import { startPurchases } from '@/features/paywall/purchases';
import { LanguageProvider, useLanguage } from '@/i18n/LanguageProvider';
import { NotificationsProvider } from '@/lib/notifications/NotificationsProvider';
import { PeopleProvider } from '@/lib/people';
import { PrefsProvider } from '@/lib/prefs';
import { SessionProvider } from '@/lib/session';
import { CoachProvider } from '@/features/coach/CoachProvider';
import { SyncProvider } from '@/lib/sync/SyncProvider';
import { TasksProvider } from '@/lib/tasks';
import { TodayBarSync } from '@/features/today-bar/TodayBarSync';
import { motion, surface } from '@/design/tokens';

// Before anything else renders, so a crash during startup is still reported.
// A no-op unless a DSN is configured (src/lib/crash.ts).
startCrashReporting();

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable on this platform — nothing to recover from.
});

/** The screens' frame, in the colours of the current theme. */
function ThemedStack() {
  const { theme } = useLanguage();
  return (
    <>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          animation: 'fade',
          animationDuration: motion.screenChange,
          contentStyle: { backgroundColor: surface.white },
        }}
      />
    </>
  );
}

export default function RootLayout() {
  // The design uses IBM Plex Sans Arabic for both languages, so nothing can
  // render until it has loaded — otherwise the first frame is in a system font.
  const [fontsLoaded, fontError] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  // Finishes any purchase the store is still holding from an earlier launch;
  // Play refunds one left unacknowledged for three days.
  useEffect(() => startPurchases(), []);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <LanguageProvider>
          <PrefsProvider>
            <TasksProvider>
              <PeopleProvider>
                {/* Below the stores, which it keeps in step with the
                    server. Idle until there is a backend session. */}
                <SyncProvider>
                  {/* Below the stores it reads, so it can keep the OS's
                      pending reminders in step with them. */}
                  <NotificationsProvider>
                    {/* Holds where the coach marks' targets are. Outside
                        the stack so a screen can register an anchor without
                        knowing the tour exists. */}
                    <CoachProvider>
                      <ThemedStack />
                      <TodayBarSync />
                    </CoachProvider>
                  </NotificationsProvider>
                </SyncProvider>
              </PeopleProvider>
            </TasksProvider>
          </PrefsProvider>
        </LanguageProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
