import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiClient } from '../../services/api-client';

const STATUS_FILTERS = ['ALL', 'CONFIRMED', 'PENDING', 'COMPLETED', 'CANCELLED'] as const;

interface BookingItem {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  service?: { name: string };
  tenant?: { businessName: string };
}

function getBadgeStyle(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return { backgroundColor: '#e8f5e9' };
    case 'PENDING':
      return { backgroundColor: '#fff3e0' };
    case 'COMPLETED':
      return { backgroundColor: '#e3f2fd' };
    case 'CANCELLED':
      return { backgroundColor: '#ffebee' };
    default:
      return { backgroundColor: '#f5f5f5' };
  }
}

function getBadgeTextStyle(status: string) {
  switch (status) {
    case 'CONFIRMED':
      return { color: '#2e7d32' };
    case 'PENDING':
      return { color: '#e65100' };
    case 'COMPLETED':
      return { color: '#1565c0' };
    case 'CANCELLED':
      return { color: '#c62828' };
    default:
      return { color: '#333' };
  }
}

export default function BookingsScreen() {
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const {
    data: bookings,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['bookings', statusFilter],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      const { data } = await apiClient.get('/portal/bookings', { params });
      return (data.data || []) as BookingItem[];
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.filters}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.filterChip, statusFilter === status && styles.filterChipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text style={[styles.filterText, statusFilter === status && styles.filterTextActive]}>
              {status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} />}
        renderItem={({ item }) => (
          <View style={styles.bookingCard}>
            <View style={styles.cardHeader}>
              <Text style={styles.serviceName}>{item.service?.name}</Text>
              <View style={[styles.badge, getBadgeStyle(item.status)]}>
                <Text style={[styles.badgeText, getBadgeTextStyle(item.status)]}>
                  {item.status}
                </Text>
              </View>
            </View>
            <Text style={styles.businessName}>{item.tenant?.businessName}</Text>
            <Text style={styles.dateTime}>
              {new Date(item.startTime).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
            <Text style={styles.time}>
              {new Date(item.startTime).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}{' '}
              -{' '}
              {new Date(item.endTime).toLocaleTimeString(undefined, {
                hour: 'numeric',
                minute: '2-digit',
              })}
            </Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No bookings found</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  filters: { flexDirection: 'row', padding: 16, gap: 8, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  filterChipActive: { backgroundColor: '#000', borderColor: '#000' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff' },
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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  serviceName: { fontSize: 18, fontWeight: '600', flex: 1 },
  businessName: { fontSize: 14, color: '#666', marginTop: 4 },
  dateTime: { fontSize: 14, color: '#333', marginTop: 8 },
  time: { fontSize: 14, color: '#666', marginTop: 2 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyText: { fontSize: 16, color: '#666' },
});
