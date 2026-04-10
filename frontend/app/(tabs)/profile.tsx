import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../src/context/AuthContext';
import { COLORS } from '../../src/constants/theme';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await AsyncStorage.removeItem('auth_token');
      try { await logout(); } catch {}
    } catch {}
    // Hard redirect works on both web preview and Expo Go web
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Text style={styles.title}>Profile</Text>

      <View style={styles.profileCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name || 'User'}</Text>
        <Text style={styles.userPhone}>{user?.phone || ''}</Text>
      </View>

      <View style={styles.menuSection}>
        <Text style={styles.menuHeader}>SETTINGS</Text>

        <TouchableOpacity testID="profile-notifications-item" style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.text.secondary} />
          <Text style={styles.menuText}>Notifications</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity testID="profile-gmail-item" style={styles.menuItem}>
          <Ionicons name="mail-outline" size={22} color={COLORS.text.secondary} />
          <Text style={styles.menuText}>Connect Gmail</Text>
          <View style={styles.comingSoon}>
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
        </TouchableOpacity>

        <TouchableOpacity testID="profile-about-item" style={styles.menuItem}>
          <Ionicons name="information-circle-outline" size={22} color={COLORS.text.secondary} />
          <Text style={styles.menuText}>About</Text>
          <Ionicons name="chevron-forward" size={18} color={COLORS.text.tertiary} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        testID="logout-button"
        style={styles.logoutBtn}
        onPress={handleLogout}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={22} color={COLORS.brand.accent} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>Find My Tickets v1.0.0</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg.primary, paddingHorizontal: 20 },
  title: {
    fontSize: 26, fontWeight: '900', color: COLORS.text.primary,
    letterSpacing: -0.5, paddingTop: 8, marginBottom: 24,
  },
  profileCard: {
    backgroundColor: COLORS.bg.card, borderRadius: 20, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: COLORS.border, marginBottom: 24,
  },
  avatar: {
    width: 72, height: 72, borderRadius: 24, backgroundColor: COLORS.brand.primary,
    justifyContent: 'center', alignItems: 'center', marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '900', color: '#FFF' },
  userName: { fontSize: 20, fontWeight: '800', color: COLORS.text.primary },
  userPhone: { fontSize: 14, color: COLORS.text.secondary, marginTop: 4 },
  menuSection: { marginBottom: 24 },
  menuHeader: {
    fontSize: 11, fontWeight: '700', color: COLORS.text.tertiary,
    letterSpacing: 1.5, marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.bg.card,
    borderRadius: 14, padding: 16, marginBottom: 8, gap: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  menuText: { flex: 1, fontSize: 15, fontWeight: '600', color: COLORS.text.primary },
  comingSoon: {
    backgroundColor: COLORS.bg.tertiary, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  comingSoonText: { fontSize: 10, fontWeight: '700', color: COLORS.text.tertiary },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#FEF2F2', borderRadius: 14, padding: 16, gap: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700', color: COLORS.brand.accent },
  version: {
    textAlign: 'center', fontSize: 12, color: COLORS.text.tertiary,
    marginTop: 24, fontWeight: '500',
  },
});
