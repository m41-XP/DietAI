import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, Pressable, StyleSheet,
  FlatList, ActivityIndicator,
  RefreshControl, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../src/services/api';
import { colors, typography, spacing, radii, shadow } from '../src/theme';

type MealItem = {
  id: number;
  type: 'scan' | 'generation';
  dish_name: string;
  calories: number;
  date: string;
  image: string;
  confidence?: string;
};

type FilterType = 'all' | 'scan' | 'generation';

const CONF_COLOR: Record<string, string> = {
  high: '#2D8A4E',
  medium: '#B07D00',
  low: '#C0392B',
};

function MealImage({ uri }: { uri: string }) {
  if (!uri) {
    return (
      <View style={[styles.mealImg, styles.mealImgPlaceholder]}>
        <Ionicons name="restaurant-outline" size={22} color={colors.primary} />
      </View>
    );
  }
  return <Image source={{ uri }} style={styles.mealImg} resizeMode="cover" />;
}

export default function MealsHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();
  const [allItems, setAllItems] = useState<MealItem[]>([]);
  const initialFilter = (params.filter as FilterType) ?? 'all';
  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);

  const fetchAll = useCallback(async () => {
    const [scansRes, genRes] = await Promise.all([
      api.get('/api/scans/'),
      api.get('/api/chef/history/').catch(() => ({ data: [] })),
    ]);

    const scans: MealItem[] = scansRes.data.map((s: any) => ({
      id: s.id,
      type: 'scan',
      dish_name: s.dish_name,
      calories: s.calories,
      date: s.scanned_at,
      image: s.scanned_image || '',
      confidence: s.confidence,
    }));

    const gens: MealItem[] = genRes.data.map((g: any) => ({
      id: g.id,
      type: 'generation',
      dish_name: g.dish_name,
      calories: g.calories,
      date: g.generated_at,
      image: g.generated_image || '',
    }));

    const merged = [...scans, ...gens].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    setAllItems(merged);
  }, []);

  useEffect(() => {
    fetchAll()
      .catch(() => Alert.alert('Error', 'Could not load meal history.'))
      .finally(() => setLoading(false));
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAll().catch(() => {});
    setRefreshing(false);
  };

  const enterSelectMode = () => { setSelecting(true); setSelectedIds(new Set()); };
  const exitSelectMode = () => { setSelecting(false); setSelectedIds(new Set()); };

  // Composite key: "<type>-<id>"
  const itemKey = (item: MealItem) => `${item.type}-${item.id}`;

  const toggleItem = (item: MealItem) => {
    const key = itemKey(item);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const filteredItems = filter === 'all'
    ? allItems
    : allItems.filter((i) => i.type === filter);

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredItems.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredItems.map(itemKey)));
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.size === 0 || deleting) return;
    const keys = [...selectedIds];
    setDeleting(true);
    try {
      await Promise.all(keys.map((key) => {
        const [type, idStr] = key.split('-');
        const id = Number(idStr);
        return type === 'scan'
          ? api.delete(`/api/scans/${id}/`)
          : api.delete(`/api/chef/history/${id}/`);
      }));
      setAllItems((prev) => prev.filter((i) => !keys.includes(itemKey(i))));
      exitSelectMode();
    } catch {
      Alert.alert('Error', 'Some items could not be deleted. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const allFilteredSelected = filteredItems.length > 0 && selectedIds.size === filteredItems.length;

  const renderItem = ({ item }: { item: MealItem }) => {
    const date = new Date(item.date);
    const label = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    const key = itemKey(item);
    const isSelected = selectedIds.has(key);
    const confColor = item.confidence ? (CONF_COLOR[item.confidence] ?? CONF_COLOR.low) : null;

    return (
      <Pressable
        style={[styles.card, selecting && isSelected && styles.cardSelected]}
        onPress={() => {
          if (selecting) { toggleItem(item); return; }
          if (item.type === 'scan') router.push(`/scan-detail?id=${item.id}`);
          else router.push(`/generated-detail?id=${item.id}`);
        }}
        onLongPress={() => {
          if (!selecting) { enterSelectMode(); setSelectedIds(new Set([key])); }
        }}
      >
        {selecting && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
        )}

        <MealImage uri={item.image} />

        <View style={styles.cardBody}>
          <View style={styles.cardNameRow}>
            <Text style={styles.cardName} numberOfLines={1}>{item.dish_name}</Text>
            <View style={[styles.typeBadge, item.type === 'generation' && styles.typeBadgeGen]}>
              <Ionicons
                name={item.type === 'scan' ? 'camera-outline' : 'restaurant-outline'}
                size={10}
                color={item.type === 'scan' ? colors.info : colors.primary}
              />
              <Text style={[styles.typeBadgeText, item.type === 'generation' && styles.typeBadgeTextGen]}>
                {item.type === 'scan' ? 'Scanned' : 'Generated'}
              </Text>
            </View>
          </View>
          <Text style={styles.cardMeta}>{label} · {time}</Text>
          {confColor && (
            <View style={[styles.confPill, { backgroundColor: confColor + '22' }]}>
              <Text style={[styles.confText, { color: confColor }]}>{item.confidence} confidence</Text>
            </View>
          )}
        </View>

        <View style={styles.cardRight}>
          <Text style={styles.cardCals}>{Math.round(item.calories)}</Text>
          <Text style={styles.cardKcal}>kcal</Text>
        </View>

        {!selecting && <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />}
      </Pressable>
    );
  };

  const scanCount = allItems.filter((i) => i.type === 'scan').length;
  const genCount = allItems.filter((i) => i.type === 'generation').length;

  return (
    <SafeAreaView style={styles.container}>
      {/* ── Header ── */}
      <View style={styles.header}>
        {selecting ? (
          <Pressable onPress={exitSelectMode} style={styles.textBtn}>
            <Text style={styles.cancelText}>Cancel</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        )}

        <Text style={styles.headerTitle}>
          {selecting
            ? selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select items'
            : 'Meals History'}
        </Text>

        {allItems.length > 0 ? (
          <Pressable onPress={enterSelectMode} style={[styles.textBtn, selecting && { opacity: 0 }]} disabled={selecting}>
            <Text style={styles.selectText}>Select</Text>
          </Pressable>
        ) : (
          <View style={{ width: 60 }} />
        )}
      </View>

      {/* ── Filter bar ── */}
      {!selecting && allItems.length > 0 && (
        <View style={styles.filterBar}>
          {(['all', 'scan', 'generation'] as FilterType[]).map((f) => {
            const labels = { all: `All (${allItems.length})`, scan: `Scanned (${scanCount})`, generation: `Generated (${genCount})` };
            return (
              <Pressable
                key={f}
                style={[styles.filterPill, filter === f && styles.filterPillActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{labels[f]}</Text>
              </Pressable>
            );
          })}
        </View>
      )}

      {/* ── Select All bar ── */}
      {selecting && filteredItems.length > 0 && (
        <Pressable style={styles.selectAllBar} onPress={toggleSelectAll}>
          <View style={[styles.checkbox, allFilteredSelected && styles.checkboxSelected]}>
            {allFilteredSelected && <Ionicons name="checkmark" size={14} color={colors.white} />}
          </View>
          <Text style={styles.selectAllText}>{allFilteredSelected ? 'Deselect All' : 'Select All'}</Text>
          <Text style={styles.selectAllCount}>{filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}</Text>
        </Pressable>
      )}

      {/* ── List ── */}
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={itemKey}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            !selecting
              ? <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
              : undefined
          }
          ListHeaderComponent={
            !selecting && filteredItems.length > 0 ? (
              <Text style={styles.countLabel}>
                {filteredItems.length} meal{filteredItems.length !== 1 ? 's' : ''}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="fast-food-outline" size={40} color={colors.textMuted} />
              </View>
              <Text style={styles.emptyTitle}>
                {filter === 'all' ? 'No meals yet' : filter === 'scan' ? 'No scanned meals' : 'No generated dishes'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {filter === 'all'
                  ? 'Scan a meal or generate a dish to see it here.'
                  : filter === 'scan'
                  ? 'Scan a meal to see it here.'
                  : 'Generate a dish in the Chef tab to see it here.'}
              </Text>
            </View>
          }
        />
      )}

      {/* ── Bottom delete bar ── */}
      {selecting && (
        <View style={styles.bottomBar}>
          <Pressable
            style={[styles.deleteBarBtn, (selectedIds.size === 0 || deleting) && styles.deleteBarBtnDisabled]}
            onPress={handleDeleteSelected}
            disabled={selectedIds.size === 0 || deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color={colors.white} />
                <Text style={styles.deleteBarText}>
                  {selectedIds.size > 0
                    ? `Delete ${selectedIds.size} item${selectedIds.size !== 1 ? 's' : ''}`
                    : 'Select items to delete'}
                </Text>
              </>
            )}
          </Pressable>
        </View>
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
  textBtn: { minWidth: 60, alignItems: 'flex-end', justifyContent: 'center', height: 40 },
  selectText: { fontSize: 15, fontWeight: '600', color: colors.primary },
  cancelText: { fontSize: 15, fontWeight: '600', color: colors.textSecondary, textAlign: 'left', minWidth: 60 },

  filterBar: {
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterPill: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: radii.pill,
    backgroundColor: colors.backgroundAlt,
  },
  filterPillActive: { backgroundColor: colors.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  filterTextActive: { color: colors.white },

  selectAllBar: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: 10,
    backgroundColor: colors.white,
    borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  selectAllText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.textPrimary },
  selectAllCount: { fontSize: 13, color: colors.textMuted },

  checkbox: {
    width: 22, height: 22, borderRadius: 11,
    borderWidth: 2, borderColor: colors.border,
    backgroundColor: colors.white,
    justifyContent: 'center', alignItems: 'center',
  },
  checkboxSelected: { backgroundColor: colors.primary, borderColor: colors.primary },

  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { padding: spacing.md, gap: spacing.sm, paddingBottom: 100 },

  countLabel: {
    fontSize: 12, fontWeight: '600', color: colors.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.5,
    marginBottom: spacing.sm,
  },

  card: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.md,
    ...shadow,
  },
  cardSelected: { borderWidth: 2, borderColor: colors.primary, backgroundColor: '#F5FFF0' },

  mealImg: { width: 60, height: 60, borderRadius: radii.md, backgroundColor: colors.backgroundAlt },
  mealImgPlaceholder: { justifyContent: 'center', alignItems: 'center', backgroundColor: '#EBF7D9' },

  cardBody: { flex: 1 },
  cardNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  cardName: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.textPrimary },

  typeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#E8F4FD',
    borderRadius: radii.pill,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  typeBadgeGen: { backgroundColor: '#EBF7D9' },
  typeBadgeText: { fontSize: 10, fontWeight: '700', color: colors.info },
  typeBadgeTextGen: { color: colors.primary },

  cardMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 5 },
  confPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8, paddingVertical: 2,
    borderRadius: radii.pill,
  },
  confText: { fontSize: 11, fontWeight: '600' },

  cardRight: { alignItems: 'flex-end', marginRight: 4 },
  cardCals: { fontSize: 20, fontWeight: '800', color: colors.textPrimary },
  cardKcal: { fontSize: 11, color: colors.textMuted, fontWeight: '500' },

  empty: { alignItems: 'center', paddingVertical: 60, gap: spacing.md },
  emptyIconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: colors.backgroundAlt,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: spacing.sm,
  },
  emptyTitle: { ...typography.h2, textAlign: 'center' },
  emptySubtitle: { ...typography.body, textAlign: 'center', color: colors.textSecondary, lineHeight: 22 },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    paddingBottom: 28,
    backgroundColor: colors.white,
    borderTopWidth: 1, borderTopColor: colors.border,
  },
  deleteBarBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.error,
    borderRadius: radii.pill,
    paddingVertical: 14,
  },
  deleteBarBtnDisabled: { backgroundColor: colors.textMuted },
  deleteBarText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
