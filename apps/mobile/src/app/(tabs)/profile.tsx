import { View, Text, StyleSheet, TouchableOpacity, Alert, ScrollView, Switch } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/auth.store';
import { authService } from '../../services/auth.service';
import { pushService } from '../../services/push-notifications.service';
import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

export default function ProfileScreen() {
  const { user, reset } = useAuthStore();
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const bio = await SecureStore.getItemAsync('biometric_enabled');
      setBiometricEnabled(bio === 'true');
    }
    loadSettings();
  }, []);

  async function handleLogout() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await authService.logout();
          reset();
          router.replace('/(auth)/login');
        },
      },
    ]);
  }

  async function toggleBiometric(value: boolean) {
    try {
      if (value) {
        await authService.enableBiometric();
        setBiometricEnabled(true);
      } else {
        await SecureStore.deleteItemAsync('biometric_enabled');
        setBiometricEnabled(false);
      }
    } catch (error: unknown) {
      const err = error as Error;
      Alert.alert('Error', err.message);
    }
  }

  async function togglePush(value: boolean) {
    if (value) {
      const token = await pushService.registerForPushNotifications();
      setPushEnabled(!!token);
      if (!token) {
        Alert.alert('Permission Denied', 'Please enable notifications in your device settings');
      }
    } else {
      setPushEnabled(false);
    }
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profileHeader}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.charAt(0)?.toUpperCase() || '?'}</Text>
        </View>
        <Text style={styles.name}>{user?.name}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Security</Text>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Biometric Login</Text>
          <Switch value={biometricEnabled} onValueChange={toggleBiometric} />
        </View>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>Push Notifications</Text>
          <Switch value={pushEnabled} onValueChange={togglePush} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account</Text>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Payment Methods</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Notification Preferences</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Text style={styles.menuText}>Privacy & Data</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  profileHeader: { alignItems: 'center', padding: 32 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 32, fontWeight: '700' },
  name: { fontSize: 22, fontWeight: '700', marginTop: 16 },
  email: { fontSize: 14, color: '#666', marginTop: 4 },
  section: { marginTop: 8, backgroundColor: '#fff', paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#999',
    paddingVertical: 12,
    textTransform: 'uppercase',
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingLabel: { fontSize: 16, color: '#333' },
  menuItem: {
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  menuText: { fontSize: 16, color: '#333' },
  logoutButton: {
    margin: 16,
    marginTop: 32,
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ff3b30',
  },
  logoutText: { color: '#ff3b30', fontSize: 16, fontWeight: '600' },
});
