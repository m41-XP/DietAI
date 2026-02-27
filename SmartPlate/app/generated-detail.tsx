import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  Image, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';

const CUISINES: Record<string, string> = {
  Moroccan: '🇲🇦', Italian: '🇮🇹', French: '🇫🇷', Japanese: '🇯🇵',
  Mexican: '🇲🇽', Indian: '🇮🇳', Chinese: '🇨🇳', American: '🇺🇸',
  Turkish: '🇹🇷', Lebanese: '🇱🇧',
};

export default function GeneratedDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [dish, setDish] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!id) { setErrorMsg('No dish ID provided.'); setLoading(false); return; }
    api.get(`/api/chef/history/${id}/`)
      .then((res) => setDish(res.data))
      .catch(() => setErrorMsg('Could not load dish details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBack = () => router.canGoBack() ? router.back() : router.replace('/scan-history');

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Generated Dish</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (errorMsg || !dish) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Generated Dish</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{errorMsg || 'Dish not found.'}</Text>
          <Pressable style={styles.retryBtn} onPress={handleBack}>
            <Ionicons name="arrow-back" size={18} color={colors.white} />
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const date = new Date(dish.generated_at);
  const dateLabel = date.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const timeLabel = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  const ingredients: { name: string; calories: number }[] = dish.ingredients ?? [];
  const hasNutrition = dish.calories > 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Generated Dish</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {dish.generated_image ? (
          <Image source={{ uri: dish.generated_image }} style={styles.heroImage} resizeMode="cover" />
        ) : (
          <View style={[styles.heroImage, styles.heroPlaceholder]}>
            <Ionicons name="restaurant-outline" size={60} color={colors.textMuted} />
          </View>
        )}

        <View style={styles.card}>
          {/* Generated badge */}
          <View style={styles.genBadge}>
            <Ionicons name="restaurant-outline" size={12} color={colors.primary} />
            <Text style={styles.genBadgeText}>AI Generated</Text>
          </View>

          <Text style={styles.dishName}>{dish.dish_name}</Text>

          {dish.description ? (
            <Text style={styles.dishDescription}>{dish.description}</Text>
          ) : null}

          <Text style={styles.dateMeta}>{dateLabel} at {timeLabel}</Text>

          {/* Calorie / kJ strip */}
          {hasNutrition && (
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionBadge}>
                <Text style={styles.nutritionValue}>{Math.round(dish.calories)}</Text>
                <Text style={styles.nutritionUnit}>kcal</Text>
              </View>
              <View style={styles.nutritionDivider} />
              <View style={styles.nutritionBadge}>
                <Text style={styles.nutritionValue}>{Math.round(dish.kilojoules)}</Text>
                <Text style={styles.nutritionUnit}>kJ</Text>
              </View>
            </View>
          )}

          {ingredients.length > 0 && (
            <>
              <View style={styles.divider} />
              <Text style={styles.sectionLabel}>Estimated Nutrition by Ingredient</Text>
              <View style={styles.ingredientList}>
                {ingredients.map((ing, idx) => (
                  <View key={idx} style={styles.ingredientRow}>
                    <View style={styles.dot} />
                    <Text style={styles.ingName}>{ing.name}</Text>
                    <View style={styles.calChip}>
                      <Text style={styles.calChipText}>{Math.round(ing.calories)} kcal</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  heroImage: { width: '100%', height: 260 },
  heroPlaceholder: { backgroundColor: colors.backgroundAlt, justifyContent: 'center', alignItems: 'center' },

  card: {
    margin: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow,
  },

  genBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-start',
    backgroundColor: '#EBF7D9',
    borderRadius: radii.pill,
    paddingVertical: 4, paddingHorizontal: 10,
    marginBottom: spacing.sm,
  },
  genBadgeText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  dishName: { ...typography.h1, marginBottom: spacing.xs },
  dishDescription: {
    ...typography.body, lineHeight: 22,
    color: colors.textSecondary, marginBottom: spacing.sm,
  },
  dateMeta: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.md },

  nutritionRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#F5FFF0',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  nutritionBadge: { flex: 1, alignItems: 'center' },
  nutritionValue: { fontSize: 26, fontWeight: '800', color: colors.primary },
  nutritionUnit: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  nutritionDivider: { width: 1, height: 36, backgroundColor: colors.border },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  ingredientList: { gap: 10 },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  ingName: { flex: 1, fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  calChip: {
    backgroundColor: '#EBF7D9', borderRadius: radii.pill,
    paddingHorizontal: 8, paddingVertical: 2,
  },
  calChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  errorIconBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  errorTitle: { ...typography.h1, textAlign: 'center' },
  errorSubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
  retryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    paddingVertical: 16, paddingHorizontal: 40,
    borderRadius: radii.pill, marginTop: spacing.md,
  },
  retryBtnText: { ...typography.button },
});
