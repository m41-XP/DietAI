import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { saveProfile, generateWeekPlan } from '../src/services/api';
import { colors, spacing, radii, typography, shadow } from '../src/theme';

const TOTAL_STEPS = 6;

// ── Supported nationalities (must match backend NATIONALITY_QUERY_MAP keys) ───
const NATIONALITIES = [
  'Algerian', 'American', 'Argentinian', 'Bangladeshi', 'Brazilian',
  'British', 'Caribbean', 'Chinese', 'Colombian', 'Danish',
  'Egyptian', 'Emirati', 'Ethiopian', 'Filipino', 'French',
  'German', 'Ghanaian', 'Greek', 'Indian', 'Indonesian',
  'Iranian', 'Iraqi', 'Irish', 'Italian', 'Japanese',
  'Jordanian', 'Korean', 'Kuwaiti', 'Lebanese', 'Libyan',
  'Malaysian', 'Mexican', 'Moroccan', 'Nigerian', 'Nordic',
  'Norwegian', 'Pakistani', 'Persian', 'Polish', 'Russian',
  'Saudi', 'South African', 'Spanish', 'Sri Lankan', 'Sudanese',
  'Swedish', 'Syrian', 'Taiwanese', 'Thai', 'Tunisian',
  'Turkish', 'Vietnamese', 'Yemeni',
].sort();

// ── Nationality autocomplete picker ──────────────────────────────────────────
function NationalityPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = NATIONALITIES.filter((n) =>
    value.length === 0
      ? true
      : n.toLowerCase().startsWith(value.toLowerCase())
  ).slice(0, 5);

  return (
    <View style={{ marginBottom: spacing.sm, zIndex: 10 }}>
      <TextInput
        style={[styles.input, { marginBottom: 0, outlineWidth: 0 } as any]}
        value={value}
        onChangeText={(v) => { onChange(v); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
        placeholder="e.g. Moroccan, French, Japanese"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
      />
      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsBox}>
          {suggestions.map((nat) => (
            <Pressable
              key={nat}
              style={styles.suggestionItem}
              onPress={() => { onChange(nat); setShowSuggestions(false); }}
            >
              <Text style={styles.suggestionText}>{nat}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

// ── Selection card ────────────────────────────────────────────────────────────
function SelectCard({
  label, icon, selected, onPress, description,
}: {
  label: string; icon?: string; selected: boolean;
  onPress: () => void; description?: string;
}) {
  return (
    <Pressable style={[styles.selectCard, selected && styles.selectCardActive]} onPress={onPress}>
      {icon ? <Text style={styles.selectCardIcon}>{icon}</Text> : null}
      <View style={{ flex: 1 }}>
        <Text style={[styles.selectCardLabel, selected && styles.selectCardLabelActive]}>{label}</Text>
        {description ? <Text style={styles.selectCardDesc}>{description}</Text> : null}
      </View>
      <View style={[styles.radioOuter, selected && styles.radioOuterActive]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

// ── Step 1 — Identity ─────────────────────────────────────────────────────────
function Step1({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>
        Let's get to{'\n'}<Text style={{ color: colors.primary }}>know you</Text>
      </Text>
      <Text style={styles.stepSubtitle}>To personalise your plan, we need the basics.</Text>

      <Text style={styles.fieldLabel}>First Name</Text>
      <TextInput
        style={[styles.input, { outlineWidth: 0 } as any]}
        value={data.firstName}
        onChangeText={(v) => update('firstName', v)}
        placeholder="Enter your name"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="words"
      />

      <Text style={styles.fieldLabel}>Age</Text>
      <TextInput
        style={[styles.input, { outlineWidth: 0 } as any]}
        value={data.age}
        onChangeText={(v) => update('age', v)}
        placeholder="e.g. 28"
        placeholderTextColor={colors.textMuted}
        keyboardType="numeric"
      />

      <Text style={styles.fieldLabel}>Nationality</Text>
      <NationalityPicker value={data.nationality} onChange={(v) => update('nationality', v)} />

      <Text style={styles.fieldLabel}>Gender</Text>
      <View style={styles.genderRow}>
        {[{ label: 'Male', icon: '♂️' }, { label: 'Female', icon: '♀️' }, { label: 'Other', icon: '👤' }].map((g) => (
          <Pressable
            key={g.label}
            style={[styles.genderCard, data.gender === g.label && styles.genderCardActive]}
            onPress={() => update('gender', g.label)}
          >
            <Text style={styles.genderIcon}>{g.icon}</Text>
            <Text style={[styles.genderLabel, data.gender === g.label && styles.genderLabelActive]}>{g.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── Step 2 — Body Metrics ─────────────────────────────────────────────────────
function Step2({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>Body Metrics</Text>
      <Text style={styles.stepSubtitle}>Accurate measurements help us calculate your needs.</Text>

      <Text style={styles.fieldLabel}>Height</Text>
      <View style={styles.metricRow}>
        <TextInput
          style={[styles.metricFieldInput, { outlineWidth: 0 } as any]}
          value={data.height}
          onChangeText={(v) => update('height', v)}
          keyboardType="numeric"
          placeholder="e.g. 175"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.unitToggle}>
          {['cm', 'ft'].map((u) => (
            <Pressable
              key={u}
              style={[styles.unitBtn, data.heightUnit === u && styles.unitBtnActive]}
              onPress={() => update('heightUnit', u)}
            >
              <Text style={[styles.unitBtnText, data.heightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Weight</Text>
      <View style={styles.metricRow}>
        <TextInput
          style={[styles.metricFieldInput, { outlineWidth: 0 } as any]}
          value={data.weight}
          onChangeText={(v) => update('weight', v)}
          keyboardType="numeric"
          placeholder="e.g. 70"
          placeholderTextColor={colors.textMuted}
        />
        <View style={styles.unitToggle}>
          {['kg', 'lb'].map((u) => (
            <Pressable
              key={u}
              style={[styles.unitBtn, data.weightUnit === u && styles.unitBtnActive]}
              onPress={() => update('weightUnit', u)}
            >
              <Text style={[styles.unitBtnText, data.weightUnit === u && styles.unitBtnTextActive]}>{u}</Text>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  );
}

// ── Step 3 — Goal ─────────────────────────────────────────────────────────────
function Step3({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  const goals = [
    { label: 'Lose Weight', icon: '📉', desc: 'Reduce body fat' },
    { label: 'Maintain', icon: '⚖️', desc: 'Stay at current weight' },
    { label: 'Gain Weight', icon: '📈', desc: 'Build muscle mass' },
  ];
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>Your Goal</Text>
      <Text style={styles.stepSubtitle}>What are you aiming for?</Text>
      {goals.map((g) => (
        <SelectCard
          key={g.label}
          label={g.label}
          icon={g.icon}
          description={g.desc}
          selected={data.goal === g.label}
          onPress={() => update('goal', g.label)}
        />
      ))}
    </View>
  );
}

// ── Step 4 — Target & Pace ────────────────────────────────────────────────────
function Step4({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  const paces = ['0.25 kg/wk', '0.5 kg/wk', '1 kg/wk'];
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>Target &{'\n'}<Text style={{ color: colors.primary }}>Pace</Text></Text>
      <Text style={styles.stepSubtitle}>Set your target weight and preferred weekly pace.</Text>

      <Text style={styles.fieldLabel}>Target Weight</Text>
      <View style={styles.inlineInput}>
        <TextInput
          style={[styles.inlineInputField, { outlineWidth: 0 } as any]}
          value={data.targetWeight}
          onChangeText={(v) => update('targetWeight', v)}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="numeric"
        />
        <Text style={styles.inlineInputUnit}>kg</Text>
      </View>

      <Text style={[styles.fieldLabel, { marginTop: spacing.md }]}>Weekly Pace</Text>
      <View style={styles.paceRow}>
        {paces.map((p) => (
          <Pressable
            key={p}
            style={[styles.pacePill, data.pace === p && styles.pacePillActive]}
            onPress={() => update('pace', p)}
          >
            <Text style={[styles.pacePillText, data.pace === p && styles.pacePillTextActive]}>{p}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

// ── Step 5 — Activity Level ───────────────────────────────────────────────────
function Step5({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  const activities = [
    { label: 'Sedentary', icon: '🪑', desc: 'Little to no exercise' },
    { label: 'Lightly Active', icon: '🚶', desc: 'Exercise 1-3 times/week' },
    { label: 'Very Active', icon: '🏋️', desc: 'Exercise 6-7 times/week' },
  ];
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>Activity{'\n'}<Text style={{ color: colors.primary }}>Level</Text></Text>
      <Text style={styles.stepSubtitle}>How active are you on a typical week?</Text>
      {activities.map((a) => (
        <SelectCard
          key={a.label}
          label={a.label}
          icon={a.icon}
          description={a.desc}
          selected={data.activity === a.label}
          onPress={() => update('activity', a.label)}
        />
      ))}
    </View>
  );
}

// ── Step 6 — Diet Type ────────────────────────────────────────────────────────
function Step6({ data, update }: { data: any; update: (k: string, v: any) => void }) {
  const diets = [
    { label: 'Normal', icon: '🍽️', desc: 'Balanced, no restrictions' },
    { label: 'Keto', icon: '🥑', desc: 'Low-carb, high-fat' },
    { label: 'Vegan', icon: '🥦', desc: 'Plant-based only' },
  ];
  return (
    <View style={styles.stepInner}>
      <Text style={styles.stepTitle}>Diet{'\n'}<Text style={{ color: colors.primary }}>Preference</Text></Text>
      <Text style={styles.stepSubtitle}>Which eating style fits you best?</Text>
      {diets.map((d) => (
        <SelectCard
          key={d.label}
          label={d.label}
          icon={d.icon}
          description={d.desc}
          selected={data.diet === d.label}
          onPress={() => update('diet', d.label)}
        />
      ))}
    </View>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function OnboardingScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // Remove browser focus outline on web
  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const style = document.createElement('style');
    style.id = 'sp-no-outline';
    style.textContent = 'input:focus, textarea:focus { outline: none !important; box-shadow: none !important; }';
    document.head.appendChild(style);
    return () => { document.getElementById('sp-no-outline')?.remove(); };
  }, []);
  const [generating, setGenerating] = useState(false);
  const [data, setData] = useState({
    firstName: '',
    age: '',
    nationality: '',
    gender: '',
    height: '',
    heightUnit: 'cm',
    weight: '',
    weightUnit: 'kg',
    goal: '',
    targetWeight: '',
    pace: '',
    activity: '',
    diet: 'Normal',
  });

  const update = (key: string, value: any) =>
    setData((prev) => ({ ...prev, [key]: value }));

  const validate = () => {
    if (step === 1 && (!data.firstName.trim() || !data.age || !data.gender)) {
      Alert.alert('Missing info', 'Please fill in all fields before continuing.');
      return false;
    }
    if (step === 2 && (!data.height || !data.weight)) {
      Alert.alert('Missing info', 'Please enter your height and weight.');
      return false;
    }
    if (step === 3 && !data.goal) {
      Alert.alert('Missing info', 'Please select your goal.');
      return false;
    }
    if (step === 5 && !data.activity) {
      Alert.alert('Missing info', 'Please select your activity level.');
      return false;
    }
    return true;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
  };

  const handleFinish = async () => {
    if (!validate()) return;
    try {
      setGenerating(true);
      const heightCm = data.heightUnit === 'ft'
        ? parseFloat(data.height) * 30.48
        : parseFloat(data.height);
      const weightKg = data.weightUnit === 'lb'
        ? parseFloat(data.weight) * 0.453592
        : parseFloat(data.weight);
      const weeklyPace = parseFloat(data.pace) || 0.5;
      await saveProfile({
        age: parseInt(data.age, 10),
        gender: data.gender,
        nationality: data.nationality.trim(),
        height_cm: Math.round(heightCm * 10) / 10,
        weight_kg: Math.round(weightKg * 10) / 10,
        goal: data.goal,
        target_weight_kg: data.targetWeight ? parseFloat(data.targetWeight) : null,
        weekly_pace_kg: weeklyPace,
        activity_level: data.activity,
        diet_type: data.diet,
      });
      // Auto-generate the first week's plan — user lands on home with everything ready
      await generateWeekPlan();
      router.replace('/(tabs)');
    } catch {
      setGenerating(false);
      Alert.alert('Error', 'Could not save your profile. Please check your connection and try again.');
    }
  };

  const progress = step / TOTAL_STEPS;
  const isLast = step === TOTAL_STEPS;

  if (generating) {
    return (
      <View style={styles.generatingScreen}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.generatingTitle}>Building your plan...</Text>
        <Text style={styles.generatingSubtitle}>
          We're crafting your first personalised week based on your profile.
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Top bar */}
      <View style={styles.topBar}>
        {step > 1 ? (
          <Pressable style={styles.backBtn} onPress={() => setStep((s) => s - 1)}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <Text style={styles.stepIndicator}>STEP {step} OF {TOTAL_STEPS}</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` as any }]} />
      </View>

      {/* Step content */}
      <View style={styles.stepContent}>
        {step === 1 && <Step1 data={data} update={update} />}
        {step === 2 && <Step2 data={data} update={update} />}
        {step === 3 && <Step3 data={data} update={update} />}
        {step === 4 && <Step4 data={data} update={update} />}
        {step === 5 && <Step5 data={data} update={update} />}
        {step === 6 && <Step6 data={data} update={update} />}
      </View>

      {/* Bottom button */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.nextBtn, isLast && { backgroundColor: colors.primaryDark }]}
          onPress={isLast ? handleFinish : handleNext}
        >
          <Text style={styles.nextBtnText}>{isLast ? 'Finish' : 'Next Step'}</Text>
          <Ionicons
            name={isLast ? 'checkmark-circle' : 'arrow-forward'}
            size={18}
            color={colors.white}
          />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingTop: 44, paddingBottom: 4,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
  },
  stepIndicator: { ...typography.label },

  progressTrack: {
    height: 4, backgroundColor: colors.border,
    marginHorizontal: spacing.md, borderRadius: 2, overflow: 'hidden',
    marginBottom: spacing.md,
  },
  progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 2 },

  stepContent: { flex: 1, paddingHorizontal: spacing.lg },
  stepInner: { flex: 1 },

  stepTitle: {
    fontSize: 24, fontWeight: '800', color: colors.textPrimary,
    lineHeight: 30, marginBottom: 4,
  },
  stepSubtitle: {
    fontSize: 14, color: colors.textSecondary,
    lineHeight: 20, marginBottom: spacing.md,
  },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: colors.textPrimary, marginBottom: 4 },

  input: {
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md, padding: 12,
    fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
    marginBottom: spacing.sm,
    outlineWidth: 0,
  } as any,

  suggestionsBox: {
    backgroundColor: colors.white,
    borderWidth: 1, borderColor: colors.border,
    borderRadius: radii.md,
    marginTop: 2,
    ...shadow,
  },
  suggestionItem: {
    paddingHorizontal: spacing.md, paddingVertical: 11,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  suggestionText: { fontSize: 15, color: colors.textPrimary, fontWeight: '500' },

  genderRow: { flexDirection: 'row', gap: spacing.sm },
  genderCard: {
    flex: 1, backgroundColor: colors.backgroundAlt, borderRadius: radii.md,
    paddingVertical: 10, alignItems: 'center',
    borderWidth: 1.5, borderColor: colors.border,
  },
  genderCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  genderIcon: { fontSize: 20, marginBottom: 4 },
  genderLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  genderLabelActive: { color: colors.primary },

  metricRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: 4,
  },
  metricFieldInput: {
    flex: 1,
    backgroundColor: colors.backgroundAlt,
    borderRadius: radii.md, padding: 12,
    fontSize: 15, color: colors.textPrimary,
    borderWidth: 1, borderColor: colors.border,
    outlineWidth: 0,
  } as any,
  unitToggle: { flexDirection: 'row', backgroundColor: colors.backgroundAlt, borderRadius: radii.pill, padding: 2, borderWidth: 1, borderColor: colors.border },
  unitBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: radii.pill },
  unitBtnActive: { backgroundColor: colors.primary },
  unitBtnText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  unitBtnTextActive: { color: colors.white },

  selectCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.backgroundAlt, borderRadius: radii.lg,
    padding: 12, marginBottom: 6,
    borderWidth: 1.5, borderColor: colors.border,
  },
  selectCardActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  selectCardIcon: { fontSize: 20, marginRight: spacing.sm },
  selectCardLabel: { fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  selectCardLabelActive: { color: colors.primaryDark },
  selectCardDesc: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: colors.border,
    justifyContent: 'center', alignItems: 'center',
  },
  radioOuterActive: { borderColor: colors.primary },
  radioInner: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },

  inlineInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.backgroundAlt, borderRadius: radii.md,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: spacing.md, paddingVertical: 10,
  },
  inlineInputField: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.textPrimary, outlineWidth: 0 } as any,
  inlineInputUnit: { fontSize: 15, color: colors.textSecondary, fontWeight: '600' },

  paceRow: { flexDirection: 'row', gap: spacing.sm },
  pacePill: {
    flex: 1, paddingVertical: 9, borderRadius: radii.pill,
    alignItems: 'center', borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.backgroundAlt,
  },
  pacePillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
  pacePillText: { fontSize: 12, fontWeight: '600', color: colors.textSecondary },
  pacePillTextActive: { color: colors.primaryDark },

  generatingScreen: {
    flex: 1, backgroundColor: colors.background,
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: spacing.xl, gap: spacing.md,
  },
  generatingTitle: { fontSize: 22, fontWeight: '800', color: colors.textPrimary, textAlign: 'center' },
  generatingSubtitle: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 22 },

  bottomBar: { paddingHorizontal: spacing.lg, paddingBottom: 32, paddingTop: spacing.sm },
  nextBtn: {
    backgroundColor: colors.primary, borderRadius: radii.pill,
    paddingVertical: 14, flexDirection: 'row',
    justifyContent: 'center', alignItems: 'center', gap: spacing.sm,
  },
  nextBtnText: { ...typography.button },
});
