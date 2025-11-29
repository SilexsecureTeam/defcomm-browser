// src/utils/store.ts
import { LazyStore } from "@tauri-apps/plugin-store";

let store: LazyStore | null = null;

const getStore = async (): Promise<LazyStore> => {
  if (!store) {
    store = new LazyStore("defcomm-browser.dat");
  }
  return store;
};

export const storeGet = async <T>(
  key: string,
  fallback: T | null = null
): Promise<T | null> => {
  try {
    const store = await getStore();
    const value = await store.get<T>(key);
    return value ?? fallback;
  } catch (err) {
    console.error("Store get error:", err);
    return fallback;
  }
};

export const storeSet = async <T>(key: string, value: T): Promise<void> => {
  try {
    const store = await getStore();
    await store.set(key, value);
    await store.save();
  } catch (err) {
    console.error("Store set error:", err);
  }
};

export const storeRemove = async (key: string): Promise<void> => {
  try {
    const store = await getStore();
    await store.delete(key);
    await store.save();
  } catch (err) {
    console.error("Store remove error:", err);
  }
};
