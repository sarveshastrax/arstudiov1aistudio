import { StateStorage } from 'zustand/middleware';

// Robust Storage Adapter with Fallback
// Handles IndexedDB -> LocalStorage -> Memory

const DB_NAME = 'AdhvykARStudio';
const STORE_NAME = 'keyval';

// In-memory fallback if DB fails
const memoryStore = new Map<string, string>();

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
       return reject(new Error('SSR'));
    }
    
    // Check if IndexedDB is supported/available
    if (!window.indexedDB) {
       return reject(new Error('IndexedDB not supported'));
    }

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
};

export const storage: StateStorage = {
  getItem: async (name: string): Promise<string | null> => {
    try {
      const db = await getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(name);
        request.onsuccess = () => resolve(request.result || null);
        request.onerror = () => resolve(null); // Fail safe
      });
    } catch (e) {
      // Fallback to memory
      return memoryStore.get(name) || null;
    }
  },
  
  setItem: async (name: string, value: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(value, name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      memoryStore.set(name, value);
    }
  },
  
  removeItem: async (name: string): Promise<void> => {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(name);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      memoryStore.delete(name);
    }
  },
};