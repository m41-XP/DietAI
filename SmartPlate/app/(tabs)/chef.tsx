import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Modal,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { setPendingChef } from '../../src/stores/resultStore';
import { colors, radii, spacing, typography } from '../../src/theme';

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

export default function ChefScreen() {
  const router = useRouter();
  const [ingredientInput, setIngredientInput] = useState('');
  const [ingredients, setIngredients] = useState<string[]>([]);
  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [pickerVisible, setPickerVisible] = useState(false);

  const addIngredient = () => {
    const val = ingredientInput.trim();
    if (!val) return;
    if (ingredients.includes(val.toLowerCase())) {
      setIngredientInput('');
      return;
    }
    setIngredients((prev) => [...prev, val]);
    setIngredientInput('');
  };

  const removeIngredient = (item: string) => {
    setIngredients((prev) => prev.filter((i) => i !== item));
  };

  const handleGenerate = () => {
    if (ingredients.length === 0 || !selectedCuisine) return;
    setPendingChef({ ingredients, cuisine: selectedCuisine });
    router.push('/chef-result');
    setIngredients([]);
    setSelectedCuisine('');
    setIngredientInput('');
  };

  const canGenerate = ingredients.length > 0 && selectedCuisine !== '';
  const selectedCuisineObj = CUISINES.find((c) => c.label === selectedCuisine);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="restaurant" size={26} color={colors.white} />
            </View>
            <Text style={styles.headerTitle}>AI Chef</Text>
            <Text style={styles.headerSubtitle}>
              Add your ingredients and pick a cuisine — we'll generate a dish for you.
            </Text>
          </View>

          {/* Ingredients */}
          <Text style={styles.sectionLabel}>Ingredients</Text>
          <View style={styles.ingredientInputRow}>
            <TextInput
              style={styles.input}
              placeholder="e.g. chicken, tomatoes..."
              placeholderTextColor={colors.textMuted}
              value={ingredientInput}
              onChangeText={setIngredientInput}
              onSubmitEditing={addIngredient}
              returnKeyType="done"
              submitBehavior="submit"
            />
            <Pressable
              style={[styles.addBtn, !ingredientInput.trim() && styles.addBtnDisabled]}
              onPress={addIngredient}
              disabled={!ingredientInput.trim()}
            >
              <Ionicons name="add" size={24} color={colors.white} />
            </Pressable>
          </View>

          {ingredients.length > 0 && (
            <View style={styles.chips}>
              {ingredients.map((item) => (
                <View key={item} style={styles.chip}>
                  <Text style={styles.chipText}>{item}</Text>
                  <Pressable onPress={() => removeIngredient(item)} style={styles.chipRemove}>
                    <Ionicons name="close" size={14} color={colors.primary} />
                  </Pressable>
                </View>
              ))}
            </View>
          )}

          {/* Cuisine picker trigger */}
          <Text style={styles.sectionLabel}>Cuisine</Text>
          <Pressable style={styles.cuisineSelector} onPress={() => setPickerVisible(true)}>
            {selectedCuisineObj ? (
              <View style={styles.cuisineSelectorLeft}>
                <Text style={styles.cuisineSelectorEmoji}>{selectedCuisineObj.emoji}</Text>
                <Text style={styles.cuisineSelectorText}>{selectedCuisineObj.label}</Text>
              </View>
            ) : (
              <Text style={styles.cuisineSelectorPlaceholder}>Select a cuisine...</Text>
            )}
            <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
          </Pressable>

          {/* Generate button */}
          <Pressable
            style={[styles.generateBtn, !canGenerate && styles.generateBtnDisabled]}
            onPress={handleGenerate}
            disabled={!canGenerate}
          >
            <Ionicons name="sparkles" size={18} color={colors.white} />
            <Text style={styles.generateBtnText}>Generate Dish</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Cuisine picker Modal */}
      <Modal
        visible={pickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPickerVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Select Cuisine</Text>
          <FlatList
            data={CUISINES}
            keyExtractor={(item) => item.label}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.modalOption,
                  selectedCuisine === item.label && styles.modalOptionSelected,
                ]}
                onPress={() => {
                  setSelectedCuisine(item.label);
                  setPickerVisible(false);
                }}
              >
                <Text style={styles.modalOptionEmoji}>{item.emoji}</Text>
                <Text
                  style={[
                    styles.modalOptionLabel,
                    selectedCuisine === item.label && styles.modalOptionLabelSelected,
                  ]}
                >
                  {item.label}
                </Text>
                {selectedCuisine === item.label && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                )}
              </Pressable>
            )}
            ItemSeparatorComponent={() => <View style={styles.modalSeparator} />}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl },

  header: { alignItems: 'center', marginBottom: spacing.xl, paddingTop: spacing.md },
  headerIconWrap: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  headerTitle: { ...typography.h1, marginBottom: spacing.sm },
  headerSubtitle: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 22,
    color: colors.textSecondary,
    paddingHorizontal: spacing.md,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },

  ingredientInputRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.sm },
  input: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.textPrimary,
  },
  addBtn: {
    width: 50,
    height: 50,
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBtnDisabled: { opacity: 0.4 },

  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBF7D9',
    borderRadius: radii.pill,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 6,
    paddingLeft: 12,
    paddingRight: 8,
    gap: 4,
  },
  chipText: { color: colors.primary, fontWeight: '600', fontSize: 13 },
  chipRemove: { padding: 2 },

  cuisineSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: radii.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    marginBottom: spacing.lg,
  },
  cuisineSelectorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cuisineSelectorEmoji: { fontSize: 22 },
  cuisineSelectorText: { fontSize: 15, fontWeight: '600', color: colors.textPrimary },
  cuisineSelectorPlaceholder: { fontSize: 15, color: colors.textMuted },

  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: 17,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  generateBtnDisabled: { opacity: 0.4, shadowOpacity: 0 },
  generateBtnText: { ...typography.button },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingBottom: 40,
    maxHeight: '70%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: { ...typography.h2, paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    gap: 12,
  },
  modalOptionSelected: { backgroundColor: '#EBF7D9' },
  modalOptionEmoji: { fontSize: 22 },
  modalOptionLabel: { flex: 1, fontSize: 16, color: colors.textPrimary, fontWeight: '500' },
  modalOptionLabelSelected: { color: colors.primary, fontWeight: '700' },
  modalSeparator: { height: 1, backgroundColor: colors.border, marginLeft: 56 },
});
