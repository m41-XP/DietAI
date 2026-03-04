import React, { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import {
  TextInput,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
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

// Inline error/success banner component
function FormMessage({ message, type }) {
  if (!message) return null;
  return (
    <View style={[styles.messageBanner, type === 'success' ? styles.successBanner : styles.errorBanner]}>
      <Text style={[styles.messageText, type === 'success' ? styles.successText : styles.errorText]}>
        {message}
      </Text>
    </View>
  );
}

export function AuthSheetProvider({ children }) {
  const { login, userToken } = useContext(AuthContext);

  const loginSheetRef = useRef(null);
  const registerSheetRef = useRef(null);
  const verifySheetRef = useRef(null);
  const forgotSheetRef = useRef(null);
  const resetSheetRef = useRef(null);

  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Register state
  const [regFirstName, setRegFirstName] = useState('');
  const [regLastName, setRegLastName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState('');

  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [resetPassword, setResetPassword] = useState('');
  const [resetConfirm, setResetConfirm] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  // Verification state
  const [verifyEmail, setVerifyEmail] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState('');

  // ── Per-sheet state reset helpers ────────────────────────────────────────
  const clearLoginForm = useCallback(() => {
    setLoginEmail('');
    setLoginPassword('');
    setLoginError('');
  }, []);

  const clearRegisterForm = useCallback(() => {
    setRegFirstName('');
    setRegLastName('');
    setRegEmail('');
    setRegPassword('');
    setRegConfirm('');
    setRegError('');
  }, []);

  const clearVerifyForm = useCallback(() => {
    setVerifyCode('');
    setVerifyError('');
    setVerifySuccess('');
  }, []);

  const clearForgotForm = useCallback(() => {
    setForgotEmail('');
    setForgotError('');
  }, []);

  const clearResetForm = useCallback(() => {
    setResetCode('');
    setResetPassword('');
    setResetConfirm('');
    setResetError('');
    setResetSuccess('');
  }, []);

  // Auto-close sheets when user logs in and wipe all form state
  useEffect(() => {
    if (userToken) {
      loginSheetRef.current?.close();
      registerSheetRef.current?.close();
      verifySheetRef.current?.close();
      forgotSheetRef.current?.close();
      resetSheetRef.current?.close();
      clearLoginForm();
      clearRegisterForm();
      clearVerifyForm();
      clearForgotForm();
      clearResetForm();
    }
  }, [userToken]);

  const openLogin = useCallback(() => {
    clearLoginForm();
    loginSheetRef.current?.expand();
  }, []);

  const openRegister = useCallback(() => {
    clearRegisterForm();
    registerSheetRef.current?.expand();
  }, []);

  const openVerify = useCallback((email) => {
    setVerifyEmail(email);
    setVerifyCode('');
    setVerifyError('');
    setVerifySuccess('');
    verifySheetRef.current?.expand();
  }, []);

  const renderBackdrop = useCallback(
    (props) => <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} />,
    []
  );

  // ── Login ──
  const handleLogin = async () => {
    setLoginError('');
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError('Please fill in all fields.');
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
      const data = error.response?.data;
      if (data?.requires_verification) {
        loginSheetRef.current?.close();
        setTimeout(() => openVerify(data.email), 300);
      } else {
        setLoginError(data?.detail || 'Invalid email or password.');
      }
    } finally {
      setLoginLoading(false);
    }
  };

  // ── Register ──
  const handleRegister = async () => {
    setRegError('');
    if (!regFirstName.trim() || !regLastName.trim() || !regEmail.trim() || !regPassword || !regConfirm) {
      setRegError('Please fill in all fields.');
      return;
    }
    if (regPassword.length < 8) {
      setRegError('Password must be at least 8 characters.');
      return;
    }
    if (regPassword !== regConfirm) {
      setRegError('Passwords do not match.');
      return;
    }
    setRegLoading(true);
    try {
      const res = await api.post('/api/register/', {
        first_name: regFirstName.trim(),
        last_name: regLastName.trim(),
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
        password_confirm: regConfirm,
      });
      registerSheetRef.current?.close();
      setTimeout(() => openVerify(res.data.email || regEmail.trim().toLowerCase()), 300);
    } catch (error) {
      const data = error.response?.data;
      let message = 'Registration failed.';
      if (data) {
        const firstKey = Object.keys(data)[0];
        const firstError = data[firstKey];
        message = Array.isArray(firstError) ? firstError[0] : String(firstError);
      }
      setRegError(message);
    } finally {
      setRegLoading(false);
    }
  };

  // ── Verify Code ──
  const handleVerify = async () => {
    setVerifyError('');
    setVerifySuccess('');
    if (!verifyCode.trim()) {
      setVerifyError('Please enter the verification code.');
      return;
    }
    setVerifyLoading(true);
    try {
      await api.post('/api/verify-email/', {
        email: verifyEmail,
        code: verifyCode.trim(),
      });
      verifySheetRef.current?.close();
      setTimeout(() => {
        setLoginError('');
        loginSheetRef.current?.expand();
      }, 300);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Verification failed.';
      setVerifyError(detail);
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── Resend Code ──
  const handleResend = async () => {
    setVerifyError('');
    setVerifySuccess('');
    setResendLoading(true);
    try {
      await api.post('/api/resend-verification/', { email: verifyEmail });
      setVerifySuccess('A new code has been sent to your email.');
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to resend code.';
      setVerifyError(detail);
    } finally {
      setResendLoading(false);
    }
  };

  // ── Request Password Reset ──
  const handleForgotPassword = async () => {
    setForgotError('');
    if (!forgotEmail.trim()) {
      setForgotError('Please enter your email.');
      return;
    }
    setForgotLoading(true);
    try {
      await api.post('/api/password-reset/', {
        email: forgotEmail.trim().toLowerCase(),
      });
      setResetEmail(forgotEmail.trim().toLowerCase());
      setResetCode('');
      setResetPassword('');
      setResetConfirm('');
      setResetError('');
      setResetSuccess('');
      forgotSheetRef.current?.close();
      setTimeout(() => resetSheetRef.current?.expand(), 300);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Failed to send reset code.';
      setForgotError(detail);
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Confirm Password Reset ──
  const handleResetPassword = async () => {
    setResetError('');
    setResetSuccess('');
    if (!resetCode.trim() || !resetPassword || !resetConfirm) {
      setResetError('Please fill in all fields.');
      return;
    }
    if (resetPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }
    if (resetPassword !== resetConfirm) {
      setResetError('Passwords do not match.');
      return;
    }
    setResetLoading(true);
    try {
      await api.post('/api/password-reset/confirm/', {
        email: resetEmail,
        code: resetCode.trim(),
        new_password: resetPassword,
      });
      resetSheetRef.current?.close();
      setTimeout(() => {
        setLoginError('');
        loginSheetRef.current?.expand();
      }, 300);
    } catch (error) {
      const detail = error.response?.data?.detail || 'Reset failed.';
      setResetError(detail);
    } finally {
      setResetLoading(false);
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
          onChange={(index) => { if (index === -1) clearLoginForm(); }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Welcome back</Text>
              <FormMessage message={loginError} type="error" />
              <TextInput
                style={[styles.input, loginError && styles.inputError]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={loginEmail}
                onChangeText={(t) => { setLoginEmail(t); setLoginError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={[styles.input, loginError && styles.inputError]}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={loginPassword}
                onChangeText={(t) => { setLoginPassword(t); setLoginError(''); }}
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

              <Pressable
                style={styles.forgotLink}
                onPress={() => {
                  setForgotEmail(loginEmail);
                  setForgotError('');
                  loginSheetRef.current?.close();
                  setTimeout(() => forgotSheetRef.current?.expand(), 300);
                }}
              >
                <Text style={styles.forgotText}>Forgot Password?</Text>
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
                  setTimeout(() => {
                    clearRegisterForm();
                    registerSheetRef.current?.expand();
                  }, 300);
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
          onChange={(index) => { if (index === -1) clearRegisterForm(); }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Create account</Text>
              <FormMessage message={regError} type="error" />
              <View style={styles.nameRow}>
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="First Name"
                  placeholderTextColor={colors.textMuted}
                  value={regFirstName}
                  onChangeText={(t) => { setRegFirstName(t); setRegError(''); }}
                  autoCapitalize="words"
                />
                <TextInput
                  style={[styles.input, styles.nameInput]}
                  placeholder="Last Name"
                  placeholderTextColor={colors.textMuted}
                  value={regLastName}
                  onChangeText={(t) => { setRegLastName(t); setRegError(''); }}
                  autoCapitalize="words"
                />
              </View>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={regEmail}
                onChangeText={(t) => { setRegEmail(t); setRegError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.textMuted}
                value={regPassword}
                onChangeText={(t) => { setRegPassword(t); setRegError(''); }}
                secureTextEntry
              />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor={colors.textMuted}
                value={regConfirm}
                onChangeText={(t) => { setRegConfirm(t); setRegError(''); }}
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
                  setTimeout(() => {
                    clearLoginForm();
                    loginSheetRef.current?.expand();
                  }, 300);
                }}
              >
                <Text style={styles.switchText}>
                  Already have an account? <Text style={styles.switchBold}>Sign In</Text>
                </Text>
              </Pressable>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>

        {/* ── Verify Email Bottom Sheet ── */}
        <BottomSheet
          ref={verifySheetRef}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
          onChange={(index) => { if (index === -1) clearVerifyForm(); }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Verify your email</Text>
              <Text style={styles.verifySubtitle}>
                We sent a 6-digit code to{'\n'}
                <Text style={styles.verifyEmailText}>{verifyEmail}</Text>
              </Text>
              <FormMessage message={verifyError} type="error" />
              <FormMessage message={verifySuccess} type="success" />
              <TextInput
                style={[styles.input, styles.codeInput, verifyError && styles.inputError]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={verifyCode}
                onChangeText={(t) => { setVerifyCode(t); setVerifyError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
              <Pressable
                style={[styles.submitBtn, verifyLoading && styles.btnDisabled]}
                onPress={handleVerify}
                disabled={verifyLoading}
              >
                {verifyLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Verify</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.switchLink}
                onPress={handleResend}
                disabled={resendLoading}
              >
                {resendLoading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Text style={styles.switchText}>
                    Didn't receive a code? <Text style={styles.switchBold}>Resend</Text>
                  </Text>
                )}
              </Pressable>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>

        {/* ── Forgot Password Bottom Sheet ── */}
        <BottomSheet
          ref={forgotSheetRef}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
          onChange={(index) => { if (index === -1) clearForgotForm(); }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Forgot password</Text>
              <Text style={styles.verifySubtitle}>
                Enter your email and we'll send you a code to reset your password.
              </Text>
              <FormMessage message={forgotError} type="error" />
              <TextInput
                style={[styles.input, forgotError && styles.inputError]}
                placeholder="Email"
                placeholderTextColor={colors.textMuted}
                value={forgotEmail}
                onChangeText={(t) => { setForgotEmail(t); setForgotError(''); }}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Pressable
                style={[styles.submitBtn, forgotLoading && styles.btnDisabled]}
                onPress={handleForgotPassword}
                disabled={forgotLoading}
              >
                {forgotLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Send Code</Text>
                )}
              </Pressable>

              <Pressable
                style={styles.switchLink}
                onPress={() => {
                  forgotSheetRef.current?.close();
                  setTimeout(() => {
                    clearLoginForm();
                    loginSheetRef.current?.expand();
                  }, 300);
                }}
              >
                <Text style={styles.switchText}>
                  Back to <Text style={styles.switchBold}>Sign In</Text>
                </Text>
              </Pressable>
            </KeyboardAvoidingView>
          </BottomSheetView>
        </BottomSheet>

        {/* ── Reset Password Bottom Sheet ── */}
        <BottomSheet
          ref={resetSheetRef}
          index={-1}
          enablePanDownToClose
          enableDynamicSizing
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBg}
          handleIndicatorStyle={styles.sheetHandle}
          onChange={(index) => { if (index === -1) clearResetForm(); }}
        >
          <BottomSheetView style={styles.sheetContent}>
            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
              <Text style={styles.sheetTitle}>Reset password</Text>
              <Text style={styles.verifySubtitle}>
                Enter the 6-digit code sent to{'\n'}
                <Text style={styles.verifyEmailText}>{resetEmail}</Text>
              </Text>
              <FormMessage message={resetError} type="error" />
              <FormMessage message={resetSuccess} type="success" />
              <TextInput
                style={[styles.input, styles.codeInput, resetError && styles.inputError]}
                placeholder="000000"
                placeholderTextColor={colors.textMuted}
                value={resetCode}
                onChangeText={(t) => { setResetCode(t); setResetError(''); }}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
              />
              <TextInput
                style={[styles.input, resetError && styles.inputError]}
                placeholder="New Password"
                placeholderTextColor={colors.textMuted}
                value={resetPassword}
                onChangeText={(t) => { setResetPassword(t); setResetError(''); }}
                secureTextEntry
              />
              <TextInput
                style={[styles.input, resetError && styles.inputError]}
                placeholder="Confirm New Password"
                placeholderTextColor={colors.textMuted}
                value={resetConfirm}
                onChangeText={(t) => { setResetConfirm(t); setResetError(''); }}
                secureTextEntry
              />
              <Pressable
                style={[styles.submitBtn, resetLoading && styles.btnDisabled]}
                onPress={handleResetPassword}
                disabled={resetLoading}
              >
                {resetLoading ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.submitBtnText}>Reset Password</Text>
                )}
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
  inputError: {
    borderColor: colors.error,
  },
  codeInput: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 12,
    paddingVertical: 20,
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
  forgotLink: { alignSelf: 'flex-end', marginTop: spacing.sm },
  forgotText: { color: colors.primary, fontSize: 14, fontWeight: '600' },
  nameRow: { flexDirection: 'row', gap: spacing.sm },
  nameInput: { flex: 1 },
  switchLink: { alignItems: 'center', marginTop: spacing.lg },
  switchText: { ...typography.caption },
  switchBold: { color: colors.primary, fontWeight: '700' },
  verifySubtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  verifyEmailText: {
    color: colors.textPrimary,
    fontWeight: '700',
  },
  messageBanner: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.md,
    marginBottom: spacing.md,
  },
  errorBanner: {
    backgroundColor: '#FFF0F0',
  },
  successBanner: {
    backgroundColor: '#F0FFF4',
  },
  messageText: {
    fontSize: 14,
    fontWeight: '500',
  },
  errorText: {
    color: colors.error,
  },
  successText: {
    color: '#2D8A4E',
  },
});
