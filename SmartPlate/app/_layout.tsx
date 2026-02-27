import { useContext, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, AuthContext } from '../src/context/AuthContext';
import { AuthSheetProvider } from '../src/context/AuthSheetContext';
import { getProfile } from '../src/services/api';

function RootLayoutNav() {
  const { userToken, isLoading } = useContext(AuthContext);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const onAuthScreen =
      segments[0] === 'login' ||
      segments[0] === 'register' ||
      segments[0] === undefined; // index (welcome)

    if (userToken && onAuthScreen) {
      // Check backend — each user's profile is server-side, not local
      getProfile()
        .then(() => {
          // Profile exists on the backend for this user → skip onboarding
          router.replace('/(tabs)');
        })
        .catch((err: any) => {
          if (err?.response?.status === 404) {
            // No profile yet → this user needs onboarding
            router.replace('/onboarding');
          } else {
            // Network error or other issue → go to tabs (don't block the user)
            router.replace('/(tabs)');
          }
        });
    }
  }, [userToken, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#7CC932" />
      </View>
    );
  }

  return (
    <AuthSheetProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="scan-result" />
        <Stack.Screen name="chef-result" />
        <Stack.Screen name="checkin" />
        <Stack.Screen name="scan-history" />
        <Stack.Screen name="scan-detail" />
        <Stack.Screen name="personal-info" />
        <Stack.Screen name="meal-detail" />
        <Stack.Screen name="login" options={{ presentation: 'modal' }} />
        <Stack.Screen name="register" options={{ presentation: 'modal' }} />
      </Stack>
    </AuthSheetProvider>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
