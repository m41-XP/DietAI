import React, { createContext, useContext, useRef, useState, useCallback } from 'react';
import {
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import BottomSheet, { BottomSheetView, BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import { AuthContext } from './AuthContext';
import api from '../services/api';
import GoogleSignInButton from '../components/GoogleSignInButton';
import { colors, radii, spacing, typography } from '../theme';

const AuthSheetContext = createContext({
  openLogin: () => {},
  openRegister: () => {},
});

export const useAuthSheet = () => useContext(AuthSheetContext);

export function AuthSheetProvider({ children }) {
  const { login } = useContext(AuthContext);

  const loginSheetRef = useRef(null);
  const registerSheetRef = useRef(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register state
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const openLogin = useCallback(() => {
    loginSheetRef.current?.expand();
  }, []);

  const openRegister = useCallback(() => {
    registerSheetRef.current?.expand();
  }, []);

  const renderBackdrop = useCallback(
    (props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    []
  );

  const handleLogin = async () => {
    if (!loginEmail.trim() || !loginPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    setLoginLoading(true);
    try {
      const res = await api.post('/api/token/', {
        email: loginEmail.trim().toLowerCase(),
        password: loginPassword,
      });
      await login(res.data.access, res.data.refresh);
      loginSheetRef.current?.close();
    } catch (error) {
      const detail = error.response?.data?.detail || 'Invalid email or password.';
      Alert.alert('Login Failed', detail);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!regEmail.trim() || !regPassword || !regConfirm) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }
    if (regPassword.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }
    setRegLoading(true);
    try {
      await api.post('/api/register/', {
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        password_confirm: regConfirm,
      });
      Alert.alert('Success', 'Account created! Please sign in.');
      registerSheetRef.current?.close();
      setTimeout(() => loginSheetRef.current?.expand(), 300);
    } catch (error) {
      const data = error.response?.data;
      let message = 'Registration failed.';
      if (data) {
        const firstKey = Object.keys(data)[0];
        const firstError = data[firstKey];
        message = Array.isArray(firstError) ? firstError[0] : String(firstError);
      }
      Alert.alert('Registration Failed', message);
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <AuthSheetContext.Provider value={{ openLogin, openRegister }}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        {children}

        {/* ── Login Bottom Sheet ── */}
        <BottomSheet
          ref={loginSheetRef}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Welcome back</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={loginEmail}
                onChangeText={setLoginEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={loginPassword}
                onChangeText={setLoginPassword}
                secureTextEntry
              />
              <Pressable
                style={[styles.submitBtn, loginLoading && styles.btnDisabled]}
                onPress={handleLogin}
                disabled={loginLoading}
              >
                {loginLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Sign In</Text>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton />

              <Pressable
                style={styles.switchLink}
                onPress={() => {
                  loginSheetRef.current?.close();
                  setTimeout(() => registerSheetRef.current?.expand(), 300);
                }}
              >
                <Text style={styles.switchText}>
                  Don't have an account? <Text style={styles.switchBold}>Sign Up</Text>
                </Text>
              </Pressable>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>

        {/* ── Register Bottom Sheet ── */}
        <BottomSheet
          ref={registerSheetRef}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Create account</Text>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={regEmail}
                onChangeText={setRegEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={regPassword}
                onChangeText={setRegPassword}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={regConfirm}
                onChangeText={setRegConfirm}
                secureTextEntry
              />
              <Pressable
                style={[styles.submitBtn, regLoading && styles.btnDisabled]}
                onPress={handleRegister}
                disabled={regLoading}
              >
                {regLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Sign Up</Text>
                )}
              </Pressable>

              <View style={styles.divider}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>OR</Text>
                <View style={styles.dividerLine} />
              </View>

              <GoogleSignInButton />

              <Pressable
                style={styles.switchLink}
                onPress={() => {
                  registerSheetRef.current?.close();
                  setTimeout(() => loginSheetRef.current?.expand(), 300);
                }}
              >
                <Text style={styles.switchText}>
                  Already have an account? <Text style={styles.switchBold}>Sign In</Text>
                </Text>
              </Pressable>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>
      </GestureHandlerRootView>
    </AuthSheetContext.Provider>
  );
}

const styles = StyleSheet.create({
  sheetBg: { borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: colors.background },
  sheetHandle: { backgroundColor: colors.border, width: 40 },
  sheetContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl },
  sheetTitle: { ...typography.h1, marginBottom: spacing.lg },
  input: {
    backgroundColor: colors.inputBg,
    borderRadius: radii.md,
    padding: 16,
    fontSize: 16,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  submitBtnText: { ...typography.button },
  btnDisabled: { opacity: 0.6 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing.lg },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { marginHorizontal: spacing.md, color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  switchLink: { alignItems: 'center', marginTop: spacing.lg },
  switchText: { ...typography.caption },
  switchBold: { color: colors.primary, fontWeight: '700' },
});
