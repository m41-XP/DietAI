import { useContext, useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { ActivityIndicator, View, Pressable, Text } from 'react-native';
import { AuthProvider, AuthContext } from '../src/context/AuthContext';

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

    // If user is signed in and on an auth screen, redirect to scanner
    if (userToken && onAuthScreen) {
      router.replace('/scanner');
    }
  }, [userToken, isLoading, segments]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: true }}>
      <Stack.Screen name="index" options={{ title: 'Welcome to SmartPlate' }} />
      <Stack.Screen
        name="login"
        options={{
          title: 'Login',
          headerRight: () => (
            <Pressable onPress={() => router.replace('/scanner')} hitSlop={10}>
              <Text style={{ fontSize: 22, color: '#999', paddingRight: 8 }}>✕</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: 'Create Account',
          headerRight: () => (
            <Pressable onPress={() => router.replace('/scanner')} hitSlop={10}>
              <Text style={{ fontSize: 22, color: '#999', paddingRight: 8 }}>✕</Text>
            </Pressable>
          ),
        }}
      />
      <Stack.Screen name="scanner" options={{ title: 'AI Scanner' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
    </AuthProvider>
  );
}
