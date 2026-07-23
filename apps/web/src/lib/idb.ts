const DB_NAME = 'starvault';
const STORE_NAME = 'db';
const KEY = 'sqlite';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadDb(): Promise<Uint8Array | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(KEY);
    request.onsuccess = () => resolve(request.result as Uint8Array | undefined);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDb(data: Uint8Array): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(data, KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
