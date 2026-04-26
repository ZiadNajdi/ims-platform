import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, fontSize, fontWeight, spacing, shadow } from '@/constants/Theme';
import { ItemCard } from '@/components/ItemCard';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface InventoryItem {
  stock_code: string;
  name: string;
  category: string;
  total_qty: number;
  unit: string;
  min_stock: number;
  status: string;
  locations_json: Record<string, number>;
}

type ComputedStatus = 'Optimal' | 'Low' | 'Critical';

function computeStatus(totalQty: number, minStock: number): ComputedStatus {
  if (totalQty > minStock * 2) return 'Optimal';
  if (totalQty > minStock) return 'Low';
  return 'Critical';
}

export default function StockScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedWarehouse, setSelectedWarehouse] = useState('All');
  const [warehouses, setWarehouses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);

  const loadInventory = useCallback(async () => {
    const { data, error } = await supabase
      .from('inventory_summary')
      .select('*')
      .order('name');

    if (data) {
      setItems(data.map((d: any) => ({
        ...d,
        total_qty: Number(d.total_qty) || 0,
        min_stock: Number(d.min_stock) || 0,
      })));

      // Extract unique categories from actual data
      const cats = [...new Set(data.map((d: any) => d.category as string))].filter(Boolean).sort();
      setCategories(cats);

      // Extract unique warehouse locations from all items
      const whs = new Set<string>();
      data.forEach((d: any) => {
        Object.keys(d.locations_json || {}).forEach((loc) => whs.add(loc));
      });
      setWarehouses([...whs].sort());
    }
    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    loadInventory();
  }, [loadInventory]);

  // Compute statuses and filter
  const processedItems = useMemo(() => {
    return items.map((item) => ({
      ...item,
      computedStatus: computeStatus(item.total_qty, item.min_stock),
    }));
  }, [items]);

  const filteredItems = useMemo(() => {
    let result = processedItems;

    if (selectedCategory !== 'All') {
      result = result.filter((i) => i.category === selectedCategory);
    }

    if (selectedStatus !== 'All') {
      result = result.filter((i) => i.computedStatus === selectedStatus);
    }

    if (selectedWarehouse !== 'All') {
      result = result.filter((i) =>
        Object.keys(i.locations_json || {}).includes(selectedWarehouse)
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (i) =>
          i.stock_code.toLowerCase().includes(q) ||
          i.name.toLowerCase().includes(q)
      );
    }

    return result;
  }, [processedItems, search, selectedCategory, selectedStatus, selectedWarehouse]);

  // Stats computed from full item list (not filtered)
  const totalItems = items.length;
  const criticalItems = processedItems.filter((i) => i.computedStatus === 'Critical').length;
  const lowItems = processedItems.filter((i) => i.computedStatus === 'Low').length;

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadInventory();
  };

  // Active filter types for the filter row
  type FilterType = 'category' | 'status' | 'warehouse';
  const [activeFilter, setActiveFilter] = useState<FilterType>('category');

  const renderItem = ({ item }: { item: typeof processedItems[0] }) => (
    <ItemCard
      stockCode={item.stock_code}
      name={item.name}
      category={item.category}
      totalQty={item.total_qty}
      unit={item.unit}
      status={item.computedStatus}
      locationsJson={item.locations_json}
    />
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.muted }]}>Loading inventory...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.headerSection}>
        <Text style={[styles.headerLabel, { color: colors.muted }]}>IMS-VIVIANA</Text>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Inventory</Text>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total SKUs', value: totalItems.toString(), color: colors.primary },
          { label: 'Critical', value: criticalItems.toString(), color: colors.danger },
          { label: 'Low Stock', value: lowItems.toString(), color: colors.warning },
        ].map((stat) => (
          <View
            key={stat.label}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <Text style={[styles.statValue, { color: stat.color }]}>{stat.value}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Search */}
      <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <FontAwesome name="search" size={14} color={colors.muted} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by SKU or name..."
          placeholderTextColor={colors.muted}
          returnKeyType="search"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch('')}>
            <FontAwesome name="times-circle" size={16} color={colors.muted} />
          </Pressable>
        )}
      </View>

      {/* Filter Type Selector */}
      <View style={styles.filterTypeRow}>
        {([
          { key: 'category' as FilterType, label: 'Category', icon: 'th-large' as const },
          { key: 'status' as FilterType, label: 'Status', icon: 'circle' as const },
          { key: 'warehouse' as FilterType, label: 'Warehouse', icon: 'building-o' as const },
        ]).map((ft) => (
          <Pressable
            key={ft.key}
            onPress={() => setActiveFilter(ft.key)}
            style={[
              styles.filterTypeChip,
              {
                backgroundColor: activeFilter === ft.key ? colors.primary : colors.surface,
                borderColor: activeFilter === ft.key ? colors.primary : colors.border,
              },
            ]}
          >
            <FontAwesome
              name={ft.icon}
              size={10}
              color={activeFilter === ft.key ? colors.primaryForeground : colors.muted}
            />
            <Text
              style={[
                styles.filterTypeText,
                { color: activeFilter === ft.key ? colors.primaryForeground : colors.text },
              ]}
            >
              {ft.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Filter Chips */}
      <View style={styles.filterChipContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterChipRow}
        >
          {activeFilter === 'category' && (
            <>
              <FilterChip
                label="All"
                active={selectedCategory === 'All'}
                onPress={() => setSelectedCategory('All')}
                colors={colors}
              />
              {categories.map((cat) => (
                <FilterChip
                  key={cat}
                  label={cat}
                  active={selectedCategory === cat}
                  onPress={() => setSelectedCategory(cat)}
                  colors={colors}
                />
              ))}
            </>
          )}
          {activeFilter === 'status' && (
            <>
              <FilterChip label="All" active={selectedStatus === 'All'} onPress={() => setSelectedStatus('All')} colors={colors} />
              <FilterChip label="Optimal" active={selectedStatus === 'Optimal'} onPress={() => setSelectedStatus('Optimal')} colors={colors} dotColor={colors.success} />
              <FilterChip label="Low" active={selectedStatus === 'Low'} onPress={() => setSelectedStatus('Low')} colors={colors} dotColor={colors.warning} />
              <FilterChip label="Critical" active={selectedStatus === 'Critical'} onPress={() => setSelectedStatus('Critical')} colors={colors} dotColor={colors.danger} />
            </>
          )}
          {activeFilter === 'warehouse' && (
            <>
              <FilterChip label="All" active={selectedWarehouse === 'All'} onPress={() => setSelectedWarehouse('All')} colors={colors} />
              {warehouses.map((wh) => (
                <FilterChip
                  key={wh}
                  label={wh}
                  active={selectedWarehouse === wh}
                  onPress={() => setSelectedWarehouse(wh)}
                  colors={colors}
                />
              ))}
            </>
          )}
        </ScrollView>
      </View>

      {/* Item List */}
      <FlatList
        data={filteredItems}
        renderItem={renderItem}
        keyExtractor={(item) => item.stock_code}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <FontAwesome name="inbox" size={48} color={colors.muted + '40'} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No items found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              {search ? 'Try a different search term.' : 'Inventory will appear once stock is added.'}
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

// Reusable filter chip component
function FilterChip({
  label,
  active,
  onPress,
  colors,
  dotColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
  dotColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        filterChipStyles.chip,
        {
          backgroundColor: active ? colors.primary : colors.surface,
          borderColor: active ? colors.primary : colors.border,
        },
      ]}
    >
      {dotColor && !active && (
        <View style={[filterChipStyles.dot, { backgroundColor: dotColor }]} />
      )}
      <Text
        style={[
          filterChipStyles.text,
          { color: active ? colors.primaryForeground : colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const filterChipStyles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  text: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    fontSize: fontSize.body,
  },
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? spacing.lg : spacing.xxxl,
    marginBottom: spacing.lg,
  },
  headerLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  headerTitle: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    letterSpacing: -1,
  },
  statsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  statCard: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.black,
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
  },
  filterTypeRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  filterTypeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  filterTypeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChipContainer: {
    marginBottom: spacing.sm,
  },
  filterChipRow: {
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    gap: spacing.sm,
  },
  emptyTitle: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    marginTop: spacing.md,
  },
  emptySubtitle: {
    fontSize: fontSize.body,
    textAlign: 'center',
    maxWidth: 240,
  },
});
