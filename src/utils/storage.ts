import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV({
  id: 'yuzic',
});

export const StorageDefaults = {
  librarySortOrder: 'title' as 'title' | 'recent' | 'userplays',
  isGridView: true as boolean,
  hasSeenGetStarted: false as boolean,
} as const;

type StorageKey = keyof typeof StorageDefaults;
type StorageValue<K extends StorageKey> = typeof StorageDefaults[K];

export const Storage = {
  get<K extends StorageKey>(key: K): StorageValue<K> {
    const value =
      storage.getBoolean(key) ??
      storage.getNumber(key) ??
      storage.getString(key);

    return (value ?? StorageDefaults[key]) as StorageValue<K>;
  },

  set<K extends StorageKey>(key: K, value: StorageValue<K>) {
    storage.set(key, value);
  },

  remove(key: StorageKey) {
    return storage.remove(key);
  },

  clearAll() {
    storage.clearAll();
  },
};