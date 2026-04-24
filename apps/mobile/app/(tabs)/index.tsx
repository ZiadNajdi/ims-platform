import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function ScanScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>📷</Text>
      </View>
      <Text style={styles.title}>Scan</Text>
      <Text style={styles.subtitle}>
        Point your camera at a barcode to scan an item
      </Text>
      <View style={styles.scanArea} lightColor="#f1f5f9" darkColor="rgba(255,255,255,0.05)">
        <View style={styles.cornerTL} />
        <View style={styles.cornerTR} />
        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </View>
      <Text style={styles.hint}>Camera access will be enabled when connected</Text>
    </View>
  );
}

const cornerBase = {
  position: 'absolute' as const,
  width: 24,
  height: 24,
  borderColor: '#6366f1',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    opacity: 0.6,
    marginTop: 8,
    textAlign: 'center',
  },
  scanArea: {
    width: 240,
    height: 240,
    marginTop: 32,
    borderRadius: 16,
    position: 'relative',
  },
  hint: {
    fontSize: 12,
    opacity: 0.4,
    marginTop: 20,
    textAlign: 'center',
  },
  cornerTL: {
    ...cornerBase,
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    ...cornerBase,
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    ...cornerBase,
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    ...cornerBase,
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
});
