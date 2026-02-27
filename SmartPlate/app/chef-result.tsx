import { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { getPendingChef, clearPendingChef } from '../src/stores/resultStore';
import api, { addFavorite } from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';
import { AuthContext } from '../src/context/AuthContext';

const CUISINES = [
  { label: 'Moroccan', emoji: '🇲🇦' },
  { label: 'Italian', emoji: '🇮🇹' },
  { label: 'French', emoji: '🇫🇷' },
  { label: 'Japanese', emoji: '🇯🇵' },
  { label: 'Mexican', emoji: '🇲🇽' },
  { label: 'Indian', emoji: '🇮🇳' },
  { label: 'Chinese', emoji: '🇨🇳' },
  { label: 'American', emoji: '🇺🇸' },
  { label: 'Turkish', emoji: '🇹🇷' },
  { label: 'Lebanese', emoji: '🇱🇧' },
];

export default function ChefResultScreen() {
  const router = useRouter();
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<any>(null);
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    const pending = getPendingChef();
    if (!pending) {
      setErrorMsg('No dish data found.');
      setLoading(false);
      return;
    }
    setIngredients(pending.ingredients);
    setCuisine(pending.cuisine);
    clearPendingChef();

    api.post('/api/chef/generate/', {
      ingredients: pending.ingredients,
      cuisine: pending.cuisine,
    })
      .then((res) => { setResult(res.data); })
      .catch((e: any) => {
        setErrorMsg(e.response?.data?.detail || 'Failed to generate dish. Please try again.');
      })
      .finally(() => { setLoading(false); });
  }, []);

  const handleBack = () => router.back();

  const handleFavorite = async () => {
    if (!result || favLoading || favorited) return;
    setFavLoading(true);
    try {
      await addFavorite({
        name: result.dish_name,
        calories: result.calories ?? 0,
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        preferred_meal_type: 'any',
        source: 'chef',
        image_base64: result.image_base64 || '',
      });
      setFavorited(true);
    } catch {
      // silently ignore
    } finally {
      setFavLoading(false);
    }
  };

  // ── Loading ──
  if (loading) {
    const cuisineEmoji = CUISINES.find((c) => c.label === cuisine)?.emoji ?? '🍽️';
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <View style={styles.loadingContent}>
          <View style={styles.loadingIconWrap}>
            <Text style={styles.loadingEmoji}>{cuisineEmoji}</Text>
          </View>
          <ActivityIndicator size="large" color={colors.primary} style={{ marginBottom: spacing.lg }} />
          <Text style={styles.loadingTitle}>Crafting your dish...</Text>
          <Text style={styles.loadingSubtitle}>
            Our AI chef is creating a unique {cuisine} recipe just for you
          </Text>
          {ingredients.length > 0 && (
            <View style={styles.ingredientPreview}>
              <Text style={styles.ingredientPreviewText}>
                Using: {ingredients.join(', ')}
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // ── Error ──
  if (errorMsg) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={handleBack} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.headerTitle}>Your Dish</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.centered}>
          <View style={styles.errorIconBox}>
            <Ionicons name="alert-circle-outline" size={40} color={colors.error} />
          </View>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorSubtitle}>{errorMsg}</Text>
          <Pressable style={styles.retryBtn} onPress={handleBack}>
            <Ionicons name="refresh-outline" size={18} color={colors.white} />
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const cuisineEmoji = CUISINES.find((c) => c.label === cuisine)?.emoji ?? '';
  const nutritionIngredients: { name: string; calories: number }[] = result.ingredients ?? [];
  const hasNutrition = result.calories > 0;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Your Dish</Text>
        {userToken && result ? (
          <Pressable onPress={handleFavorite} style={styles.favBtn} disabled={favLoading || favorited}>
            {favLoading ? (
              <ActivityIndicator size="small" color={colors.error} />
            ) : (
              <Ionicons
                name={favorited ? 'heart' : 'heart-outline'}
                size={22}
                color={favorited ? colors.error : colors.textSecondary}
              />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <Image
          source={{ uri: `data:${result.mime_type};base64,${result.image_base64}` }}
          style={styles.heroImage}
          resizeMode="cover"
        />

        {/* Info card */}
        <View style={styles.infoCard}>
          <View style={styles.cuisineTag}>
            <Text style={styles.cuisineTagText}>
              {cuisineEmoji}{'  '}{cuisine}
            </Text>
          </View>

          <Text style={styles.dishName}>{result.dish_name}</Text>

          {result.description ? (
            <Text style={styles.dishDescription}>{result.description}</Text>
          ) : null}

          {/* Nutrition row */}
          {hasNutrition && (
            <View style={styles.nutritionRow}>
              <View style={styles.nutritionBadge}>
                <Text style={styles.nutritionValue}>{Math.round(result.calories)}</Text>
                <Text style={styles.nutritionUnit}>kcal</Text>
              </View>
              <View style={styles.nutritionDivider} />
              <View style={styles.nutritionBadge}>
                <Text style={styles.nutritionValue}>{Math.round(result.kilojoules)}</Text>
                <Text style={styles.nutritionUnit}>kJ</Text>
              </View>
            </View>
          )}

          <View style={styles.divider} />

          {/* AI-estimated ingredient nutrition */}
          {nutritionIngredients.length > 0 && (
            <>
              <Text style={styles.sectionLabel}>Estimated Nutrition by Ingredient</Text>
              <View style={styles.nutritionList}>
                {nutritionIngredients.map((item, idx) => (
                  <View key={idx} style={styles.nutritionIngRow}>
                    <View style={styles.ingredientDot} />
                    <Text style={styles.nutritionIngName}>{item.name}</Text>
                    <View style={styles.calChip}>
                      <Text style={styles.calChipText}>{Math.round(item.calories)} kcal</Text>
                    </View>
                  </View>
                ))}
              </View>
              <View style={styles.divider} />
            </>
          )}

          {/* User's input ingredients */}
          <Text style={styles.sectionLabel}>Ingredients used</Text>
          <View style={styles.ingredientsList}>
            {ingredients.map((item: string) => (
              <View key={item} style={styles.ingredientRow}>
                <View style={styles.ingredientDot} />
                <Text style={styles.ingredientItem}>{item}</Text>
              </View>
            ))}
          </View>

          <Pressable style={styles.generateAnotherBtn} onPress={handleBack}>
            <Ionicons name="refresh" size={18} color={colors.white} />
            <Text style={styles.generateAnotherText}>Generate Another</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  loadingIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  loadingEmoji: { fontSize: 48 },
  loadingTitle: { ...typography.h1, textAlign: 'center' },
  loadingSubtitle: {
    ...typography.body,
    textAlign: 'center',
    color: colors.textSecondary,
    lineHeight: 22,
  },
  ingredientPreview: {
    marginTop: spacing.md,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  ingredientPreviewText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Header
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  favBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: { ...typography.h2 },

  scroll: { flex: 1 },
  scrollContent: { paddingBottom: 48 },

  heroImage: { width: '100%', height: 280, backgroundColor: colors.backgroundAlt },

  infoCard: {
    margin: spacing.lg,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.lg,
    ...shadow,
  },
  cuisineTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#EBF7D9',
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: spacing.sm,
  },
  cuisineTagText: { color: colors.primary, fontWeight: '700', fontSize: 13 },
  dishName: { ...typography.h1, marginBottom: spacing.sm },
  dishDescription: {
    ...typography.body,
    lineHeight: 22,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },

  // Calorie / kJ row
  nutritionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5FFF0',
    borderRadius: radii.md,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
    gap: 0,
  },
  nutritionBadge: { flex: 1, alignItems: 'center' },
  nutritionValue: { fontSize: 26, fontWeight: '800', color: colors.primary },
  nutritionUnit: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  nutritionDivider: { width: 1, height: 36, backgroundColor: colors.border },

  divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.md },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },

  // AI nutrition ingredients
  nutritionList: { gap: 8, marginBottom: spacing.md },
  nutritionIngRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  nutritionIngName: { flex: 1, fontSize: 14, color: colors.textSecondary, fontWeight: '500' },
  calChip: {
    backgroundColor: '#EBF7D9',
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  calChipText: { fontSize: 12, fontWeight: '700', color: colors.primary },

  // User input ingredients
  ingredientsList: { gap: 8, marginBottom: spacing.lg },
  ingredientRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  ingredientItem: { ...typography.body, fontSize: 14, color: colors.textSecondary },

  generateAnotherBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  generateAnotherText: { ...typography.button },

  // Error
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.xl, gap: spacing.sm },
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
