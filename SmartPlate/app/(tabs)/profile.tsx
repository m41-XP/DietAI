import { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';
import { useAuthSheet } from '../../src/context/AuthSheetContext';
import api from '../../src/services/api';
import { colors, typography, spacing, radii } from '../../src/theme';

type User = { id: number; email: string; first_name: string; last_name: string };

export default function ProfileScreen() {
  const router = useRouter();
  const { userToken, logout } = useContext(AuthContext);
  const { openLogin, openRegister } = useAuthSheet();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/api/me/');
      setUser(res.data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    if (!userToken) { setUser(null); return; }
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [userToken, fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await logout(); } finally { setLoggingOut(false); }
  };

  // ── Guest View ──
  if (!userToken) {
    return (
      <SafeAreaView style={styles.guestScreen}>
        <View style={styles.guestLogoBox}>
          <Ionicons name="person-outline" size={40} color={colors.primary} />
        </View>
        <Text style={styles.guestAppName}>Profile</Text>
        <Text style={styles.guestTitle}>
          Your progress,{'\n'}
          <Text style={{ color: colors.primary }}>all in one place</Text>
        </Text>
        <Text style={styles.guestSubtitle}>
          Track your nutrition goals, manage settings,{'\n'}and monitor your weekly progress.
        </Text>
        <View style={styles.guestAuthRow}>
          <Pressable style={styles.guestSignUpBtn} onPress={openRegister}>
            <Text style={styles.guestSignUpBtnText}>Sign Up</Text>
          </Pressable>
          <Pressable style={styles.guestSignInBtn} onPress={openLogin}>
            <Text style={styles.guestSignInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const displayName = user?.first_name
    ? `${user.first_name} ${user.last_name || ''}`.trim()
    : null;

  const initials = displayName
    ? (user!.first_name[0] + (user!.last_name?.[0] || '')).toUpperCase()
    : (user?.email?.[0]?.toUpperCase() || '?');

  const ListHeader = (
    <View>
      {/* Avatar + Name */}
      <View style={styles.profileTop}>
        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.xl }} />
        ) : (
          <>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.nameText}>{displayName || user?.email}</Text>
            <View style={styles.memberBadgeWrap}>
              <Text style={styles.memberBadgeText}>Member</Text>
            </View>
          </>
        )}
      </View>

      {/* ACCOUNT Card */}
      <Text style={styles.cardGroupLabel}>ACCOUNT</Text>
      <View style={styles.settingsCard}>
        {/* Personal Info row */}
        <Pressable style={styles.settingsRow} onPress={() => router.push('/personal-info')}>
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="person-outline" size={18} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Personal Info</Text>
              <Text style={styles.rowSub} numberOfLines={1}>
                {displayName || 'Not set'} · {user?.email}
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>

        <View style={styles.rowDivider} />

        {/* Scan History row — navigates to dedicated screen */}
        <Pressable style={styles.settingsRow} onPress={() => router.push('/scan-history')}>
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#E8F4FF' }]}>
              <Ionicons name="time-outline" size={18} color="#4A90E2" />
            </View>
            <View>
              <Text style={styles.rowTitle}>Scan History</Text>
              <Text style={styles.rowSub}>View your scanned meals</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      </View>

      {/* APP SETTINGS Card */}
      <Text style={styles.cardGroupLabel}>APP SETTINGS</Text>
      <View style={styles.settingsCard}>
        <Pressable style={styles.settingsRow} onPress={handleLogout} disabled={loggingOut}>
          <View style={styles.settingsRowLeft}>
            <View style={[styles.rowIcon, { backgroundColor: '#FFF0F0' }]}>
              {loggingOut
                ? <ActivityIndicator size="small" color={colors.error} />
                : <Ionicons name="log-out-outline" size={18} color={colors.error} />}
            </View>
            <Text style={[styles.rowTitle, { color: colors.error }]}>
              {loggingOut ? 'Logging out...' : 'Log Out'}
            </Text>
          </View>
        </Pressable>
      </View>

      <Text style={styles.versionText}>SmartPlate v1.0</Text>
    </View>
  );

  return (
    <FlatList
      style={styles.list}
      contentContainerStyle={styles.listContent}
      data={[]}
      keyExtractor={(_, i) => String(i)}
      ListHeaderComponent={ListHeader}
      renderItem={() => null}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.background },
  listContent: { paddingBottom: spacing.xxl },

  // Guest screen (welcome-style)
  guestScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
  },
  guestLogoBox: {
    width: 88, height: 88,
    borderRadius: radii.xl,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  guestAppName: {
    fontSize: 15, fontWeight: '700',
    color: colors.primary, letterSpacing: 1,
    marginBottom: spacing.lg,
  },
  guestTitle: {
    fontSize: 32, fontWeight: '800',
    color: colors.textPrimary,
    textAlign: 'center', lineHeight: 40,
    marginBottom: spacing.md,
  },
  guestSubtitle: {
    ...typography.body,
    textAlign: 'center', lineHeight: 23,
    marginBottom: spacing.xl,
  },
  guestAuthRow: {
    flexDirection: 'row', gap: spacing.md,
    width: '100%',
  },
  guestSignUpBtn: {
    flex: 1, backgroundColor: colors.primary,
    paddingVertical: 16, borderRadius: radii.pill, alignItems: 'center',
  },
  guestSignUpBtnText: { ...typography.button },
  guestSignInBtn: {
    flex: 1, backgroundColor: colors.background,
    paddingVertical: 16, borderRadius: radii.pill, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  guestSignInBtnText: { ...typography.button, color: colors.textPrimary },

  profileTop: {
    alignItems: 'center',
    paddingTop: spacing.xl, paddingBottom: spacing.lg, paddingHorizontal: spacing.lg,
  },
  avatarBox: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 34, fontWeight: '700', color: colors.white },
  nameText: { ...typography.h1, marginBottom: 6 },
  memberBadgeWrap: {
    backgroundColor: '#EBF7D9',
    paddingHorizontal: 14, paddingVertical: 4,
    borderRadius: radii.pill,
  },
  memberBadgeText: { fontSize: 13, fontWeight: '600', color: colors.primary },

  cardGroupLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm,
  },
  settingsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
  },
  settingsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: 14,
  },
  settingsRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flex: 1 },
  rowIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  rowTitle: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  rowSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  rowDivider: { height: 1, backgroundColor: colors.border, marginLeft: 56 + spacing.md },

  versionText: { ...typography.caption, textAlign: 'center', marginTop: spacing.xl, color: colors.textMuted },
});
