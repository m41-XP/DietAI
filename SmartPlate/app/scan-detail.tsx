import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, ActivityIndicator, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';

type Ingredient = { name: string; calories: number };
type Scan = {
  id: number;
  dish_name: string;
  calories: number;
  kilojoules: number;
  confidence: string;
  scanned_at: string;
  ingredients: Ingredient[];
  scanned_image: string;
};

const CONF_COLOR: Record<string, string> = {
  high: '#2D8A4E',
  medium: '#B07D00',
  low: '#C0392B',
};

export default function ScanDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [scan, setScan] = useState<Scan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/api/scans/${id}/`)
      .then((res) => setScan(res.data))
      .catch(() => setError('Failed to load scan details.'))
      .finally(() => setLoading(false));
  }, [id]);

  const confColor = scan ? (CONF_COLOR[scan.confidence] ?? '#888') : '#888';
  const date = scan
    ? new Date(scan.scanned_at).toLocaleDateString(undefined, {
        weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      })
    : '';

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.canGoBack() ? router.back() : router.replace('/scan-history')} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Detail</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <View style={styles.errorIconWrap}>
            <Ionicons name="alert-circle-outline" size={36} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{error}</Text>
          <Pressable style={styles.retryBtn} onPress={() => router.back()}>
            <Text style={styles.retryBtnText}>Go Back</Text>
          </Pressable>
        </View>
      ) : scan && (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

          {/* Hero image */}
          {scan.scanned_image ? (
            <Image source={{ uri: scan.scanned_image }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: colors.primaryLight, justifyContent: 'center', alignItems: 'center' }]}>
              <Ionicons name="restaurant-outline" size={48} color={colors.primary} />
            </View>
          )}

          {/* Hero card — dish name + confidence + date */}
          <View style={styles.heroCard}>
            <View style={[styles.confBadge, { backgroundColor: confColor + '18' }]}>
              <View style={[styles.confDot, { backgroundColor: confColor }]} />
              <Text style={[styles.confText, { color: confColor }]}>
                {scan.confidence} confidence
              </Text>
            </View>
            <Text style={styles.dishName}>{scan.dish_name}</Text>
            <Text style={styles.dateText}>{date}</Text>
          </View>

          {/* Calorie card */}
          <View style={styles.calorieCard}>
            <View style={styles.calorieBlock}>
              <Text style={styles.calorieValue}>{Math.round(scan.calories)}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
              <Text style={styles.calorieHint}>Calories</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieBlock}>
              <Text style={[styles.calorieValue, { color: colors.textSecondary, fontSize: 28 }]}>
                {Math.round(scan.kilojoules)}
              </Text>
              <Text style={styles.calorieUnit}>kJ</Text>
              <Text style={styles.calorieHint}>Kilojoules</Text>
            </View>
          </View>

          {/* Ingredients list */}
          {scan.ingredients?.length > 0 && (
            <View style={styles.ingredientsCard}>
              <Text style={styles.sectionLabel}>INGREDIENTS</Text>
              {scan.ingredients.map((ing, i) => (
                <View
                  key={i}
                  style={[
                    styles.ingredientRow,
                    i < scan.ingredients.length - 1 && styles.ingredientDivider,
                  ]}
                >
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{ing.name}</Text>
                  <View style={styles.ingCalPill}>
                    <Ionicons name="flame-outline" size={11} color={colors.primary} />
                    <Text style={styles.ingCalText}>{Math.round(ing.calories)} kcal</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

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

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.md },
  errorIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF0F0',
    justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm,
  },
  errorTitle: { ...typography.h2, textAlign: 'center' },
  errorSubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary },
  retryBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14, paddingHorizontal: 40,
    borderRadius: radii.pill, marginTop: spacing.md,
  },
  retryBtnText: { ...typography.button },

  content: { gap: spacing.md, paddingBottom: 40 },

  heroImage: {
    width: '100%', height: 220,
    backgroundColor: colors.backgroundAlt,
  },

  heroCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.sm,
    ...shadow,
  },
  confBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.pill,
  },
  confDot: { width: 7, height: 7, borderRadius: 4 },
  confText: { fontSize: 12, fontWeight: '700', textTransform: 'capitalize' },
  dishName: { ...typography.h1, fontSize: 26, lineHeight: 32 },
  dateText: { fontSize: 13, color: colors.textMuted, marginTop: 2 },

  calorieCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.xl,
    flexDirection: 'row',
    alignItems: 'center',
    ...shadow,
  },
  calorieBlock: { flex: 1, alignItems: 'center', gap: 2 },
  calorieValue: { fontSize: 42, fontWeight: '800', color: colors.primary, lineHeight: 48 },
  calorieUnit: { fontSize: 14, fontWeight: '700', color: colors.textSecondary },
  calorieHint: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  calorieDivider: { width: 1, height: 60, backgroundColor: colors.border },

  ingredientsCard: {
    marginHorizontal: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, gap: spacing.sm,
  },
  ingredientDivider: {
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  ingredientDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary,
  },
  ingredientName: { flex: 1, fontSize: 14, color: colors.textPrimary, fontWeight: '500' },
  ingCalPill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radii.pill,
  },
  ingCalText: { fontSize: 12, fontWeight: '700', color: colors.primary },
});
