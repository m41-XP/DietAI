import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthSheet } from '../src/context/AuthSheetContext';
import { colors, radii, spacing, typography } from '../src/theme';

export default function WelcomeScreen() {
  const router = useRouter();
  const { openLogin, openRegister } = useAuthSheet();

  return (
    <View style={styles.container}>
      {/* Logo placeholder */}
      <View style={styles.logoBox}>
        <Text style={styles.logoIcon}>🍽</Text>
      </View>

      <Text style={styles.title}>Scan, plan, and eat{'\n'}smarter every day</Text>
      <Text style={styles.subtitle}>
        Snap a photo of your food, get instant nutrition info, and build personalized meal plans.
      </Text>

      {/* Sign Up + Sign In buttons */}
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
        <Text style={styles.exploreLinkText}>Explore first</Text>
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

  // Logo
  logoBox: {
    width: 72,
    height: 72,
    borderRadius: radii.lg,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  logoIcon: { fontSize: 36 },

  // Typography
  title: {
    ...typography.hero,
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: spacing.md,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xxl,
    paddingHorizontal: spacing.md,
  },

  // Auth buttons row
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

  // Explore link
  exploreLink: { paddingVertical: spacing.md, paddingHorizontal: spacing.xl },
  exploreLinkText: { ...typography.caption, textDecorationLine: 'underline' },
});
