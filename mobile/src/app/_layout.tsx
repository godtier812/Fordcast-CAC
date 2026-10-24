import { Stack, ThemeProvider, DarkTheme } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from '@expo-google-fonts/inter/useFonts';
import { Inter_400Regular } from '@expo-google-fonts/inter/400Regular';
import { Inter_500Medium } from '@expo-google-fonts/inter/500Medium';
import { Inter_600SemiBold } from '@expo-google-fonts/inter/600SemiBold';
import { Inter_700Bold } from '@expo-google-fonts/inter/700Bold';
import { PreferencesProvider, usePreferences } from '@/lib/preferences';
import { theme } from '@/lib/theme';
import Pledge from '@/features/onboarding/Pledge';
import { AppText } from '@/components/fordcast/UI';
import { AlertBanner } from '@/components/fc/Kit';
import { MonitorProvider } from '@/lib/monitor';
// Registers the background "guardian" task at startup (required by expo-task-manager).
import '@/lib/guardian';
function Routes() {
  const { ready, pledgeVersion, t, storageError } = usePreferences();
  if (!ready)
    return (
      <View style={{ flex: 1, backgroundColor: theme.bg, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.text} />
      </View>
    );
  if (pledgeVersion !== 1) return <Pledge />;
  return (
    <MonitorProvider>
      <View style={{ flex: 1 }}>
        {storageError && (
          <AppText style={{ backgroundColor: theme.raised, padding: 12 }}>
            {t('error.storage')}
          </AppText>
        )}
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: theme.bg },
            headerTintColor: theme.text,
            contentStyle: { backgroundColor: theme.bg },
            headerBackTitle: t('common.back'),
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="crossing/[id]"
            options={{
              presentation: 'formSheet',
              title: t('crossing.title'),
              sheetAllowedDetents: [0.62, 1],
              sheetGrabberVisible: true,
            }}
          />
          <Stack.Screen name="settings" options={{ title: t('nav.settings') }} />
          <Stack.Screen name="legend" options={{ title: t('map.legend') }} />
          <Stack.Screen name="lab" options={{ title: t('lab.title') }} />
        </Stack>
        <AlertBanner />
      </View>
    </MonitorProvider>
  );
}
export default function RootLayout() {
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!loaded && !error) return null;
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider
        value={{
          ...DarkTheme,
          colors: {
            ...DarkTheme.colors,
            background: theme.bg,
            card: theme.bg,
            text: theme.text,
            primary: theme.link,
          },
        }}
      >
        <PreferencesProvider>
          <StatusBar style="light" />
          <Routes />
        </PreferencesProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
