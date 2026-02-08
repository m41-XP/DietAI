import React, { useContext, useState, useEffect } from 'react';
import { Pressable, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

WebBrowser.maybeCompleteAuthSession();

export default function GoogleSignInButton() {
  const { login } = useContext(AuthContext);
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      handleGoogleToken(response.params.id_token);
    }
  }, [response]);

  const handleGoogleToken = async (idToken) => {
    setLoading(true);
    try {
      const res = await api.post('/api/auth/google/', { id_token: idToken });
      await login(res.data.access, res.data.refresh);
    } catch (error) {
      const detail =
        error.response?.data?.detail || 'Google sign-in failed. Please try again.';
      Alert.alert('Google Sign-In Failed', detail);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Pressable
      style={[styles.googleButton, loading && styles.disabled]}
      onPress={() => promptAsync()}
      disabled={!request || loading}
    >
      {loading ? (
        <ActivityIndicator color="#333" />
      ) : (
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  googleButton: {
    borderWidth: 1.5,
    borderColor: '#ddd',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  disabled: { opacity: 0.6 },
  googleButtonText: {
    color: '#333',
    fontWeight: '600',
    fontSize: 16,
  },
});
