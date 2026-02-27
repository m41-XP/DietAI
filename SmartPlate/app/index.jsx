import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSheet } from '../src/context/AuthSheetContext';
import { colors, radii, spacing, typography } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { openLogin, openRegister } = useAuthSheet();

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Logo */}
      <View style={styles.logoBox}>
        <Ionicons name="restaurant" size={40} color={colors.primary} />
      </View>

      {/* Wordmark */}
      <Text style={styles.appName}>SmartPlate</Text>

      {/* Hero text */}
      <Text style={styles.title}>
        Eat smarter,{'\n'}
        <Text style={{ color: colors.primary }}>live better</Text>
      </Text>
      <Text style={styles.subtitle}>
        Scan food, get instant nutrition info,{'\n'}and build your personal meal plan.
      </Text>

      {/* Auth buttons */}
      <View style={styles.authRow}>
        <Pressable style={styles.signUpBtn} onPress={openRegister}>
          <Text style={styles.signUpBtnText}>Sign Up</Text>
        </Pressable>
        <Pressable style={styles.signInBtn} onPress={openLogin}>
          <Text style={styles.signInBtnText}>Sign In</Text>
        </Pressable>
      </View>

      {/* Explore link */}
      <Pressable
        style={styles.exploreLink}
        onPress={() => router.push('/(tabs)')}
      >
        <Text style={styles.exploreLinkText}>Explore without account</Text>
        <Ionicons name="arrow-forward" size={14} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },

  logoBox: {
    width: 88,
    height: 88,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  appName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 1,
    marginBottom: spacing.lg,
  },

  title: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center',
    lineHeight: 44,
    marginBottom: spacing.md,
  },

  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 23,
    marginBottom: spacing.xl,
  },

  authRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
    marginBottom: spacing.lg,
  },
  signUpBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
  },
  signUpBtnText: { ...typography.button },
  signInBtn: {
    flex: 1,
    backgroundColor: colors.background,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  signInBtnText: { ...typography.button, color: colors.textPrimary },

  exploreLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: spacing.sm,
  },
  exploreLinkText: { ...typography.caption, textDecorationLine: 'underline' },
});
