import { View, Text, ScrollView, Image, Pressable, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radii, shadow } from '../src/theme';

export default function MealDetailScreen() {
  const { data } = useLocalSearchParams<{ data: string }>();
  const meal = data ? JSON.parse(data as string) : null;

  if (!meal) {
    return (
      <SafeAreaView style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.backBtnSafe}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.centered}>
          <Text style={styles.errorText}>Meal data unavailable.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const ingredients: string[] = Array.isArray(meal.ingredients) ? meal.ingredients : [];

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} bounces>

        {/* Hero image */}
        <View style={styles.heroWrap}>
          {meal.image_url ? (
            <Image source={{ uri: meal.image_url }} style={styles.heroImg} resizeMode="cover" />
          ) : (
            <View style={[styles.heroImg, styles.heroPlaceholder]}>
              <Ionicons name="restaurant-outline" size={64} color={colors.primary} />
            </View>
          )}
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.white} />
          </Pressable>
        </View>

        <View style={styles.content}>

          {/* Name */}
          <Text style={styles.name}>{meal.name}</Text>

          {/* Cuisine tag */}
          {meal.description ? (
            <View style={styles.metaRow}>
              <View style={styles.metaPill}>
                <Ionicons name="globe-outline" size={13} color={colors.textSecondary} />
                <Text style={styles.metaText}>{meal.description} cuisine</Text>
              </View>
            </View>
          ) : null}

          {/* Calories */}
          <View style={styles.calCard}>
            <View style={styles.calBox}>
              <Text style={styles.calNum}>{meal.calories}</Text>
              <Text style={styles.calUnit}>kcal</Text>
            </View>
            <View style={styles.calDivider} />
            <View style={styles.calBox}>
              <Text style={styles.calNum}>{Math.round((meal.calories ?? 0) * 4.184)}</Text>
              <Text style={styles.calUnit}>kJ</Text>
            </View>
          </View>

          {/* Macros */}
          <View style={styles.macroRow}>
            {[
              { label: 'Protein', val: meal.protein_g, color: colors.primary,  icon: 'barbell-outline' },
              { label: 'Carbs',   val: meal.carbs_g,   color: '#4A90E2',        icon: 'leaf-outline'   },
              { label: 'Fat',     val: meal.fat_g,     color: '#F5A623',        icon: 'water-outline'  },
            ].map(({ label, val, color, icon }) => (
              <View key={label} style={[styles.macroItem, { borderTopColor: color }]}>
                <Ionicons name={icon as any} size={16} color={color} />
                <Text style={[styles.macroVal, { color }]}>{Math.round(val ?? 0)}g</Text>
                <Text style={styles.macroLabel}>{label}</Text>
              </View>
            ))}
          </View>

          {/* Ingredients */}
          {ingredients.length > 0 ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientCard}>
                {ingredients.map((ing: string, i: number) => (
                  <View key={i} style={[styles.ingredientRow, i > 0 && styles.ingredientBorder]}>
                    <View style={styles.bullet} />
                    <Text style={styles.ingredientText}>{ing}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {/* View full recipe link (if available) */}
          {meal.source_url ? (
            <Pressable
              style={styles.recipeBtn}
              onPress={() => Linking.openURL(meal.source_url)}
            >
              <Ionicons name="open-outline" size={16} color={colors.white} />
              <Text style={styles.recipeBtnText}>View Full Recipe</Text>
            </Pressable>
          ) : null}

        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.backgroundAlt },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorText: { color: colors.textMuted, fontSize: 15 },

  heroWrap: { position: 'relative' },
  heroImg: { width: '100%', height: 280 },
  heroPlaceholder: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center', alignItems: 'center',
  },
  backBtn: {
    position: 'absolute', top: 16, left: 16,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.40)',
    justifyContent: 'center', alignItems: 'center',
  },
  backBtnSafe: {
    margin: spacing.md,
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },

  content: { padding: spacing.lg, gap: spacing.lg },

  name: { fontSize: 24, fontWeight: '800', color: colors.textPrimary, lineHeight: 30 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  metaPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.white,
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: radii.pill,
    ...shadow,
  },
  metaText: { fontSize: 13, color: colors.textSecondary, fontWeight: '500' },

  calCard: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadow,
  },
  calBox: { flex: 1, alignItems: 'center', paddingVertical: spacing.lg },
  calDivider: { width: 1, backgroundColor: colors.border, marginVertical: spacing.md },
  calNum: { fontSize: 28, fontWeight: '800', color: colors.textPrimary },
  calUnit: { fontSize: 12, color: colors.textSecondary, marginTop: 2, fontWeight: '500' },

  macroRow: { flexDirection: 'row', gap: spacing.sm },
  macroItem: {
    flex: 1, alignItems: 'center',
    backgroundColor: colors.white, borderRadius: radii.lg,
    paddingVertical: spacing.md, borderTopWidth: 3, gap: 4,
    ...shadow,
  },
  macroVal: { fontSize: 18, fontWeight: '800' },
  macroLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: '500' },

  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: colors.textPrimary },
  ingredientCard: {
    backgroundColor: colors.white, borderRadius: radii.xl,
    overflow: 'hidden', ...shadow,
  },
  ingredientRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    gap: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 12,
  },
  ingredientBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  bullet: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: colors.primary, marginTop: 6, flexShrink: 0,
  },
  ingredientText: { flex: 1, fontSize: 14, color: colors.textPrimary, lineHeight: 20 },

  recipeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: spacing.sm, backgroundColor: colors.primary,
    borderRadius: radii.pill, paddingVertical: 15, ...shadow,
  },
  recipeBtnText: { color: colors.white, fontSize: 15, fontWeight: '700' },
});
