import React, { useContext, useState } from 'react';
import { Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { GoogleSignin, isErrorWithCode, statusCodes } from '@react-native-google-signin/google-signin';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import { colors, radii } from '../theme';

// The webClientId MUST be the web client ID (the one used for the backend authentication).
// Native client IDs (like the Android one the user just created) are checked natively by 
// Google Play Services on the device via the app's SHA-1 fingerprint.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  offlineAccess: false,
});

export default function GoogleSignInButton() {
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken || userInfo.idToken;

      if (!idToken) {
        throw new Error('No ID token returned from Google.');
      }

      const res = await api.post('/api/auth/google/', { id_token: idToken });
      await login(res.data.access, res.data.refresh);
    } catch (error) {
      if (isErrorWithCode(error)) {
        switch (error.code) {
          case statusCodes.SIGN_IN_CANCELLED:
            // user cancelled the login flow (no error needed)
            break;
          case statusCodes.IN_PROGRESS:
            // operation is in progress already
            break;
          case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
            Alert.alert('Error', 'Google Play services not available or outdated.');
            break;
          default:
            Alert.alert('Google Sign-In Failed', error.message);
        }
      } else {
        const detail = error.response?.data?.detail || 'Google sign-in failed. Please try again.';
        Alert.alert('Google Sign-In Failed', detail);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.googleButton, loading && styles.disabled]}
      onPress={handleGoogleLogin}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color={colors.textPrimary} />
      ) : (
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  googleButtonText: {
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
  },
});
