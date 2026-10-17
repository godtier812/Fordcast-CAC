import Storage from 'expo-sqlite/kv-store';
export const storage = {
  get: (key: string) => Storage.getItemAsync(key),
  set: (key: string, value: string) => Storage.setItemAsync(key, value),
};
