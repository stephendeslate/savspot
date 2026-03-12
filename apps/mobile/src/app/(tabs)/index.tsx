import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '../../services/api-client';
import { useAuthStore } from '../../store/auth.store';

interface BookingItem {
  id: string;
  startTime: string;
  status: string;
  service?: { name: string };
  tenant?: { businessName: string };
}

export default function HomeScreen() {
  const { user } = useAuthStore();

  const { data: upcomingBookings, isLoading, refetch } = useQuery({
    queryKey: ['upcoming-bookings'],
    queryFn: async () => {
      const { data } = await apiClient.get('/portal/bookings', {
        params: { status: 'CONFIRMED', limit: 5 },
      });
      return (data.data || []) as BookingItem[];
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name?.split(' ')[0] || 'there'}</Text>
        <Text style={styles.subGreeting}>Your upcoming appointments</Text>
      </View>

      <FlatList
        data={upcomingBookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.bookingCard}
            onPress={() => router.push(`/(tabs)/bookings` as never)}
          >
            <Text style={styles.serviceName}>{item.service?.name}</Text>
            <Text style={styles.businessName}>{item.tenant?.businessName}</Text>
            <Text style={styles.dateTime}>
              {new Date(item.startTime).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}{' '}
              at{' '}
              {new Date(item.startTime).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
            <View style={[styles.statusBadge, { backgroundColor: '#e8f5e9' }]}>
              <Text style={[styles.statusText, { color: '#2e7d32' }]}>{item.status}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No upcoming bookings</Text>
            <Text style={styles.emptySubtitle}>Search for a business to book</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => router.push('/(tabs)/search')}
            >
              <Text style={styles.searchButtonText}>Find a Business</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: { padding: 24, paddingTop: 16 },
  greeting: { fontSize: 28, fontWeight: '700' },
  subGreeting: { fontSize: 16, color: '#666', marginTop: 4 },
  bookingCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  serviceName: { fontSize: 18, fontWeight: '600' },
  businessName: { fontSize: 14, color: '#666', marginTop: 4 },
  dateTime: { fontSize: 14, color: '#333', marginTop: 8 },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 20, fontWeight: '600', color: '#333' },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 8 },
  searchButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 24,
  },
  searchButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
