import { useContext } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';
import { useAuthSheet } from '../../src/context/AuthSheetContext';
import { colors, typography, spacing, radii } from '../../src/theme';

export default function PlanScreen() {
  const { userToken } = useContext(AuthContext);
  const { openLogin } = useAuthSheet();

  if (!userToken) {
    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Ionicons name="calendar-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.title}>Meal Plans</Text>
        <Text style={styles.subtitle}>
          Log in to create and manage your personalized meal plans.
        </Text>
        <Pressable style={styles.loginBtn} onPress={openLogin}>
          <Text style={styles.loginBtnText}>Log In</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconBox}>
        <Ionicons name="calendar-outline" size={40} color={colors.primary} />
      </View>
      <Text style={styles.title}>Meal Plans</Text>
      <Text style={styles.subtitle}>Plan features coming soon.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  iconBox: {
    width: 80,
    height: 80,
    borderRadius: radii.lg,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.h1,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  loginBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 60,
    borderRadius: radii.pill,
  },
  loginBtnText: {
    ...typography.button,
  },
});
