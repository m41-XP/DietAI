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
import { getPendingScan, clearPendingScan } from '../src/stores/resultStore';
import { scanFood, logMeal, addFavorite } from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';
import { AuthContext } from '../src/context/AuthContext';

const CONFIDENCE_COLORS: Record<string, string> = {
  high: colors.success,
  medium: colors.warning,
  low: colors.error,
};

const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snack', label: 'Snack', icon: 'nutrition-outline' },
] as const;

export default function ScanResultScreen() {
  const router = useRouter();
  const { userToken } = useContext(AuthContext);
  const [loading, setLoading] = useState(true);
  const [results, setResults] = useState<any>(null);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [imageBase64, setImageBase64] = useState<string>('');
  const [fromCache, setFromCache] = useState(false);
  const [existingId, setExistingId] = useState<number | null>(null);
  const [loggingType, setLoggingType] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  useEffect(() => {
    const pending = getPendingScan();
    if (!pending) {
      setErrorMsg('No image data found.');
      setLoading(false);
      return;
    }
    setImageUri(pending.imageUri);
    setImageBase64(pending.imageBase64 || '');
    clearPendingScan();

    scanFood(pending.imageBase64, pending.mimeType)
      .then((response) => {
        if (response.data.from_cache) {
          setFromCache(true);
          setExistingId(response.data.existing_id ?? null);
        }
        setResults(response.data);
      })
      .catch((e: any) => {
        setErrorMsg(e.response?.data?.detail || 'Analysis failed. Please try again.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const handleBack = () => router.back();

  const handleFavorite = async () => {
    if (!results || favLoading || favorited) return;
    setFavLoading(true);
    try {
      await addFavorite({
        name: results.dish_name,
        calories: Math.round(results.calories),
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
        preferred_meal_type: 'any',
        source: 'scan',
        image_base64: imageBase64,
      });
      setFavorited(true);
    } catch {
      // silently ignore — button reverts
    } finally {
      setFavLoading(false);
    }
  };

  const handleLog = async (mealType: string) => {
    if (!results || loggingType) return;
    setLoggingType(mealType);
    setLogError('');
    try {
      await logMeal({
        meal_type: mealType,
        dish_name: results.dish_name,
        calories: Math.round(results.calories),
        protein_g: 0,
        carbs_g: 0,
        fat_g: 0,
      });
      setLogSuccess(true);
    } catch (e: any) {
      setLogError(e.response?.data?.detail || 'Failed to log meal. Try again.');
    } finally {
      setLoggingType(null);
    }
  };

  // ── Loading ──
  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.loadingImage} resizeMode="cover" />
        )}
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
          <Text style={styles.loadingTitle}>Analyzing your meal...</Text>
          <Text style={styles.loadingSubtitle}>Our AI is identifying nutrients and calories</Text>
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
          <Text style={styles.headerTitle}>Scan Result</Text>
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

  const confidenceColor = CONFIDENCE_COLORS[results?.confidence] || colors.textMuted;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={handleBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Scan Result</Text>
        {userToken && results ? (
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
        {/* Food image */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.resultImage} resizeMode="cover" />
        )}

        {/* From-cache banner */}
        {fromCache && (
          <Pressable
            style={styles.fromCacheBanner}
            onPress={() => existingId && router.push({ pathname: '/scan-detail', params: { id: String(existingId) } })}
          >
            <Ionicons name="time-outline" size={16} color={colors.info} />
            <Text style={styles.fromCacheText}>Already in your scan history — tap to view</Text>
            <Ionicons name="chevron-forward" size={14} color={colors.info} />
          </Pressable>
        )}

        {/* Result card */}
        <View style={styles.resultCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.dishName}>{results.dish_name}</Text>
            <View style={[styles.confidencePill, { backgroundColor: `${confidenceColor}20` }]}>
              <View style={[styles.confidenceDot, { backgroundColor: confidenceColor }]} />
              <Text style={[styles.confidenceText, { color: confidenceColor }]}>
                {results.confidence}
              </Text>
            </View>
          </View>

          <View style={styles.calorieRow}>
            <View style={styles.calorieMain}>
              <Text style={styles.calorieBig}>{Math.round(results.calories)}</Text>
              <Text style={styles.calorieUnit}>kcal</Text>
            </View>
            <View style={styles.calorieDivider} />
            <View style={styles.calorieSecondary}>
              <Text style={styles.kjValue}>{Math.round(results.kilojoules)}</Text>
              <Text style={styles.kjUnit}>kJ</Text>
            </View>
          </View>

          {results.ingredients && results.ingredients.length > 0 && (
            <>
              <Text style={styles.ingredientsTitle}>Ingredients</Text>
              {results.ingredients.map((item: any, index: number) => (
                <View key={index} style={styles.ingredientRow}>
                  <View style={styles.ingredientDot} />
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  <View style={styles.ingredientCalPill}>
                    <Text style={styles.ingredientCalText}>
                      {Math.round(item.calories)} kcal
                    </Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </View>

        {/* Log to meal plan */}
        {userToken && (
          <View style={styles.logSection}>
            {logSuccess ? (
              <View style={styles.logSuccessBanner}>
                <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                <Text style={styles.logSuccessText}>Logged to your meal plan!</Text>
              </View>
            ) : (
              <>
                <Text style={styles.logTitle}>Log to meal plan</Text>
                <Text style={styles.logSubtitle}>Choose when you had this meal</Text>
                <View style={styles.mealTypeRow}>
                  {MEAL_TYPES.map(({ key, label, icon }) => (
                    <Pressable
                      key={key}
                      style={[
                        styles.mealTypePill,
                        !!loggingType && loggingType !== key && styles.mealTypePillDimmed,
                      ]}
                      onPress={() => handleLog(key)}
                      disabled={!!loggingType}
                    >
                      {loggingType === key ? (
                        <ActivityIndicator size="small" color={colors.primary} />
                      ) : (
                        <>
                          <Ionicons name={icon as any} size={16} color={colors.primary} />
                          <Text style={styles.mealTypePillText}>{label}</Text>
                        </>
                      )}
                    </Pressable>
                  ))}
                </View>
                {logError ? (
                  <View style={styles.logErrorRow}>
                    <Ionicons name="alert-circle-outline" size={15} color={colors.error} />
                    <Text style={styles.logErrorText}>{logError}</Text>
                  </View>
                ) : null}
              </>
            )}
          </View>
        )}

        <Pressable style={styles.scanAnotherBtn} onPress={handleBack}>
          <Ionicons name="scan-outline" size={18} color={colors.white} />
          <Text style={styles.scanAnotherText}>Scan Another Meal</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },

  // Loading
  loadingContainer: { flex: 1, backgroundColor: '#000' },
  loadingImage: { ...StyleSheet.absoluteFillObject, opacity: 0.4 },
  loadingOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  loadingBox: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.md,
  },
  loadingTitle: { ...typography.h1, color: colors.white, textAlign: 'center' },
  loadingSubtitle: { ...typography.body, color: 'rgba(255,255,255,0.7)', textAlign: 'center' },

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
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  favBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { ...typography.h2 },

  scroll: { flex: 1 },
  scrollContent: { padding: spacing.md, paddingBottom: 48 },

  resultImage: {
    width: '100%', height: 220,
    borderRadius: radii.xl,
    marginBottom: spacing.md,
  },

  fromCacheBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.infoLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: `${colors.info}30`,
  },
  fromCacheText: { flex: 1, fontSize: 13, fontWeight: '600', color: colors.info },

  resultCard: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  dishName: { ...typography.h1, flex: 1 },
  confidencePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radii.pill,
  },
  confidenceDot: { width: 7, height: 7, borderRadius: 4 },
  confidenceText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  calorieRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  calorieMain: { flex: 1, alignItems: 'center' },
  calorieBig: { fontSize: 40, fontWeight: '800', color: colors.primary, lineHeight: 44 },
  calorieUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },
  calorieDivider: { width: 1, height: 48, backgroundColor: colors.border, marginHorizontal: spacing.md },
  calorieSecondary: { flex: 1, alignItems: 'center' },
  kjValue: { fontSize: 28, fontWeight: '700', color: colors.textPrimary, lineHeight: 32 },
  kjUnit: { fontSize: 14, color: colors.textSecondary, fontWeight: '600' },

  ingredientsTitle: { ...typography.h2, fontSize: 16, marginBottom: spacing.md },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  ingredientDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  ingredientName: { flex: 1, fontSize: 15, color: colors.textPrimary, fontWeight: '500' },
  ingredientCalPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: radii.pill,
  },
  ingredientCalText: { fontSize: 13, color: colors.primary, fontWeight: '700' },

  // Log section
  logSection: {
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },
  logTitle: { ...typography.h2, fontSize: 16, marginBottom: 4 },
  logSubtitle: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  mealTypeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  mealTypePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
    minWidth: 90,
    justifyContent: 'center',
  },
  mealTypePillDimmed: { opacity: 0.4 },
  mealTypePillText: { fontSize: 14, fontWeight: '600', color: colors.primary },
  logSuccessBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: '#F0FFF4',
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  logSuccessText: { fontSize: 15, fontWeight: '600', color: colors.success },
  logErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: spacing.sm,
  },
  logErrorText: { fontSize: 13, color: colors.error },

  scanAnotherBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 16,
    borderRadius: radii.pill,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25, shadowRadius: 8, elevation: 3,
  },
  scanAnotherText: { ...typography.button },

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
