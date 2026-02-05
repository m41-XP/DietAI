import { Stack } from 'expo-router';
import { AuthProvider } from '../src/context/AuthContext';

export default function RootLayout() {
  return (
    // We wrap the Stack so every screen inside can access the Auth state
    <AuthProvider>
      <Stack>
        {/* The screen names here must match your file names exactly */}
        <Stack.Screen name="index" options={{ title: 'Welcome to SmartPlate' }} />
        <Stack.Screen name="login" options={{ title: 'Login' }} />
        <Stack.Screen name="register" options={{ title: 'Create Account' }} />
        <Stack.Screen name="scanner" options={{ title: 'AI Scanner' }} />
      </Stack>
    </AuthProvider>
  );
}