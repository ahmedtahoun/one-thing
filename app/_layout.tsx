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

import { LanguageProvider } from '@/i18n/LanguageProvider';
import { SessionProvider } from '@/lib/session';
import { TasksProvider } from '@/lib/tasks';
import { motion } from '@/design/tokens';

SplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden, or unavailable on this platform — nothing to recover from.
});

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

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <SessionProvider>
        <LanguageProvider>
          <TasksProvider>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'fade',
                animationDuration: motion.screenChange,
                contentStyle: { backgroundColor: '#FFFFFF' },
              }}
            />
          </TasksProvider>
        </LanguageProvider>
      </SessionProvider>
    </SafeAreaProvider>
  );
}
