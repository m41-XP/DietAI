import React, { useContext, useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Image,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from '../../src/context/AuthContext';
import { useAuthSheet } from '../../src/context/AuthSheetContext';
import { colors, spacing, radii, typography, shadow, shadowSm } from '../../src/theme';
import api, { getWeekPlan, generateWeekPlan, logWeight } from '../../src/services/api';

function getMondayOf(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });
}

function sumPlanNutrition(plan: any) {
  if (!plan) return null;
  let kcal = 0, protein = 0, carbs = 0, fat = 0;
  const add = (m: any) => {
    if (!m) return;
    kcal += m.calories || 0;
    protein += m.protein_g || 0;
    carbs += m.carbs_g || 0;
    fat += m.fat_g || 0;
  };
  add(plan.breakfast);
  add(plan.lunch);
  add(plan.dinner);
  if (Array.isArray(plan.snacks)) plan.snacks.forEach(add);
  return { kcal: Math.round(kcal), kj: Math.round(kcal * 4.184), protein: Math.round(protein), carbs: Math.round(carbs), fat: Math.round(fat) };
}

export default function HomeScreen() {
  const { userToken, user } = useContext(AuthContext) as any;
  const { openLogin, openRegister } = useAuthSheet();
  const router = useRouter();

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = getMondayOf(new Date());

  const [recentScans, setRecentScans] = useState<any[]>([]);
  const [todayNutrition, setTodayNutrition] = useState<ReturnType<typeof sumPlanNutrition>>(null);
  const [hasPlan, setHasPlan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Weekly check-in modal
  const [showCheckin, setShowCheckin] = useState(false);
  const [checkinWeight, setCheckinWeight] = useState('');
  const [checkinRating, setCheckinRating] = useState<'up' | 'down' | null>(null);
  const [checkinSubmitting, setCheckinSubmitting] = useState(false);

  const firstName = user?.first_name || user?.email?.split('@')[0] || 'there';

  const fetchData = useCallback(async () => {
    if (!userToken) return;
    await Promise.allSettled([
      // Recent scans
      api.get('/api/scans/').then((res) => setRecentScans((res.data || []).slice(0, 3))),
      // Today's plan nutrition
      getWeekPlan(weekStart).then((res) => {
        const plans: any[] = res.data || [];
        const todayPlan = plans.find((p: any) => p.date === today);
        setHasPlan(plans.length > 0);
        setTodayNutrition(sumPlanNutrition(todayPlan));

        // New week with no plan? Show check-in if there was previous activity
        if (plans.length === 0) {
          // Only show check-in popup if user had a profile (would have had a plan before)
          setShowCheckin(true);
        }
      }),
    ]);
  }, [userToken, weekStart, today]);

  useEffect(() => {
    setLoading(true);
    fetchData().finally(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleCheckinSubmit = async () => {
    setCheckinSubmitting(true);
    try {
      if (checkinWeight.trim()) {
        await logWeight({ weight_kg: parseFloat(checkinWeight) });
      }
      // Pass rating so Gemini can adjust next week's style
      const res = await generateWeekPlan(weekStart, checkinRating ?? undefined);
      const plans: any[] = res.data || [];
      const todayPlan = plans.find((p: any) => p.date === today);
      setHasPlan(plans.length > 0);
      setTodayNutrition(sumPlanNutrition(todayPlan));
    } catch { /* silent */ }
    finally {
      setCheckinSubmitting(false);
      setShowCheckin(false);
      setCheckinWeight('');
      setCheckinRating(null);
    }
  };

  const handleCheckinSkip = async () => {
    setShowCheckin(false);
    // Still generate the plan even if skipped (no rating)
    try {
      const res = await generateWeekPlan(weekStart);
      const plans: any[] = res.data || [];
      const todayPlan = plans.find((p: any) => p.date === today);
      setHasPlan(plans.length > 0);
      setTodayNutrition(sumPlanNutrition(todayPlan));
    } catch { /* silent */ }
  };

  // ── Guest view ──────────────────────────────────────────────
  if (!userToken) {
    return (
      <View style={styles.guestContainer}>
        <View style={styles.logoBox}>
          <Ionicons name="restaurant" size={40} color={colors.primary} />
        </View>
        <Text style={styles.guestTitle}>SmartPlate</Text>
        <Text style={styles.guestSubtitle}>
          Track calories, scan food, and build{'\n'}personalized meal plans.
        </Text>
        <Pressable style={styles.primaryBtn} onPress={openLogin}>
          <Text style={styles.primaryBtnText}>Sign In</Text>
        </Pressable>
        <Pressable style={styles.outlineBtn} onPress={openRegister}>
          <Text style={styles.outlineBtnText}>Create Account</Text>
        </Pressable>
      </View>
    );
  }

  // ── Logged-in view ──────────────────────────────────────────
  return (
    <>
      <ScrollView
        style={styles.screen}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerDate}>{formatDate()}</Text>
            <Text style={styles.headerGreeting}>{getGreeting()}, {firstName}</Text>
          </View>
          <View style={styles.bellBtn}>
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </View>
        </View>

        {/* ── Today's Nutrition card ── */}
        {todayNutrition ? (
          <View style={styles.nutritionCard}>
            <Text style={styles.cardLabel}>TODAY'S PLAN</Text>
            <View style={styles.kcalRow}>
              <View>
                <Text style={styles.kcalBig}>{todayNutrition.kcal.toLocaleString()}</Text>
                <Text style={styles.kcalUnit}>kcal</Text>
              </View>
              <View style={styles.kjBadge}>
                <Text style={styles.kjText}>{todayNutrition.kj.toLocaleString()} kJ</Text>
              </View>
            </View>
            <View style={styles.macroRow}>
              {[
                { label: 'Protein', val: todayNutrition.protein, color: colors.primary },
                { label: 'Carbs',   val: todayNutrition.carbs,   color: colors.info },
                { label: 'Fat',     val: todayNutrition.fat,      color: colors.warning },
              ].map(({ label, val, color }) => (
                <View key={label} style={styles.macroItem}>
                  <Text style={[styles.macroVal, { color }]}>{val}g</Text>
                  <Text style={styles.macroLabel}>{label}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : hasPlan ? (
          // Plan exists but today has no entry (e.g. viewing past week edge case)
          <View style={styles.nutritionCard}>
            <Text style={styles.cardLabel}>TODAY'S PLAN</Text>
            <Text style={styles.noPlanText}>No meal planned for today.</Text>
          </View>
        ) : (
          // No plan at all — link to plan tab
          <Pressable style={styles.nutritionCard} onPress={() => router.push('/(tabs)/plan')}>
            <Text style={styles.cardLabel}>TODAY'S PLAN</Text>
            <View style={styles.noPlanRow}>
              <Ionicons name="sparkles-outline" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.noPlanTitle}>No plan yet this week</Text>
                <Text style={styles.noPlanSub}>Tap to visit your Meal Plan tab</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </View>
          </Pressable>
        )}

        {/* ── Recent Scans ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Scans</Text>
            <Pressable onPress={() => router.push('/scan-history?filter=scan')}>
              <Text style={styles.viewAll}>View All</Text>
            </Pressable>
          </View>

          {loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.lg }} />
          ) : recentScans.length === 0 ? (
            <View style={styles.emptyMeals}>
              <View style={styles.emptyIcon}>
                <Ionicons name="fast-food-outline" size={32} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyText}>No scans yet</Text>
              <Text style={styles.emptySubText}>Scan your first meal to start tracking</Text>
            </View>
          ) : (
            recentScans.map((scan) => (
              <View key={scan.id} style={styles.mealCard}>
                {scan.scanned_image ? (
                  <Image source={{ uri: scan.scanned_image }} style={styles.mealThumb} />
                ) : (
                  <View style={[styles.mealThumb, styles.mealThumbPlaceholder]}>
                    <Ionicons name="fast-food-outline" size={22} color={colors.textMuted} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.mealName} numberOfLines={1}>{scan.dish_name || 'Unknown dish'}</Text>
                  <Text style={styles.mealMeta}>
                    {new Date(scan.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
                <View style={styles.mealKcalBadge}>
                  <Text style={styles.mealKcalText}>{scan.calories} kcal</Text>
                </View>
              </View>
            ))
          )}
        </View>

        {/* ── Scan CTA ── */}
        <Pressable style={styles.scanCTA} onPress={() => router.push('/(tabs)')}>
          <Ionicons name="scan-outline" size={20} color={colors.white} />
          <Text style={styles.scanCTAText}>Scan a Meal</Text>
        </Pressable>
      </ScrollView>

      {/* ── Weekly Check-in Modal ── */}
      <Modal visible={showCheckin} transparent animationType="fade">
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.checkinModal}>
            <View style={styles.checkinIconWrap}>
              <Ionicons name="calendar-outline" size={28} color={colors.primary} />
            </View>
            <Text style={styles.checkinTitle}>New Week, New Plan!</Text>
            <Text style={styles.checkinSub}>
              A fresh week is here. Log your current weight (optional) so we can fine-tune your plan.
            </Text>

            <Text style={styles.inputLabel}>Current weight (kg)</Text>
            <TextInput
              style={styles.weightInput}
              value={checkinWeight}
              onChangeText={setCheckinWeight}
              placeholder="e.g. 74.5"
              placeholderTextColor={colors.textMuted}
              keyboardType="decimal-pad"
            />

            <Text style={styles.inputLabel}>How was last week's plan?</Text>
            <View style={styles.ratingRow}>
              <Pressable
                style={[styles.ratingBtn, checkinRating === 'up' && styles.ratingBtnActive]}
                onPress={() => setCheckinRating('up')}
              >
                <Ionicons name="thumbs-up" size={22} color={checkinRating === 'up' ? colors.white : colors.textSecondary} />
                <Text style={[styles.ratingText, checkinRating === 'up' && { color: colors.white }]}>Liked it</Text>
              </Pressable>
              <Pressable
                style={[styles.ratingBtn, checkinRating === 'down' && styles.ratingBtnActiveNeg]}
                onPress={() => setCheckinRating('down')}
              >
                <Ionicons name="thumbs-down" size={22} color={checkinRating === 'down' ? colors.white : colors.textSecondary} />
                <Text style={[styles.ratingText, checkinRating === 'down' && { color: colors.white }]}>Not great</Text>
              </Pressable>
            </View>

            <Pressable
              style={[styles.checkinSubmitBtn, checkinSubmitting && { opacity: 0.6 }]}
              onPress={handleCheckinSubmit}
              disabled={checkinSubmitting}
            >
              {checkinSubmitting
                ? <ActivityIndicator size="small" color={colors.white} />
                : <Text style={styles.checkinSubmitText}>Generate my new plan</Text>}
            </Pressable>

            <Pressable style={styles.skipBtn} onPress={handleCheckinSkip} disabled={checkinSubmitting}>
              <Text style={styles.skipText}>Skip</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.backgroundAlt },
  content: { paddingBottom: 48 },

  // Guest
  guestContainer: {
    flex: 1, backgroundColor: colors.background,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl,
  },
  logoBox: {
    width: 88, height: 88, borderRadius: radii.xl,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.lg,
  },
  guestTitle: { ...typography.hero, marginBottom: spacing.sm },
  guestSubtitle: { ...typography.body, textAlign: 'center', lineHeight: 22, marginBottom: spacing.xl },
  primaryBtn: {
    backgroundColor: colors.primary, width: '100%',
    paddingVertical: 16, borderRadius: radii.pill, alignItems: 'center', marginBottom: spacing.md,
  },
  primaryBtnText: { ...typography.button },
  outlineBtn: {
    width: '100%', paddingVertical: 16, borderRadius: radii.pill,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
  },
  outlineBtnText: { ...typography.button, color: colors.textPrimary },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: spacing.md, paddingTop: 60, paddingBottom: spacing.md,
    backgroundColor: colors.background,
  },
  headerDate: { fontSize: 13, color: colors.textMuted, fontWeight: '500', marginBottom: 2 },
  headerGreeting: { fontSize: 20, fontWeight: '700', color: colors.textPrimary },
  bellBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },

  // Nutrition card
  nutritionCard: {
    backgroundColor: colors.background,
    marginHorizontal: spacing.md, marginTop: spacing.md,
    borderRadius: radii.xl, padding: spacing.lg, ...shadow,
  },
  cardLabel: { ...typography.label, marginBottom: spacing.sm },
  kcalRow: {
    flexDirection: 'row', alignItems: 'flex-end',
    justifyContent: 'space-between', marginBottom: spacing.md,
  },
  kcalBig: { fontSize: 40, fontWeight: '800', color: colors.textPrimary, lineHeight: 44 },
  kcalUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: '500', marginTop: 2 },
  kjBadge: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: radii.pill,
  },
  kjText: { fontSize: 13, color: colors.primaryDark, fontWeight: '600' },
  macroRow: {
    flexDirection: 'row',
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingTop: spacing.md, gap: spacing.sm,
  },
  macroItem: { flex: 1, alignItems: 'center' },
  macroVal: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
  noPlanRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginTop: spacing.sm },
  noPlanTitle: { fontSize: 15, fontWeight: '700', color: colors.textPrimary },
  noPlanSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  noPlanText: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },

  // Section
  section: { marginTop: spacing.lg, paddingHorizontal: spacing.md },
  sectionHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: spacing.md,
  },
  sectionTitle: { ...typography.h2 },
  viewAll: { fontSize: 14, color: colors.primary, fontWeight: '600' },

  // Empty state
  emptyMeals: { alignItems: 'center', paddingVertical: spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  emptyText: { ...typography.h3, marginBottom: spacing.xs },
  emptySubText: { ...typography.body, textAlign: 'center' },

  // Meal card
  mealCard: {
    backgroundColor: colors.background, borderRadius: radii.lg,
    padding: spacing.md, flexDirection: 'row', alignItems: 'center',
    marginBottom: spacing.sm, ...shadowSm,
  },
  mealThumb: { width: 52, height: 52, borderRadius: radii.md, marginRight: spacing.md },
  mealThumbPlaceholder: { backgroundColor: colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' },
  mealName: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  mealMeta: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
  mealKcalBadge: {
    backgroundColor: colors.primaryLight, paddingHorizontal: 10,
    paddingVertical: 4, borderRadius: radii.pill,
  },
  mealKcalText: { fontSize: 13, color: colors.primaryDark, fontWeight: '700' },

  // Scan CTA
  scanCTA: {
    backgroundColor: colors.primary, marginHorizontal: spacing.md, marginTop: spacing.lg,
    borderRadius: radii.pill, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
  },
  scanCTAText: { ...typography.button },

  // Check-in modal
  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center', alignItems: 'center', padding: spacing.xl,
  },
  checkinModal: {
    width: '100%', backgroundColor: colors.white,
    borderRadius: radii.xl, padding: spacing.xl, alignItems: 'center',
  },
  checkinIconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.md,
  },
  checkinTitle: { fontSize: 20, fontWeight: '800', color: colors.textPrimary, marginBottom: spacing.xs },
  checkinSub: {
    fontSize: 14, color: colors.textSecondary, textAlign: 'center',
    lineHeight: 20, marginBottom: spacing.lg,
  },
  inputLabel: {
    alignSelf: 'flex-start', fontSize: 13, fontWeight: '600',
    color: colors.textPrimary, marginBottom: 6,
  },
  weightInput: {
    width: '100%', backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md, padding: 12, fontSize: 16,
    color: colors.textPrimary, borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.md,
  },
  ratingRow: { flexDirection: 'row', gap: spacing.sm, width: '100%', marginBottom: spacing.lg },
  ratingBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, paddingVertical: 12, borderRadius: radii.lg,
    borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.backgroundAlt,
  },
  ratingBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  ratingBtnActiveNeg: { backgroundColor: '#E05C5C', borderColor: '#E05C5C' },
  ratingText: { fontSize: 14, fontWeight: '600', color: colors.textSecondary },
  checkinSubmitBtn: {
    width: '100%', backgroundColor: colors.primary,
    paddingVertical: 14, borderRadius: radii.pill,
    alignItems: 'center', marginBottom: spacing.sm,
  },
  checkinSubmitText: { ...typography.button },
  skipBtn: { paddingVertical: 8 },
  skipText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
});
