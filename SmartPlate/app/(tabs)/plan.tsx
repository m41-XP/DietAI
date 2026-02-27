import { useEffect, useState, useContext, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet, ScrollView,
  ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthSheet } from '../../src/context/AuthSheetContext';
import { AuthContext } from '../../src/context/AuthContext';
import {
  getWeekPlan, generateWeekPlan, regenerateSlot,
} from '../../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../../src/theme';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SLOTS = ['breakfast', 'lunch', 'dinner', 'snacks'] as const;
type Slot = typeof SLOTS[number];

function getMondayOf(d: Date): string {
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(d);
  mon.setDate(d.getDate() + diff);
  return mon.toISOString().slice(0, 10);
}

function getWeekDates(monday: string): string[] {
  const dates: string[] = [];
  const base = new Date(monday + 'T00:00:00');
  for (let i = 0; i < 7; i++) {
    const d = new Date(base);
    d.setDate(base.getDate() + i);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

function slotLabel(slot: Slot): string {
  return slot === 'snacks' ? 'Snack' : slot.charAt(0).toUpperCase() + slot.slice(1);
}

function slotIcon(slot: Slot): string {
  const map: Record<Slot, string> = {
    breakfast: 'sunny-outline',
    lunch: 'partly-sunny-outline',
    dinner: 'moon-outline',
    snacks: 'nutrition-outline',
  };
  return map[slot];
}

function MealImage({ imageUrl }: { imageUrl?: string }) {
  if (!imageUrl) {
    return (
      <View style={[styles.mealImgPlaceholder, { backgroundColor: colors.primaryLight }]}>
        <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
      </View>
    );
  }
  return <Image source={{ uri: imageUrl }} style={styles.mealImg} resizeMode="cover" />;
}

export default function PlanScreen() {
  const { userToken } = useContext(AuthContext);
  const { openLogin } = useAuthSheet();

  const today = new Date().toISOString().slice(0, 10);
  const [weekStart] = useState(getMondayOf(new Date()));
  const weekDates = getWeekDates(weekStart);
  const todayIndex = weekDates.indexOf(today);
  const [selectedDay, setSelectedDay] = useState(todayIndex >= 0 ? todayIndex : 0);

  const [weekPlan, setWeekPlan] = useState<any[]>([]);
  const [hasProfile, setHasProfile] = useState(true);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [regenSlot, setRegenSlot] = useState<Slot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const openMealDetail = (meal: object) => {
    router.push({ pathname: '/meal-detail', params: { data: JSON.stringify(meal) } });
  };

  const loadPlan = useCallback(async () => {
    try {
      const res = await getWeekPlan(weekStart);
      setWeekPlan(res.data);
      setHasProfile(true);
      // Auto-generate if no plan exists yet for this week
      if (!res.data || res.data.length === 0) {
        setGenerating(true);
        try {
          const gen = await generateWeekPlan(weekStart);
          setWeekPlan(gen.data);
        } finally {
          setGenerating(false);
        }
      }
    } catch (e: any) {
      if (e?.response?.status === 404) setHasProfile(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (!userToken) { setLoading(false); return; }
    setLoading(true);
    loadPlan().finally(() => setLoading(false));
  }, [userToken, loadPlan]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadPlan();
    setRefreshing(false);
  };

  const handleRegenSlot = async (slot: Slot) => {
    setRegenSlot(slot);
    try {
      const res = await regenerateSlot(weekDates[selectedDay], slot);
      setWeekPlan((prev) => {
        const updated = [...prev];
        const idx = updated.findIndex((p) => p.date === weekDates[selectedDay]);
        if (idx >= 0) updated[idx] = res.data;
        return updated;
      });
    } catch { /* silent */ }
    finally { setRegenSlot(null); }
  };

  const getMealName = (slot: Slot, mealData: any): string => {
    if (slot === 'snacks') {
      return Array.isArray(mealData) && mealData.length > 0
        ? mealData[0]?.name || 'Snack'
        : 'Snack';
    }
    return mealData?.name || slotLabel(slot);
  };

  const getMealCals = (slot: Slot, mealData: any): number => {
    if (slot === 'snacks') {
      return Array.isArray(mealData)
        ? mealData.reduce((s: number, m: any) => s + (m.calories || 0), 0)
        : 0;
    }
    return mealData?.calories || 0;
  };

  // ── Guest ──
  if (!userToken) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Meal Plan</Text></View>
        <View style={styles.centered}>
          <View style={styles.lockBox}>
            <Ionicons name="lock-closed" size={32} color={colors.textMuted} />
          </View>
          <Text style={styles.lockTitle}>Your personalised plan awaits</Text>
          <Text style={styles.lockSubtitle}>Sign in to get an AI meal plan tailored to your goals.</Text>
          <Pressable style={styles.signInBtn} onPress={openLogin}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Meal Plan</Text></View>
        <View style={styles.centered}><ActivityIndicator size="large" color={colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!hasProfile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}><Text style={styles.headerTitle}>Meal Plan</Text></View>
        <View style={styles.centered}>
          <Ionicons name="person-outline" size={40} color={colors.textMuted} />
          <Text style={styles.lockTitle}>Complete your profile first</Text>
          <Text style={styles.lockSubtitle}>Finish onboarding to get your personalised plan.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const todayPlan = weekPlan.find((p) => p.date === weekDates[selectedDay]);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Meal Plan</Text>
        {generating && (
          <View style={styles.generatingBadge}>
            <ActivityIndicator size="small" color={colors.white} />
            <Text style={styles.generatingBadgeText}>Generating…</Text>
          </View>
        )}
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
      >
        {/* Day selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.dayScroll}
          contentContainerStyle={styles.dayScrollContent}
        >
          {DAYS.map((day, i) => {
            const isToday = weekDates[i] === today;
            const isSelected = i === selectedDay;
            const dayHasPlan = weekPlan.some((p) => p.date === weekDates[i]);
            return (
              <Pressable
                key={day}
                style={[styles.dayPill, isSelected && styles.dayPillActive]}
                onPress={() => setSelectedDay(i)}
              >
                <Text style={[styles.dayPillLabel, isSelected && styles.dayPillLabelActive]}>{day}</Text>
                <Text style={[styles.dayPillDate, isSelected && styles.dayPillDateActive]}>
                  {new Date(weekDates[i] + 'T00:00:00').getDate()}
                </Text>
                {isToday && <View style={[styles.todayDot, isSelected && styles.todayDotActive]} />}
                {dayHasPlan && !isSelected && <View style={styles.planDot} />}
              </Pressable>
            );
          })}
        </ScrollView>

        {/* Generating overlay banner */}
        {generating && (
          <View style={styles.generatingBanner}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingTitle}>Building your week…</Text>
            <Text style={styles.generatingSubtitle}>
              Crafting 7 personalised days using your goals and preferences.
            </Text>
          </View>
        )}

        {/* Meal slots */}
        {!generating && SLOTS.map((slot) => {
          const mealData = todayPlan?.[slot];
          const isRegening = regenSlot === slot;
          const mealName = mealData ? getMealName(slot, mealData) : null;
          const mealCals = mealData ? getMealCals(slot, mealData) : 0;
          const mealDesc = slot !== 'snacks' ? mealData?.description : null;

          // For snacks: show each snack item separately
          const snackItems: any[] = slot === 'snacks' && Array.isArray(mealData) ? mealData : [];

          return (
            <View key={slot} style={styles.slotCard}>
              <View style={styles.slotHeader}>
                <View style={styles.slotIconWrap}>
                  <Ionicons name={slotIcon(slot) as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.slotTitle}>{slotLabel(slot)}</Text>
                {mealData && (
                  <Pressable style={styles.regenBtn} onPress={() => handleRegenSlot(slot)} disabled={!!regenSlot}>
                    {isRegening
                      ? <ActivityIndicator size="small" color={colors.textMuted} />
                      : <Ionicons name="refresh-outline" size={16} color={colors.textMuted} />}
                  </Pressable>
                )}
              </View>

              {slot !== 'snacks' && mealData && mealName ? (
                <Pressable
                  style={styles.plannedMeal}
                  onPress={() => openMealDetail({
                    name: mealName,
                    description: mealData.description,
                    source_url: mealData.source_url,
                    calories: mealCals,
                    protein_g: mealData.protein_g,
                    carbs_g: mealData.carbs_g,
                    fat_g: mealData.fat_g,
                    image_url: mealData.image_url,
                    ingredients: mealData.ingredients,
                    total_time_mins: mealData.total_time_mins,
                  })}
                >
                  <MealImage imageUrl={mealData.image_url} />
                  <View style={styles.plannedMealInfo}>
                    <Text style={styles.plannedMealName}>{mealName}</Text>
                    {mealDesc ? (
                      <Text style={styles.plannedMealDesc} numberOfLines={2}>{mealDesc}</Text>
                    ) : null}
                    <View style={styles.calPill}>
                      <Ionicons name="flame-outline" size={12} color={colors.primary} />
                      <Text style={styles.calPillText}>{mealCals} kcal</Text>
                    </View>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                </Pressable>
              ) : slot === 'snacks' && snackItems.length > 0 ? (
                <View style={styles.snackList}>
                  {snackItems.map((snack: any, idx: number) => (
                    <Pressable
                      key={idx}
                      style={styles.snackRow}
                      onPress={() => openMealDetail({
                        name: snack.name,
                        description: snack.description,
                        source_url: snack.source_url,
                        calories: snack.calories,
                        protein_g: snack.protein_g,
                        carbs_g: snack.carbs_g,
                        fat_g: snack.fat_g,
                        image_url: snack.image_url,
                        ingredients: snack.ingredients,
                        total_time_mins: snack.total_time_mins,
                      })}
                    >
                      <MealImage imageUrl={snack.image_url} />
                      <View style={styles.plannedMealInfo}>
                        <Text style={styles.snackName}>{snack.name}</Text>
                        {snack.description ? (
                          <Text style={styles.snackDesc} numberOfLines={1}>{snack.description}</Text>
                        ) : null}
                        <View style={styles.calPill}>
                          <Ionicons name="flame-outline" size={12} color={colors.primary} />
                          <Text style={styles.calPillText}>{snack.calories} kcal</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={14} color={colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              ) : (
                <Text style={styles.emptySlotText}>No meal planned</Text>
              )}
            </View>
          );
        })}

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
  headerTitle: { ...typography.h1 },
  generatingBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.primary,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: radii.pill,
  },
  generatingBadgeText: { color: colors.white, fontWeight: '700', fontSize: 12 },

  dayScroll: { backgroundColor: colors.white, borderBottomWidth: 1, borderBottomColor: colors.border },
  dayScrollContent: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm },
  dayPill: {
    alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: radii.lg, minWidth: 50, position: 'relative',
  },
  dayPillActive: { backgroundColor: colors.primary },
  dayPillLabel: { fontSize: 11, fontWeight: '600', color: colors.textSecondary, textTransform: 'uppercase' },
  dayPillLabelActive: { color: colors.white },
  dayPillDate: { fontSize: 17, fontWeight: '700', color: colors.textPrimary },
  dayPillDateActive: { color: colors.white },
  todayDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.primary, marginTop: 2 },
  todayDotActive: { backgroundColor: colors.white },
  planDot: {
    position: 'absolute', top: 5, right: 5,
    width: 6, height: 6, borderRadius: 3, backgroundColor: colors.success,
  },

  generatingBanner: {
    margin: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    ...shadow,
  },
  generatingTitle: { ...typography.h2, textAlign: 'center', marginTop: spacing.md },
  generatingSubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },

  slotCard: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow,
  },
  slotHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md, gap: spacing.sm },
  slotIconWrap: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  slotTitle: { ...typography.h2, fontSize: 16, flex: 1 },
  regenBtn: { padding: 4 },

  plannedMeal: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  mealImg: { width: 72, height: 72, borderRadius: radii.lg },
  mealImgPlaceholder: {
    width: 72, height: 72, borderRadius: radii.lg,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  plannedMealInfo: { flex: 1 },
  plannedMealName: { fontSize: 15, fontWeight: '700', color: colors.textPrimary, marginBottom: 3 },
  plannedMealDesc: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginBottom: spacing.sm },

  snackList: { gap: spacing.md },
  snackRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  snackName: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  snackDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },

  calPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start', marginTop: spacing.sm,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radii.pill,
  },
  calPillText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  emptySlotText: { fontSize: 14, color: colors.textMuted, fontStyle: 'italic' },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
  lockBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  lockTitle: { ...typography.h1, textAlign: 'center' },
  lockSubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },
  signInBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: radii.pill, marginTop: spacing.md,
  },
  signInBtnText: { ...typography.button },
});
