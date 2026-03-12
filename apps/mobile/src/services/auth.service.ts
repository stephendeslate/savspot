import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { apiClient } from './api-client';

export const authService = {
  async login(email: string, password: string) {
    const { data } = await apiClient.post('/auth/login', { email, password });
    await SecureStore.setItemAsync('auth_token', data.accessToken);
    if (data.refreshToken) {
      await SecureStore.setItemAsync('refresh_token', data.refreshToken);
    }
    return data;
  },

  async logout() {
    await SecureStore.deleteItemAsync('auth_token');
    await SecureStore.deleteItemAsync('refresh_token');
    await SecureStore.deleteItemAsync('biometric_enabled');
  },

  async getToken() {
    return SecureStore.getItemAsync('auth_token');
  },

  async isAuthenticated() {
    const token = await SecureStore.getItemAsync('auth_token');
    return !!token;
  },

  async enableBiometric() {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    if (!compatible) throw new Error('Biometric authentication not available');

    const enrolled = await LocalAuthentication.isEnrolledAsync();
    if (!enrolled) throw new Error('No biometric credentials enrolled');

    await SecureStore.setItemAsync('biometric_enabled', 'true');
  },

  async authenticateWithBiometric() {
    const biometricEnabled = await SecureStore.getItemAsync('biometric_enabled');
    if (biometricEnabled !== 'true') return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Sign in to SavSpot',
      cancelLabel: 'Use password',
      disableDeviceFallback: false,
    });

    return result.success;
  },

  async getBiometricTypes() {
    return LocalAuthentication.supportedAuthenticationTypesAsync();
  },
};
