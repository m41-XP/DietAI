import { useContext, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { AuthProvider, AuthContext } from '../src/context/AuthContext';
import { AuthSheetProvider } from '../src/context/AuthSheetContext';

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

    // If user is signed in and on an auth screen, redirect to tabs
    if (userToken && onAuthScreen) {
      router.replace('/(tabs)');
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
