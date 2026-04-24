import { StyleSheet } from 'react-native';
import { Text, View } from '@/components/Themed';

export default function ProfileScreen() {
  return (
    <View style={styles.container}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        <View style={styles.avatar} lightColor="#ede9fe" darkColor="rgba(99,102,241,0.2)">
          <Text style={styles.avatarText}>V</Text>
        </View>
        <Text style={styles.name}>Viviana</Text>
        <Text style={styles.role}>Warehouse Operator</Text>
      </View>

      {/* Info Cards */}
      <View style={styles.section}>
        {[
          { label: 'Email', value: '—', icon: '✉️' },
          { label: 'Warehouse', value: '—', icon: '🏭' },
          { label: 'Language', value: 'English / Türkçe', icon: '🌐' },
          { label: 'Notifications', value: 'Enabled', icon: '🔔' },
        ].map((item) => (
          <View
            key={item.label}
            style={styles.infoRow}
            lightColor="#ffffff"
            darkColor="rgba(255,255,255,0.03)"
          >
            <Text style={styles.infoIcon}>{item.icon}</Text>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{item.label}</Text>
              <Text style={styles.infoValue}>{item.value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Version */}
      <Text style={styles.version}>IMS-Viviana v0.1.0</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#6366f1',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  role: {
    fontSize: 13,
    opacity: 0.5,
    marginTop: 4,
  },
  section: {
    gap: 8,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  infoIcon: {
    fontSize: 20,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 11,
    opacity: 0.4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    fontSize: 11,
    opacity: 0.3,
    marginTop: 32,
  },
});
