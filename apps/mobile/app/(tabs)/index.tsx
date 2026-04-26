import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, fontSize, fontWeight, spacing, shadow } from '@/constants/Theme';
import { QRScanner } from '@/components/QRScanner';
import { OperationSheet, OperationType } from '@/components/OperationSheet';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';

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

type AppState = 'idle' | 'choose_input' | 'scanning' | 'operation';

const OPERATIONS = [
  {
    type: 'stock_in' as OperationType,
    label: 'Stock In',
    icon: 'arrow-down' as const,
    color: '#22c55e',
    description: 'Receive items into inventory',
  },
  {
    type: 'stock_out' as OperationType,
    label: 'Stock Out',
    icon: 'arrow-up' as const,
    color: '#ef4444',
    description: 'Dispatch items from inventory',
  },
  {
    type: 'transfer' as OperationType,
    label: 'Transfer',
    icon: 'exchange' as const,
    color: '#6366f1',
    description: 'Move between warehouses',
  },
  {
    type: 'lookup' as OperationType,
    label: 'Lookup',
    icon: 'search' as const,
    color: '#f59e0b',
    description: 'View item details',
  },
];

export default function OperationsScreen() {
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const [appState, setAppState] = useState<AppState>('idle');
  const [selectedOp, setSelectedOp] = useState<OperationType | null>(null);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [manualSku, setManualSku] = useState('');

  const handleSelectOperation = (type: OperationType) => {
    setSelectedOp(type);
    setScannedItems([]);
    setAppState('choose_input');
  };

  const lookupItem = useCallback(async (sku: string): Promise<ScannedItem | null> => {
    const { data, error } = await supabase
      .from('inventory_summary')
      .select('*')
      .eq('stock_code', sku)
      .maybeSingle();

    if (error || !data) {
      Alert.alert('Item Not Found', `No inventory item found for code: ${sku}`);
      return null;
    }

    return {
      sku: data.stock_code,
      name: data.name,
      category: data.category,
      totalQty: Number(data.total_qty) || 0,
      unit: data.unit,
      status: data.status,
      locationsJson: data.locations_json || {},
      qty: '1',
    };
  }, []);

  const handleScan = useCallback(async (data: string) => {
    // Check if item already scanned
    const alreadyScanned = scannedItems.find((item) => item.sku === data);
    if (alreadyScanned) {
      // Go to operation sheet showing the existing items
      setAppState('operation');
      return;
    }

    const item = await lookupItem(data);
    if (item) {
      setScannedItems((prev) => [...prev, item]);
      setAppState('operation');
    }
  }, [scannedItems, lookupItem]);

  const handleManualEntry = async () => {
    const trimmed = manualSku.trim();
    if (!trimmed) return;

    const alreadyScanned = scannedItems.find((item) => item.sku === trimmed);
    if (alreadyScanned) {
      Alert.alert('Already Added', `${trimmed} is already in the list.`);
      return;
    }

    const item = await lookupItem(trimmed);
    if (item) {
      setScannedItems((prev) => [...prev, item]);
      setManualSku('');
      setAppState('operation');
    }
  };

  const handleAddMore = () => {
    setAppState('choose_input');
  };

  const handleRemoveItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateQty = (index: number, qty: string) => {
    setScannedItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty } : item))
    );
  };

  const handleComplete = () => {
    setAppState('idle');
    setSelectedOp(null);
    setScannedItems([]);
    setManualSku('');
  };

  const handleClose = () => {
    if (scannedItems.length > 0 && appState === 'operation') {
      Alert.alert(
        'Discard Operation?',
        'You have scanned items. Are you sure you want to cancel?',
        [
          { text: 'Continue', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: handleComplete },
        ]
      );
    } else {
      handleComplete();
    }
  };

  // QR Scanner full-screen
  if (appState === 'scanning' && selectedOp) {
    return (
      <QRScanner
        title={OPERATIONS.find((o) => o.type === selectedOp)?.label || 'Scan'}
        onScan={handleScan}
        onClose={() => {
          if (scannedItems.length > 0) {
            setAppState('operation');
          } else {
            setAppState('choose_input');
          }
        }}
      />
    );
  }

  // Operation Sheet (after items are scanned)
  if (appState === 'operation' && selectedOp) {
    return (
      <OperationSheet
        type={selectedOp}
        scannedItems={scannedItems}
        onAddMore={handleAddMore}
        onRemoveItem={handleRemoveItem}
        onUpdateQty={handleUpdateQty}
        onClose={handleClose}
        onComplete={handleComplete}
      />
    );
  }

  // Choose Input Method (after selecting operation)
  if (appState === 'choose_input' && selectedOp) {
    const opConfig = OPERATIONS.find((o) => o.type === selectedOp)!;
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.inputMethodScreen}>
          {/* Back + Title */}
          <View style={styles.inputHeader}>
            <Pressable onPress={handleComplete} style={styles.backButton}>
              <FontAwesome name="chevron-left" size={16} color={colors.muted} />
            </Pressable>
            <View style={styles.inputHeaderCenter}>
              <View style={[styles.inputOpBadge, { backgroundColor: opConfig.color + '12' }]}>
                <FontAwesome name={opConfig.icon} size={14} color={opConfig.color} />
              </View>
              <Text style={[styles.inputTitle, { color: colors.text }]}>{opConfig.label}</Text>
            </View>
            <View style={{ width: 36 }} />
          </View>

          <Text style={[styles.inputSubtitle, { color: colors.muted }]}>
            Choose how to add items
          </Text>

          {/* Scan QR Button */}
          <Pressable
            onPress={() => setAppState('scanning')}
            style={({ pressed }) => [
              styles.inputMethodCard,
              {
                backgroundColor: colors.primary,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
          >
            <View style={styles.inputMethodIcon}>
              <FontAwesome name="qrcode" size={32} color="#fff" />
            </View>
            <Text style={styles.inputMethodLabel}>Scan QR / Barcode</Text>
            <Text style={styles.inputMethodHint}>Use your camera to scan product codes</Text>
          </Pressable>

          {/* Manual SKU Entry */}
          <View style={[styles.manualCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.manualCardTitle, { color: colors.text }]}>Enter SKU Manually</Text>
            <View style={styles.manualRow}>
              <TextInput
                style={[
                  styles.manualInput,
                  { color: colors.text, borderColor: colors.border, backgroundColor: colors.background },
                ]}
                value={manualSku}
                onChangeText={setManualSku}
                placeholder="e.g. 12345"
                placeholderTextColor={colors.muted}
                returnKeyType="go"
                keyboardType="default"
                autoCapitalize="characters"
                onSubmitEditing={handleManualEntry}
              />
              <Pressable
                onPress={handleManualEntry}
                style={[styles.manualButton, { backgroundColor: colors.primary }]}
              >
                <FontAwesome name="arrow-right" size={16} color={colors.primaryForeground} />
              </Pressable>
            </View>
          </View>

          {/* Already scanned items count */}
          {scannedItems.length > 0 && (
            <Pressable
              onPress={() => setAppState('operation')}
              style={[styles.pendingBanner, { backgroundColor: opConfig.color + '12', borderColor: opConfig.color + '30' }]}
            >
              <Text style={[styles.pendingText, { color: opConfig.color }]}>
                {scannedItems.length} item(s) ready — tap to continue
              </Text>
              <FontAwesome name="chevron-right" size={12} color={opConfig.color} />
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Operation Selector (idle state)
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.idleContent} showsVerticalScrollIndicator={false}>
        <View style={styles.headerSection}>
          <Text style={[styles.greeting, { color: colors.muted }]}>IMS-VIVIANA</Text>
          <Text style={[styles.title, { color: colors.text }]}>Operations</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>
            Select an operation to begin
          </Text>
        </View>

        {/* Operation Cards */}
        <View style={styles.grid}>
          {OPERATIONS.map((op) => (
            <Pressable
              key={op.type}
              onPress={() => handleSelectOperation(op.type)}
              style={({ pressed }) => [
                styles.opCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: pressed ? op.color : colors.border,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                },
              ]}
            >
              <View style={[styles.opIconCircle, { backgroundColor: op.color + '12' }]}>
                <FontAwesome name={op.icon} size={20} color={op.color} />
              </View>
              <Text style={[styles.opLabel, { color: colors.text }]}>{op.label}</Text>
              <Text style={[styles.opDesc, { color: colors.muted }]}>{op.description}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  idleContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.xxxl,
  },
  headerSection: {
    paddingTop: Platform.OS === 'ios' ? spacing.lg : spacing.xxxl,
    marginBottom: spacing.xxl,
  },
  greeting: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 2,
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.hero,
    fontWeight: fontWeight.black,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: fontSize.body,
    marginTop: spacing.xs,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  opCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    ...shadow.sm,
  },
  opIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  opLabel: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  opDesc: {
    fontSize: fontSize.small,
    lineHeight: 17,
  },

  // Choose Input Method screen
  inputMethodScreen: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? spacing.md : spacing.xxl,
  },
  inputHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputHeaderCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  inputOpBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputSubtitle: {
    fontSize: fontSize.body,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  inputMethodCard: {
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  inputMethodIcon: {
    marginBottom: spacing.sm,
  },
  inputMethodLabel: {
    color: '#fff',
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  inputMethodHint: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: fontSize.small,
    textAlign: 'center',
  },
  manualCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    gap: spacing.md,
  },
  manualCardTitle: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
  manualRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  manualInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontSize: fontSize.body,
    fontVariant: ['tabular-nums'],
  },
  manualButton: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  pendingText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.semibold,
  },
});
