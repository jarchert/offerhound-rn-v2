import AsyncStorage from '@react-native-async-storage/async-storage';

export function useOfflineCache<T>(key: string) {
  return {
    saveToCache: async (data: T) => {
      try { await AsyncStorage.setItem(key, JSON.stringify(data)); } catch {}
    },
    getFromCache: async (): Promise<T | null> => {
      try { const d = await AsyncStorage.getItem(key); return d ? JSON.parse(d) : null; } catch { return null; }
    },
    clearCache: async () => { try { await AsyncStorage.removeItem(key); } catch {} },
  };
}
