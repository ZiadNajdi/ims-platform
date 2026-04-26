import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

export type OperationType = 'stock_in' | 'stock_out' | 'transfer' | 'lookup';

interface ScannedItem {
  sku: string;
  name: string;
  category: string;
  totalQty: number;
  unit: string;
  status: string;
  locationsJson: Record<string, number>;
  qty: string;
}

interface OperationSheetProps {
  type: OperationType;
  scannedItems: ScannedItem[];
  onAddMore: () => void;
  onRemoveItem: (index: number) => void;
  onUpdateQty: (index: number, qty: string) => void;
  onClose: () => void;
  onComplete: () => void;
}

const OP_CONFIG = {
  stock_in: { label: 'Stock In', icon: 'arrow-down' as const, color: '#22c55e', verb: 'Inbound' },
  stock_out: { label: 'Stock Out', icon: 'arrow-up' as const, color: '#ef4444', verb: 'Outbound' },
  transfer: { label: 'Transfer', icon: 'exchange' as const, color: '#6366f1', verb: 'Transfer' },
  lookup: { label: 'Lookup', icon: 'search' as const, color: '#f59e0b', verb: 'Lookup' },
};

export function OperationSheet({
  type,
  scannedItems,
  onAddMore,
  onRemoveItem,
  onUpdateQty,
  onClose,
  onComplete,
}: OperationSheetProps) {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];
  const config = OP_CONFIG[type];

  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');
  const [destWarehouse, setDestWarehouse] = useState('');
  const [partnerName, setPartnerName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) {
      setWarehouses(data);
      if (data.length > 0) setSelectedWarehouse(data[0].name);
    }
  };

  const handleSubmit = async () => {
    if (type === 'lookup') {
      onClose();
      return;
    }

    if (scannedItems.length === 0) {
      Alert.alert('Error', 'No items to process.');
      return;
    }

    // Validate quantities
    for (const item of scannedItems) {
      const qty = parseInt(item.qty);
      if (isNaN(qty) || qty < 1) {
        Alert.alert('Error', `Invalid quantity for ${item.sku}. Must be at least 1.`);
        return;
      }
    }

    if (!selectedWarehouse) {
      Alert.alert('Error', 'Please select a warehouse location.');
      return;
    }

    if (type === 'transfer' && !destWarehouse) {
      Alert.alert('Error', 'Please select a destination warehouse.');
      return;
    }

    if (type === 'transfer' && selectedWarehouse === destWarehouse) {
      Alert.alert('Error', 'Source and destination must be different.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (type === 'transfer') {
        // Transfer each item
        const results: string[] = [];
        for (const item of scannedItems) {
          const { error } = await supabase.rpc('transfer_stock', {
            p_sku: item.sku,
            p_qty: parseInt(item.qty),
            p_src: selectedWarehouse,
            p_dest: destWarehouse,
          });
          if (error) throw error;
          results.push(`${item.sku} × ${item.qty}`);
        }

        const itemsList = results.join('\n• ');
        Alert.alert(
          '✓ Transfer Complete',
          `${scannedItems.length} item(s) transferred\n\nFrom: ${selectedWarehouse}\nTo: ${destWarehouse}\n\n• ${itemsList}`,
          [{ text: 'Done', onPress: onComplete }]
        );
      } else {
        // Stock In or Stock Out — use process_inventory_adjustment_bulk
        // This generates a proper ref number matching the web app
        const actionType = type === 'stock_in' ? 'Inbound' : 'Outbound';

        const { data: refNumber, error } = await supabase.rpc('process_inventory_adjustment_bulk', {
          p_items: scannedItems.map((item) => ({
            sku: item.sku,
            qty: parseInt(item.qty),
            type: actionType,
            loc: selectedWarehouse,
            partner: partnerName || null,
            notes: `Mobile ${actionType}`,
          })),
        });

        if (error) throw error;

        const itemsList = scannedItems
          .map((item) => `${item.name} (${item.sku}) × ${item.qty} ${item.unit}`)
          .join('\n• ');

        const totalQty = scannedItems.reduce((sum, item) => sum + parseInt(item.qty), 0);

        Alert.alert(
          `✓ ${config.verb} Complete`,
          `Ref: ${refNumber || 'N/A'}\n` +
          `${scannedItems.length} item(s) · ${totalQty} total units\n` +
          `Warehouse: ${selectedWarehouse}\n` +
          (partnerName ? `${type === 'stock_in' ? 'Supplier' : 'Recipient'}: ${partnerName}\n` : '') +
          `\n• ${itemsList}`,
          [{ text: 'Done', onPress: onComplete }]
        );
      }
    } catch (error: any) {
      Alert.alert('Operation Failed', error.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <View style={[styles.opIcon, { backgroundColor: config.color + '15' }]}>
            <FontAwesome name={config.icon} size={16} color={config.color} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>{config.label}</Text>
            <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
              {scannedItems.length} item(s) scanned
            </Text>
          </View>
        </View>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <FontAwesome name="times" size={18} color={colors.muted} />
        </Pressable>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        keyboardShouldPersistTaps="handled"
      >
        {/* Scanned Items */}
        <Text style={[styles.sectionLabel, { color: colors.muted }]}>Scanned Items</Text>
        {scannedItems.map((item, index) => (
          <View key={`${item.sku}-${index}`} style={[styles.itemRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.itemInfo}>
              <Text style={[styles.itemSku, { color: colors.primary }]}>{item.sku}</Text>
              <Text style={[styles.itemName, { color: colors.text }]} numberOfLines={1}>{item.name}</Text>
              <Text style={[styles.itemStock, { color: colors.muted }]}>
                Current: {item.totalQty} {item.unit}
              </Text>
            </View>

            {type !== 'lookup' && (
              <View style={styles.itemActions}>
                <TextInput
                  style={[styles.qtyInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                  value={item.qty}
                  onChangeText={(v) => onUpdateQty(index, v)}
                  keyboardType="number-pad"
                  placeholder="Qty"
                  placeholderTextColor={colors.muted}
                />
                <Pressable
                  onPress={() => onRemoveItem(index)}
                  style={[styles.removeButton, { backgroundColor: colors.danger + '10' }]}
                >
                  <FontAwesome name="trash-o" size={14} color={colors.danger} />
                </Pressable>
              </View>
            )}

            {type === 'lookup' && (
              <View style={styles.lookupDetails}>
                {Object.entries(item.locationsJson || {}).map(([loc, qty]) => (
                  <View key={loc} style={[styles.locRow, { backgroundColor: colors.background }]}>
                    <Text style={[styles.locLabel, { color: colors.muted }]}>{loc}</Text>
                    <Text style={[styles.locQty, { color: colors.text }]}>{qty}</Text>
                  </View>
                ))}
                {Object.keys(item.locationsJson || {}).length === 0 && (
                  <Text style={[styles.noLocText, { color: colors.muted }]}>No stock in any location</Text>
                )}
              </View>
            )}
          </View>
        ))}

        {/* Add More Button */}
        <Pressable
          onPress={onAddMore}
          style={[styles.addMoreButton, { borderColor: colors.border }]}
        >
          <FontAwesome name="plus" size={14} color={colors.primary} />
          <Text style={[styles.addMoreText, { color: colors.primary }]}>
            Scan Another Item
          </Text>
        </Pressable>

        {/* Operation Fields */}
        {type !== 'lookup' && (
          <>
            <Text style={[styles.sectionLabel, { color: colors.muted, marginTop: spacing.xl }]}>
              Operation Details
            </Text>

            {/* Warehouse Selector */}
            <Text style={[styles.fieldLabel, { color: colors.muted }]}>
              {type === 'transfer' ? 'Source Warehouse' : 'Warehouse Location'}
            </Text>
            <View style={styles.warehouseRow}>
              {warehouses.map((wh) => (
                <Pressable
                  key={wh.id}
                  onPress={() => setSelectedWarehouse(wh.name)}
                  style={[
                    styles.pickerChip,
                    {
                      backgroundColor: selectedWarehouse === wh.name ? colors.primary : colors.surface,
                      borderColor: selectedWarehouse === wh.name ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pickerChipText,
                      { color: selectedWarehouse === wh.name ? colors.primaryForeground : colors.text },
                    ]}
                  >
                    {wh.name}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Destination Warehouse (transfer only) */}
            {type === 'transfer' && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>Destination Warehouse</Text>
                <View style={styles.warehouseRow}>
                  {warehouses
                    .filter((wh) => wh.name !== selectedWarehouse)
                    .map((wh) => (
                      <Pressable
                        key={wh.id}
                        onPress={() => setDestWarehouse(wh.name)}
                        style={[
                          styles.pickerChip,
                          {
                            backgroundColor: destWarehouse === wh.name ? colors.primary : colors.surface,
                            borderColor: destWarehouse === wh.name ? colors.primary : colors.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.pickerChipText,
                            { color: destWarehouse === wh.name ? colors.primaryForeground : colors.text },
                          ]}
                        >
                          {wh.name}
                        </Text>
                      </Pressable>
                    ))}
                </View>
              </>
            )}

            {/* Partner Name (stock in/out only) */}
            {(type === 'stock_in' || type === 'stock_out') && (
              <>
                <Text style={[styles.fieldLabel, { color: colors.muted }]}>
                  {type === 'stock_in' ? 'Supplier (Optional)' : 'Recipient (Optional)'}
                </Text>
                <TextInput
                  style={[styles.textInput, { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }]}
                  value={partnerName}
                  onChangeText={setPartnerName}
                  placeholder={type === 'stock_in' ? 'Supplier name...' : 'Recipient name...'}
                  placeholderTextColor={colors.muted}
                />
              </>
            )}
          </>
        )}
      </ScrollView>

      {/* Bottom Action */}
      <View style={[styles.bottomAction, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting || scannedItems.length === 0}
          style={[
            styles.submitButton,
            {
              backgroundColor: isSubmitting ? colors.muted : config.color,
              opacity: scannedItems.length === 0 ? 0.5 : 1,
            },
          ]}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <FontAwesome name={config.icon} size={16} color="#fff" />
              <Text style={styles.submitText}>
                {type === 'lookup'
                  ? 'Done'
                  : `${config.verb} ${scannedItems.length} Item(s)`}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  opIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: fontSize.small,
    marginTop: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  contentInner: {
    padding: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  sectionLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.md,
  },
  itemRow: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  itemInfo: {
    marginBottom: spacing.xs,
  },
  itemSku: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.5,
  },
  itemName: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    marginTop: 2,
  },
  itemStock: {
    fontSize: fontSize.small,
    marginTop: 2,
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  qtyInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
    textAlign: 'center',
  },
  removeButton: {
    width: 36,
    height: 36,
    borderRadius: borderRadius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  lookupDetails: {
    marginTop: spacing.sm,
    gap: 4,
  },
  locRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  locLabel: {
    fontSize: fontSize.small,
  },
  locQty: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    fontVariant: ['tabular-nums'],
  },
  noLocText: {
    fontSize: fontSize.small,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: spacing.sm,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    marginTop: spacing.xs,
  },
  addMoreText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fieldLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  warehouseRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  pickerChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  pickerChipText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
  },
  bottomAction: {
    padding: spacing.xl,
    paddingBottom: Platform.OS === 'ios' ? 36 : spacing.xl,
    borderTopWidth: 1,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    borderRadius: borderRadius.md,
  },
  submitText: {
    color: '#fff',
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
