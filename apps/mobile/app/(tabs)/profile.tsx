import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Switch,
  Platform,
  SafeAreaView,
  Alert,
  Appearance,
} from 'react-native';
import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import { borderRadius, fontSize, fontWeight, spacing, shadow } from '@/constants/Theme';
import { supabase } from '@/lib/supabase';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'system' | 'light' | 'dark';

export default function ProfileScreen() {
  const systemScheme = useColorScheme() ?? 'light';
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');

  // Resolve the effective color scheme
  const effectiveScheme = themeMode === 'system' ? systemScheme : themeMode;
  const colors = Colors[effectiveScheme];

  const [warehouses, setWarehouses] = useState<{ id: string; name: string }[]>([]);
  const [defaultWarehouse, setDefaultWarehouse] = useState<string | null>(null);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    // Load warehouses
    const { data } = await supabase.from('warehouses').select('*').order('name');
    if (data) setWarehouses(data);

    // Load preferences
    const savedWarehouse = await AsyncStorage.getItem('defaultWarehouse');
    if (savedWarehouse) setDefaultWarehouse(savedWarehouse);

    const savedHaptic = await AsyncStorage.getItem('hapticEnabled');
    if (savedHaptic !== null) setHapticEnabled(savedHaptic === 'true');

    const savedTheme = await AsyncStorage.getItem('themeMode');
    if (savedTheme) setThemeMode(savedTheme as ThemeMode);
  };

  const handleSetDefaultWarehouse = async (name: string) => {
    setDefaultWarehouse(name);
    await AsyncStorage.setItem('defaultWarehouse', name);
  };

  const handleToggleHaptic = async (value: boolean) => {
    setHapticEnabled(value);
    await AsyncStorage.setItem('hapticEnabled', value.toString());
  };

  const handleSetTheme = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await AsyncStorage.setItem('themeMode', mode);
    // Tell React Native to switch appearance
    if (mode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(mode);
    }
  };

  const handleLogout = () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Info', 'Authentication not yet configured.');
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.headerLabel, { color: colors.muted }]}>IMS-VIVIANA</Text>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Profile</Text>
        </View>

        {/* Avatar Card */}
        <View style={[styles.avatarCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={[styles.avatar, { backgroundColor: colors.primary + '15' }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>V</Text>
          </View>
          <View style={styles.avatarInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>Viviana</Text>
            <Text style={[styles.userRole, { color: colors.muted }]}>Warehouse Operator</Text>
            <View style={[styles.roleBadge, { backgroundColor: colors.primary + '12' }]}>
              <Text style={[styles.roleBadgeText, { color: colors.primary }]}>MOBILE CLIENT</Text>
            </View>
          </View>
        </View>

        {/* Default Warehouse */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Default Warehouse</Text>
          <Text style={[styles.sectionHint, { color: colors.muted }]}>
            Pre-selected warehouse for operations
          </Text>
          <View style={styles.warehouseGrid}>
            {warehouses.map((wh) => (
              <Pressable
                key={wh.id}
                onPress={() => handleSetDefaultWarehouse(wh.name)}
                style={[
                  styles.warehouseChip,
                  {
                    backgroundColor: defaultWarehouse === wh.name ? colors.primary : colors.surface,
                    borderColor: defaultWarehouse === wh.name ? colors.primary : colors.border,
                  },
                ]}
              >
                <FontAwesome
                  name="building-o"
                  size={12}
                  color={defaultWarehouse === wh.name ? colors.primaryForeground : colors.muted}
                />
                <Text
                  style={[
                    styles.warehouseChipText,
                    {
                      color: defaultWarehouse === wh.name ? colors.primaryForeground : colors.text,
                    },
                  ]}
                >
                  {wh.name}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Settings */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>Settings</Text>

          {/* Appearance / Theme */}
          <Text style={[styles.fieldLabel, { color: colors.muted }]}>Appearance</Text>
          <View style={styles.themeRow}>
            {([
              { mode: 'light' as ThemeMode, icon: 'sun-o' as const, label: 'Light' },
              { mode: 'dark' as ThemeMode, icon: 'moon-o' as const, label: 'Dark' },
              { mode: 'system' as ThemeMode, icon: 'adjust' as const, label: 'System' },
            ]).map((opt) => (
              <Pressable
                key={opt.mode}
                onPress={() => handleSetTheme(opt.mode)}
                style={[
                  styles.themeOption,
                  {
                    backgroundColor: themeMode === opt.mode ? colors.primary : colors.surface,
                    borderColor: themeMode === opt.mode ? colors.primary : colors.border,
                  },
                ]}
              >
                <FontAwesome
                  name={opt.icon}
                  size={16}
                  color={themeMode === opt.mode ? colors.primaryForeground : colors.muted}
                />
                <Text
                  style={[
                    styles.themeOptionText,
                    { color: themeMode === opt.mode ? colors.primaryForeground : colors.text },
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Haptic Feedback */}
          <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <FontAwesome name="hand-pointer-o" size={16} color={colors.muted} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Haptic Feedback</Text>
                <Text style={[styles.settingHint, { color: colors.muted }]}>Vibrate on actions</Text>
              </View>
            </View>
            <Switch
              value={hapticEnabled}
              onValueChange={handleToggleHaptic}
              trackColor={{ false: colors.border, true: colors.primary + '50' }}
              thumbColor={hapticEnabled ? colors.primary : colors.muted}
            />
          </View>

          {/* Language */}
          <View style={[styles.settingRow, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.settingInfo}>
              <FontAwesome name="globe" size={16} color={colors.muted} style={styles.settingIcon} />
              <View>
                <Text style={[styles.settingLabel, { color: colors.text }]}>Language</Text>
                <Text style={[styles.settingHint, { color: colors.muted }]}>English / Türkçe</Text>
              </View>
            </View>
            <FontAwesome name="chevron-right" size={12} color={colors.muted} />
          </View>
        </View>

        {/* Logout */}
        <Pressable
          onPress={handleLogout}
          style={[styles.logoutButton, { borderColor: colors.danger + '30' }]}
        >
          <FontAwesome name="sign-out" size={16} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Log Out</Text>
        </Pressable>

        <Text style={[styles.footer, { color: colors.muted }]}>
          IMS-Viviana v0.1.0 • Warehouse Management System
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  headerSection: {
    paddingHorizontal: spacing.xl,
    paddingTop: Platform.OS === 'ios' ? spacing.lg : spacing.xxxl,
    marginBottom: spacing.xxl,
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
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    gap: spacing.lg,
    marginBottom: spacing.xxl,
    ...shadow.sm,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 28,
    fontWeight: fontWeight.black,
  },
  avatarInfo: {
    flex: 1,
  },
  userName: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.bold,
    letterSpacing: -0.3,
  },
  userRole: {
    fontSize: fontSize.body,
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  roleBadgeText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    letterSpacing: 0.5,
  },
  section: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  sectionHint: {
    fontSize: fontSize.small,
    marginBottom: spacing.md,
  },
  warehouseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  warehouseChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  warehouseChipText: {
    fontSize: fontSize.small,
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
    marginTop: spacing.xs,
  },
  themeRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  themeOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
  },
  themeOptionText: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 24,
    marginRight: spacing.md,
    textAlign: 'center',
  },
  settingLabel: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
  },
  settingHint: {
    fontSize: fontSize.small,
    marginTop: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderWidth: 1,
    borderRadius: borderRadius.md,
    marginTop: spacing.md,
  },
  logoutText: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  footer: {
    textAlign: 'center',
    fontSize: fontSize.caption,
    marginTop: spacing.xxl,
    opacity: 0.5,
    letterSpacing: 0.5,
  },
});
