import { StateStorage } from 'zustand/middleware';

// Simple Promisified IndexedDB Wrapper
const DB_NAME = 'AdhvykARStudio';
const STORE_NAME = 'keyval';

const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
  if (typeof window === 'undefined') return; // SSR Safety

  const request = indexedDB.open(DB_NAME, 1);

  request.onupgradeneeded = (event) => {
    const db = (event.target as IDBOpenDBRequest).result;
    if (!db.objectStoreNames.contains(STORE_NAME)) {
      db.createObjectStore(STORE_NAME);
    }
  };

  request.onsuccess = (event) => {
    resolve((event.target as IDBOpenDBRequest).result);
  };

  request.onerror = (event) => {
    reject((event.target as IDBOpenDBRequest).error);
  };
});

export const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(name);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, name);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
  
  removeItem: async (name: string): Promise<void> => {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(name);
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
