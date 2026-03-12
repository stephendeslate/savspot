import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = 'savspot_cache_';

export const offlineService = {
  async cacheBookings(bookings: unknown[]) {
    try {
      await AsyncStorage.setItem(
        `${CACHE_PREFIX}bookings`,
        JSON.stringify({ data: bookings, cachedAt: Date.now() }),
      );
    } catch {
      // Storage full or unavailable
    }
  },

  async getCachedBookings(): Promise<unknown[] | null> {
    try {
      const cached = await AsyncStorage.getItem(`${CACHE_PREFIX}bookings`);
      if (!cached) return null;
      const { data, cachedAt } = JSON.parse(cached) as { data: unknown[]; cachedAt: number };
      if (Date.now() - cachedAt > 24 * 60 * 60 * 1000) return null;
      return data;
    } catch {
      return null;
    }
  },

  async clearCache() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith(CACHE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {
      // Ignore
    }
  },
};
