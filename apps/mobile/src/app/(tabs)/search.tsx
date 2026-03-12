import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { apiClient } from '../../services/api-client';

interface BusinessItem {
  id: string;
  slug: string;
  businessName: string;
  businessType: string;
  averageRating?: number;
  serviceCount?: number;
}

export default function SearchScreen() {
  const [query, setQuery] = useState('');

  const { data: businesses, isLoading } = useQuery({
    queryKey: ['directory-search', query],
    queryFn: async () => {
      if (!query.trim()) return [];
      const { data } = await apiClient.get('/directory/search', {
        params: { query: query.trim() },
      });
      return (data.data || []) as BusinessItem[];
    },
    enabled: query.trim().length > 2,
  });

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search businesses, services..."
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          returnKeyType="search"
        />
      </View>

      {isLoading && <ActivityIndicator size="large" style={styles.loader} />}

      <FlatList
        data={businesses}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.businessCard}
            onPress={() => router.push(`/book/${item.slug}` as never)}
          >
            <Text style={styles.businessName}>{item.businessName}</Text>
            <Text style={styles.businessCategory}>{item.businessType}</Text>
            {item.averageRating != null && (
              <Text style={styles.rating}>
                {'*'.repeat(Math.round(item.averageRating))} {item.averageRating.toFixed(1)}
              </Text>
            )}
            <Text style={styles.serviceCount}>{item.serviceCount || 0} services</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {query.trim().length > 2 ? 'No businesses found' : 'Find your next appointment'}
              </Text>
              <Text style={styles.emptySubtitle}>
                Search for businesses by name, service, or category
              </Text>
            </View>
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  searchContainer: { padding: 16 },
  searchInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
  },
  loader: { marginTop: 24 },
  businessCard: {
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
  businessName: { fontSize: 18, fontWeight: '600' },
  businessCategory: { fontSize: 14, color: '#666', marginTop: 4 },
  rating: { fontSize: 14, color: '#f59e0b', marginTop: 4 },
  serviceCount: { fontSize: 13, color: '#999', marginTop: 4 },
  emptyState: { alignItems: 'center', padding: 48 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333' },
  emptySubtitle: { fontSize: 14, color: '#666', marginTop: 8, textAlign: 'center' },
});
