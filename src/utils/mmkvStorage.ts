import { createMMKV } from 'react-native-mmkv';
import { Storage } from 'redux-persist';

// NOTE: migrating from AsyncStorage to MMKV clears the existing persisted state
// on first launch (different storage backend). Redux slices re-hydrate from the
// server on next sync; the user will need to re-enter server credentials once.
export const mmkv = createMMKV({ id: 'yuzic-store' });

export const reduxStorage: Storage = {
  setItem: (key, value) => {
    mmkv.set(key, value);
    return Promise.resolve(true);
  },
  getItem: (key) => {
    return Promise.resolve(mmkv.getString(key) ?? null);
  },
  removeItem: (key) => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};

export const queryStorage = {
  setItem: (key: string, value: string): Promise<void> => {
    mmkv.set(key, value);
    return Promise.resolve();
  },
  getItem: (key: string): Promise<string | null> => {
    return Promise.resolve(mmkv.getString(key) ?? null);
  },
  removeItem: (key: string): Promise<void> => {
    mmkv.remove(key);
    return Promise.resolve();
  },
};
