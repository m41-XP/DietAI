import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api, { getProfile } from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';

type BackendProfile = {
  age?: number;
  gender?: string;
  nationality?: string;
  height_cm?: number;
  weight_kg?: number;
  goal?: string;
  target_weight_kg?: number;
  weekly_pace_kg?: number;
  activity_level?: string;
  diet_type?: string;
};

function InfoRow({ icon, label, value, iconBg }: {
  icon: string;
  label: string;
  value: string;
  iconBg: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={[styles.rowIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={17} color={colors.primary} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value || '—'}</Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View style={styles.divider} />;
}

export default function PersonalInfoScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [profile, setProfile] = useState<BackendProfile | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/me/'),
      getProfile(),
    ])
      .then(([meRes, profileRes]) => {
        setEmail(meRes.data.email || '');
        setFirstName(meRes.data.first_name || '');
        setLastName(meRes.data.last_name || '');
        setProfile(profileRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || '—';

  const heightDisplay = profile?.height_cm ? `${profile.height_cm} cm` : '—';
  const weightDisplay = profile?.weight_kg ? `${profile.weight_kg} kg` : '—';
  const targetWeightDisplay = profile?.target_weight_kg ? `${profile.target_weight_kg} kg` : '—';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Personal Info</Text>
        <Pressable
          style={styles.editBtn}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.editBtnText}>Edit</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarBox}>
              <Text style={styles.avatarText}>
                {(firstName[0] || email[0] || '?').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.avatarName}>{displayName}</Text>
            <Text style={styles.avatarEmail}>{email}</Text>
          </View>

          {/* ACCOUNT */}
          <Text style={styles.sectionLabel}>ACCOUNT</Text>
          <View style={styles.card}>
            <InfoRow
              icon="person-outline"
              label="Full Name"
              value={displayName}
              iconBg="#E8F5E9"
            />
            <Divider />
            <InfoRow
              icon="mail-outline"
              label="Email"
              value={email}
              iconBg="#E8F4FF"
            />
          </View>

          {/* BODY METRICS */}
          <Text style={styles.sectionLabel}>BODY METRICS</Text>
          <View style={styles.card}>
            <InfoRow
              icon="calendar-outline"
              label="Age"
              value={profile?.age ? `${profile.age} years` : '—'}
              iconBg="#FFF8EC"
            />
            <Divider />
            <InfoRow
              icon="male-female-outline"
              label="Gender"
              value={profile?.gender || '—'}
              iconBg="#F3EEFF"
            />
            <Divider />
            <InfoRow
              icon="flag-outline"
              label="Nationality"
              value={profile?.nationality || '—'}
              iconBg="#FFF3E0"
            />
            <Divider />
            <InfoRow
              icon="resize-outline"
              label="Height"
              value={heightDisplay}
              iconBg="#E8F5E9"
            />
            <Divider />
            <InfoRow
              icon="barbell-outline"
              label="Weight"
              value={weightDisplay}
              iconBg="#E8F5E9"
            />
          </View>

          {/* GOALS */}
          <Text style={styles.sectionLabel}>GOALS</Text>
          <View style={styles.card}>
            <InfoRow
              icon="flag-outline"
              label="Goal"
              value={profile?.goal || '—'}
              iconBg="#E8F5E9"
            />
            <Divider />
            <InfoRow
              icon="scale-outline"
              label="Target Weight"
              value={targetWeightDisplay}
              iconBg="#FFF8EC"
            />
            <Divider />
            <InfoRow
              icon="trending-up-outline"
              label="Weekly Pace"
              value={profile?.weekly_pace_kg ? `${profile.weekly_pace_kg} kg/wk` : '—'}
              iconBg="#EEF5FF"
            />
          </View>

          {/* LIFESTYLE */}
          <Text style={styles.sectionLabel}>LIFESTYLE</Text>
          <View style={styles.card}>
            <InfoRow
              icon="bicycle-outline"
              label="Activity Level"
              value={profile?.activity_level || '—'}
              iconBg="#E8F5E9"
            />
            <Divider />
            <InfoRow
              icon="leaf-outline"
              label="Diet Type"
              value={profile?.diet_type || '—'}
              iconBg="#F0FFF4"
            />
          </View>

          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h2 },
  editBtn: { minWidth: 40, height: 40, justifyContent: 'center', alignItems: 'flex-end' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: colors.primary },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  content: { paddingBottom: 40 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  avatarBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  avatarText: { fontSize: 30, fontWeight: '700', color: colors.white },
  avatarName: { ...typography.h2, marginBottom: 4 },
  avatarEmail: { fontSize: 14, color: colors.textMuted },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: spacing.lg, marginTop: spacing.lg, marginBottom: spacing.sm,
  },

  card: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1, borderColor: colors.border,
    ...shadow,
  },

  infoRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing.md, paddingVertical: 14,
    gap: spacing.md,
  },
  rowIcon: {
    width: 36, height: 36, borderRadius: 10,
    justifyContent: 'center', alignItems: 'center',
  },
  rowContent: { flex: 1 },
  rowLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '500', marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },

  divider: { height: 1, backgroundColor: colors.border, marginLeft: 52 + spacing.md },
});
