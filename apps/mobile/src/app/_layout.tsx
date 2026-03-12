import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { authService } from '../services/auth.service';
import { apiClient } from '../services/api-client';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 5 * 60 * 1000 },
  },
});

export default function RootLayout() {
  const { setUser, setLoading } = useAuthStore();

  useEffect(() => {
    async function checkAuth() {
      try {
        const token = await authService.getToken();
        if (token) {
          const { data } = await apiClient.get('/auth/me');
          setUser(data);
        }
      } catch {
        // Token expired or invalid
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [setUser, setLoading]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="book/[slug]" options={{ presentation: 'modal' }} />
          </Stack>
          <StatusBar style="auto" />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
