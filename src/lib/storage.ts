// IndexedDB storage adapter with localStorage fallback
// Uses idb-keyval pattern for simplicity

const DB_NAME = 'effort-ledger';
const DB_VERSION = 1;
const STORE_NAME = 'keyval';

let dbPromise: Promise<IDBDatabase> | null = null;

/**
 * Initialize the IndexedDB database
 */
function initDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not available'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });

  return dbPromise;
}

/**
 * Check if IndexedDB is available
 */
function isIndexedDBAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Get a value from storage
 */
export async function getItem<T>(key: string): Promise<T | null> {
  if (!isIndexedDBAvailable()) {
    return getFromLocalStorage<T>(key);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result ?? null);
    });
  } catch (error) {
    console.warn('IndexedDB failed, falling back to localStorage:', error);
    return getFromLocalStorage<T>(key);
  }
}

/**
 * Set a value in storage
 */
export async function setItem<T>(key: string, value: T): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return setToLocalStorage(key, value);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('IndexedDB failed, falling back to localStorage:', error);
    return setToLocalStorage(key, value);
  }
}

/**
 * Remove a value from storage
 */
export async function removeItem(key: string): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return removeFromLocalStorage(key);
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(key);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('IndexedDB failed, falling back to localStorage:', error);
    return removeFromLocalStorage(key);
  }
}

/**
 * Clear all data from storage
 */
export async function clear(): Promise<void> {
  if (!isIndexedDBAvailable()) {
    return clearLocalStorage();
  }

  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  } catch (error) {
    console.warn('IndexedDB failed, falling back to localStorage:', error);
    return clearLocalStorage();
  }
}

// localStorage fallback functions
const STORAGE_PREFIX = 'effort-ledger:';

function getFromLocalStorage<T>(key: string): T | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const item = localStorage.getItem(STORAGE_PREFIX + key);
    return item ? JSON.parse(item) : null;
  } catch {
    return null;
  }
}

function setToLocalStorage<T>(key: string, value: T): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (error) {
    console.error('localStorage write failed:', error);
  }
}

function removeFromLocalStorage(key: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (error) {
    console.error('localStorage remove failed:', error);
  }
}

function clearLocalStorage(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));
  } catch (error) {
    console.error('localStorage clear failed:', error);
  }
}

/**
 * Zustand persist storage adapter
 */
export const zustandStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const value = await getItem<string>(name);
    return value;
  },
  setItem: async (name: string, value: string): Promise<void> => {
    await setItem(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await removeItem(name);
  },
};
