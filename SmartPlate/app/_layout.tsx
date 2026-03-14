import { useContext, useEffect, useRef, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, AuthContext } from '../src/context/AuthContext';
import { AuthSheetProvider } from '../src/context/AuthSheetContext';
import { getProfile } from '../src/services/api';

function RootLayoutNav() {
  const { userToken, isLoading } = useContext(AuthContext);
  const router = useRouter();
  const [isProfileReady, setIsProfileReady] = useState(false);
  
  // Track whether we've already run the profile check for the current session
  // so we don't re-run it on every navigation segment change.
  const hasCheckedProfile = useRef(false);

  useEffect(() => {
    if (isLoading) return;

    if (!userToken) {
      // Reset on logout so the check runs again on next login
      hasCheckedProfile.current = false;
      setIsProfileReady(true);
      return;
    }

    if (hasCheckedProfile.current) {
      setIsProfileReady(true);
      return;
    }
    hasCheckedProfile.current = true;

    // Check backend — works regardless of which screen triggered the login
    getProfile()
      .then(() => {
        // Profile exists → go straight to tabs
        setIsProfileReady(true);
        router.replace('/(tabs)');
      })
      .catch((err: any) => {
        setIsProfileReady(true);
        if (err?.response?.status === 404) {
          // No profile yet → needs onboarding
          router.replace('/onboarding');
        } else {
          // Network error → don't block the user
          router.replace('/(tabs)');
        }
      });
  }, [userToken, isLoading]);

  if (isLoading || (userToken && !isProfileReady)) {
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
