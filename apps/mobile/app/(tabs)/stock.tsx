import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function StockScreen() {
  return (
    <View style={styles.container}>
      {/* Stats Row */}
      <View style={styles.statsRow}>
        {[
          { label: 'Total', value: '—', emoji: '📦' },
          { label: 'Low', value: '—', emoji: '⚠️' },
          { label: 'Incoming', value: '—', emoji: '📥' },
        ].map((stat) => (
          <View key={stat.label} style={styles.statCard} lightColor="#f8fafc" darkColor="rgba(255,255,255,0.05)">
            <Text style={styles.statEmoji}>{stat.emoji}</Text>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Empty State */}
      <View style={styles.emptyState} lightColor="#f8fafc" darkColor="rgba(255,255,255,0.03)">
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyTitle}>No stock data</Text>
        <Text style={styles.emptySubtitle}>
          Inventory items will appear here once the system is connected.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
  },
  statEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    opacity: 0.5,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    padding: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptySubtitle: {
    fontSize: 13,
    opacity: 0.5,
    textAlign: 'center',
    marginTop: 6,
    maxWidth: 240,
  },
});
