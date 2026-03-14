import os

file_path = "app/scan-result.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Imports
content = content.replace("import { scanFood, logMeal, addFavorite } from '../src/services/api';", "import { scanFood } from '../src/services/api';")

# 2. MEAL_TYPES
meal_types_str = """const MEAL_TYPES = [
  { key: 'breakfast', label: 'Breakfast', icon: 'sunny-outline' },
  { key: 'lunch', label: 'Lunch', icon: 'partly-sunny-outline' },
  { key: 'dinner', label: 'Dinner', icon: 'moon-outline' },
  { key: 'snack', label: 'Snack', icon: 'nutrition-outline' },
] as const;"""
content = content.replace(meal_types_str, "")

# 3. State
state_str = """  const [loggingType, setLoggingType] = useState<string | null>(null);
  const [logSuccess, setLogSuccess] = useState(false);
  const [logError, setLogError] = useState('');
  const [favorited, setFavorited] = useState(false);
  const [favLoading, setFavLoading] = useState(false);"""
content = content.replace(state_str, "")

# 4. Functions
func_str = """  const handleFavorite = async () => {
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
  };"""
content = content.replace(func_str, "")

# 5. Header UI
header_str = """        {userToken && results ? (
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
        )}"""
content = content.replace(header_str, "        <View style={{ width: 40 }} />")

# 6. Log Section
log_section_str = """        {/* Log to meal plan */}
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
        )}"""
content = content.replace(log_section_str, "")

# 7. Styles - favBtn
favbtn_str = """  favBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },"""
content = content.replace(favbtn_str, "")

# 8. Styles - logSection
logstyles_str = """  // Log section
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
  logErrorText: { fontSize: 13, color: colors.error },"""
content = content.replace(logstyles_str, "")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Legacy scanner code removed successfully.")
