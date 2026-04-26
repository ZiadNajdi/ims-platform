import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions, Platform } from 'react-native';
import { CameraView, useCameraPermissions, BarcodeScanningResult } from 'expo-camera';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, fontSize, fontWeight, spacing } from '@/constants/Theme';
import FontAwesome from '@expo/vector-icons/FontAwesome';

interface QRScannerProps {
  onScan: (data: string) => void;
  onClose: () => void;
  title?: string;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCAN_SIZE = SCREEN_WIDTH * 0.7;

export function QRScanner({ onScan, onClose, title = 'Scan QR Code' }: QRScannerProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const isProcessingRef = useRef(false);
  const lastScannedRef = useRef<string | null>(null);
  const colorScheme = useColorScheme() ?? 'light';
  const colors = Colors[colorScheme];

  const handleBarCodeScanned = (result: BarcodeScanningResult) => {
    // Prevent duplicate rapid fires
    if (isProcessingRef.current) return;
    // Prevent same code from being processed again
    if (lastScannedRef.current === result.data) return;

    isProcessingRef.current = true;
    lastScannedRef.current = result.data;

    onScan(result.data);

    // Keep locked — the parent will unmount this component or navigate away
    // If user comes back to scan another item, refs will be fresh
  };

  if (!permission) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.permText, { color: colors.text }]}>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.permContainer}>
          <FontAwesome name="camera" size={48} color={colors.muted} />
          <Text style={[styles.permTitle, { color: colors.text }]}>Camera Access Required</Text>
          <Text style={[styles.permText, { color: colors.muted }]}>
            Grant camera permission to scan QR codes and barcodes.
          </Text>
          <Pressable
            onPress={requestPermission}
            style={[styles.permButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.permButtonText, { color: colors.primaryForeground }]}>
              Grant Permission
            </Text>
          </Pressable>
          <Pressable onPress={onClose} style={styles.cancelLink}>
            <Text style={[styles.cancelLinkText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.scannerContainer}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        facing="back"
        enableTorch={torch}
        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128', 'ean13'] }}
        onBarcodeScanned={handleBarCodeScanned}
      />

      {/* Overlay */}
      <View style={styles.overlay}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Pressable onPress={onClose} style={styles.topButton}>
            <FontAwesome name="chevron-left" size={18} color="#fff" />
          </Pressable>
          <Text style={styles.topTitle}>{title}</Text>
          <Pressable onPress={() => setTorch(!torch)} style={styles.topButton}>
            <FontAwesome name="bolt" size={18} color={torch ? '#fbbf24' : '#fff'} />
          </Pressable>
        </View>

        {/* Scan Window */}
        <View style={styles.scanWindowContainer}>
          <View style={styles.scanWindow}>
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />
          </View>
        </View>

        {/* Bottom hint */}
        <View style={styles.bottomHint}>
          <Text style={styles.hintText}>
            Position the QR code within the frame
          </Text>
        </View>
      </View>
    </View>
  );
}

const CORNER_SIZE = 28;
const CORNER_WIDTH = 4;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'space-between',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: spacing.lg,
  },
  topButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topTitle: {
    color: '#fff',
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scanWindowContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanWindow: {
    width: SCAN_SIZE,
    height: SCAN_SIZE,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: '#818cf8',
  },
  cornerTL: {
    top: 0, left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0, right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0, left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0, right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: 8,
  },
  bottomHint: {
    alignItems: 'center',
    paddingBottom: Platform.OS === 'ios' ? 50 : 30,
    paddingHorizontal: spacing.xxl,
  },
  hintText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: fontSize.small,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  permContainer: {
    alignItems: 'center',
    paddingHorizontal: spacing.xxxl,
    gap: spacing.lg,
  },
  permTitle: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    marginTop: spacing.md,
  },
  permText: {
    fontSize: fontSize.body,
    textAlign: 'center',
    lineHeight: 22,
  },
  permButton: {
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    marginTop: spacing.sm,
  },
  permButtonText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cancelLink: {
    padding: spacing.sm,
  },
  cancelLinkText: {
    fontSize: fontSize.body,
  },
});
