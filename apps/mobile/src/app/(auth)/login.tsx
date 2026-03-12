import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Link, router } from 'expo-router';
import { authService } from '../../services/auth.service';
import { useAuthStore } from '../../store/auth.store';
import { apiClient } from '../../services/api-client';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser } = useAuthStore();

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    try {
      await authService.login(email, password);
      const { data } = await apiClient.get('/auth/me');
      setUser(data);
      router.replace('/(tabs)');
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string } } };
      Alert.alert('Login Failed', axiosError.response?.data?.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    try {
      const success = await authService.authenticateWithBiometric();
      if (success) {
        const { data } = await apiClient.get('/auth/me');
        setUser(data);
        router.replace('/(tabs)');
      }
    } catch {
      Alert.alert('Biometric login unavailable');
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.form}>
        <Text style={styles.title}>SavSpot</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <TextInput
          style={styles.input}
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="password"
        />

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.biometricButton} onPress={handleBiometricLogin}>
          <Text style={styles.biometricText}>Use Biometric Login</Text>
        </TouchableOpacity>

        <View style={styles.links}>
          <Link href="/(auth)/forgot-password" style={styles.link}>
            <Text style={styles.linkText}>Forgot password?</Text>
          </Link>
          <Link href="/(auth)/register" style={styles.link}>
            <Text style={styles.linkText}>Create account</Text>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  form: { flex: 1, justifyContent: 'center', padding: 24 },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#666', textAlign: 'center', marginBottom: 32 },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  button: {
    backgroundColor: '#000',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  biometricButton: {
    padding: 16,
    alignItems: 'center',
    marginTop: 12,
  },
  biometricText: { color: '#007AFF', fontSize: 16 },
  links: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 24 },
  link: {},
  linkText: { color: '#007AFF', fontSize: 14 },
});
