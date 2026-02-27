import { useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { submitCheckIn } from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';

function getMondayOf(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

const VERDICT_CONFIG: Record<string, { icon: string; color: string; title: string; body: string }> = {
  on_track: {
    icon: 'checkmark-circle',
    color: colors.success,
    title: "You're on track!",
    body: "Your weight change matches your goal perfectly. Keep following your meal plan — it's working.",
  },
  adjust_down: {
    icon: 'trending-down',
    color: '#4A90E2',
    title: 'Small adjustment made',
    body: "Your progress is a little slower than expected. Your daily calorie target has been nudged down slightly.",
  },
  adjust_up: {
    icon: 'trending-up',
    color: '#F5A623',
    title: 'Ease up a little',
    body: "You're progressing faster than planned. A few extra calories have been added to keep things balanced.",
  },
  poor_adherence: {
    icon: 'checkmark-circle',
    color: colors.success,
    title: "Logged!",
    body: "Your weight has been recorded. Keep following your meal plan and check in again next week.",
  },
};

export default function CheckInScreen() {
  const router = useRouter();
  const weekStart = getMondayOf(new Date());

  const [weight, setWeight] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const w = parseFloat(weight);
    if (!w || w < 20 || w > 500) {
      setError('Please enter a valid weight (20–500 kg).');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const res = await submitCheckIn({
        week_start: weekStart,
        logged_weight_kg: w,
      });
      setResult(res.data);
    } catch (e: any) {
      setError(e.response?.data?.detail || 'Check-in failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const verdict = result ? VERDICT_CONFIG[result.verdict] ?? VERDICT_CONFIG.on_track : null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Weekly Check-in</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {!result ? (
          <>
            {/* Intro card */}
            <View style={styles.introCard}>
              <View style={styles.introIconWrap}>
                <Ionicons name="scale-outline" size={32} color={colors.primary} />
              </View>
              <Text style={styles.introTitle}>Log this week's weight</Text>
              <Text style={styles.introBody}>
                Weigh yourself first thing in the morning, after using the bathroom.
                We'll compare it to your expected progress and adjust your plan if needed.
              </Text>
            </View>

            {/* Weight input */}
            <View style={styles.inputCard}>
              <Text style={styles.inputLabel}>Current weight</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={styles.weightInput}
                  value={weight}
                  onChangeText={setWeight}
                  placeholder="e.g. 75.5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <View style={styles.unitBadge}>
                  <Text style={styles.unitText}>kg</Text>
                </View>
              </View>
              {error ? (
                <View style={styles.errorRow}>
                  <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
                  <Text style={styles.errorText}>{error}</Text>
                </View>
              ) : null}
            </View>

            {/* Info boxes */}
            <View style={styles.infoGrid}>
              {[
                { icon: 'trending-down-outline', label: 'Progress', desc: 'Actual vs expected weight change' },
                { icon: 'refresh-outline', label: 'Adjustment', desc: 'Calorie target updated automatically if needed' },
              ].map(({ icon, label, desc }) => (
                <View key={label} style={styles.infoBox}>
                  <Ionicons name={icon as any} size={20} color={colors.primary} />
                  <Text style={styles.infoBoxLabel}>{label}</Text>
                  <Text style={styles.infoBoxDesc}>{desc}</Text>
                </View>
              ))}
            </View>

            <Pressable
              style={[styles.submitBtn, (submitting || !weight) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting || !weight}
            >
              {submitting
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.submitBtnText}>Submit Check-in</Text>}
            </Pressable>
          </>
        ) : (
          <>
            {/* Result card */}
            <View style={[styles.resultCard, { borderColor: verdict!.color + '40', borderWidth: 2 }]}>
              <Ionicons name={verdict!.icon as any} size={48} color={verdict!.color} />
              <Text style={[styles.resultTitle, { color: verdict!.color }]}>{verdict!.title}</Text>
              <Text style={styles.resultBody}>{verdict!.body}</Text>
            </View>

            {/* Stats grid */}
            <View style={styles.statsGrid}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{result.actual_change_kg > 0 ? '+' : ''}{result.actual_change_kg} kg</Text>
                <Text style={styles.statLabel}>Actual change</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{result.expected_change_kg > 0 ? '+' : ''}{result.expected_change_kg} kg</Text>
                <Text style={styles.statLabel}>Expected change</Text>
              </View>
              <View style={[styles.statBox, { minWidth: '100%' }]}>
                <Text style={[styles.statValue, { color: colors.primary }]}>{result.new_daily_calories} kcal</Text>
                <Text style={styles.statLabel}>Your daily calorie target</Text>
              </View>
            </View>

            {result.calorie_adjustment !== 0 && (
              <View style={styles.adjustmentBanner}>
                <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
                <Text style={styles.adjustmentText}>
                  Daily calories {result.calorie_adjustment > 0 ? 'increased' : 'decreased'} by{' '}
                  <Text style={{ fontWeight: '700' }}>{Math.abs(result.calorie_adjustment)} kcal</Text>
                  {' '}to keep you on track.
                </Text>
              </View>
            )}

            <Pressable style={styles.doneBtn} onPress={() => router.back()}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h2 },

  content: { padding: spacing.lg, gap: spacing.md },

  introCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  introIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  introTitle: { ...typography.h1, textAlign: 'center' },
  introBody: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },

  inputCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow,
  },
  inputLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: spacing.sm },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  weightInput: {
    flex: 1,
    fontSize: 40,
    fontWeight: '800',
    color: colors.primary,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    padding: spacing.md,
    textAlign: 'center',
  },
  unitBadge: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radii.lg,
  },
  unitText: { fontSize: 18, fontWeight: '700', color: colors.primary },
  errorRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  errorText: { fontSize: 13, color: colors.error },

  infoGrid: { flexDirection: 'row', gap: spacing.sm },
  infoBox: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.md,
    alignItems: 'center',
    gap: 6,
    ...shadow,
  },
  infoBoxLabel: { fontSize: 12, fontWeight: '700', color: colors.textPrimary, textAlign: 'center' },
  infoBoxDesc: { fontSize: 11, color: colors.textMuted, textAlign: 'center', lineHeight: 15 },

  submitBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { ...typography.button },

  // Result
  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  resultTitle: { ...typography.h1, textAlign: 'center', marginTop: spacing.sm },
  resultBody: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statBox: {
    flex: 1,
    minWidth: '44%',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    alignItems: 'center',
    gap: 4,
    ...shadow,
  },
  statValue: { fontSize: 26, fontWeight: '800', color: colors.textPrimary },
  statLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500', textAlign: 'center' },

  adjustmentBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.primaryLight,
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  adjustmentText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  doneBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 8, elevation: 4,
  },
  doneBtnText: { ...typography.button },
});
