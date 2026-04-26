import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { StatusBadge } from './StatusBadge';
import { borderRadius, fontSize, fontWeight, spacing, shadow } from '@/constants/Theme';

interface ItemCardProps {
  stockCode: string;
  name: string;
  category: string;
  totalQty: number;
  unit: string;
  status: 'Optimal' | 'Low' | 'Critical';
  locationsJson: Record<string, number>;
  onPress?: () => void;
}

export function ItemCard({ stockCode, name, category, totalQty, unit, status, locationsJson, onPress }: ItemCardProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.sku, { color: colors.primary }]}>{stockCode}</Text>
          <Text style={[styles.category, { color: colors.muted }]}>{category}</Text>
        </View>
        <StatusBadge status={status} />
      </View>

      <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
        {name}
      </Text>

      <View style={styles.footer}>
        <View style={styles.qtyContainer}>
          <Text style={[styles.qty, { color: colors.text }]}>{totalQty}</Text>
          <Text style={[styles.unit, { color: colors.muted }]}>{unit}</Text>
        </View>
        <View style={styles.locations}>
          {Object.entries(locationsJson || {}).slice(0, 2).map(([loc, qty]) => (
            <View key={loc} style={[styles.locChip, { backgroundColor: colors.primary + '10' }]}>
              <Text style={[styles.locText, { color: colors.primary }]}>
                {loc}: {qty}
              </Text>
            </View>
          ))}
          {Object.keys(locationsJson || {}).length > 2 && (
            <Text style={[styles.moreText, { color: colors.muted }]}>
              +{Object.keys(locationsJson).length - 2}
            </Text>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    ...shadow.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  sku: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  category: {
    fontSize: fontSize.caption,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  name: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.semibold,
    marginBottom: spacing.md,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  qtyContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  qty: {
    fontSize: fontSize.heading,
    fontWeight: fontWeight.black,
    fontVariant: ['tabular-nums'],
  },
  unit: {
    fontSize: fontSize.small,
  },
  locations: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
  },
  locText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    fontVariant: ['tabular-nums'],
  },
  moreText: {
    fontSize: fontSize.caption,
  },
});
