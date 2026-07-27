import { emptyCrate } from './rocrate.js';

const DB_NAME = 'collection-scanner-online';
const STORE_NAME = 'keyval';
const CATALOGUE_KEY = 'catalogue-crate';
const REGISTER_KEY = 'register-crate';

let dbPromise = null;

function openDb() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

async function get(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function set(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadCatalogue() {
  const existing = await get(CATALOGUE_KEY);
  if (existing) return existing;
  const fresh = emptyCrate('Catalogue', 'Collection catalogue of accessioned objects');
  await set(CATALOGUE_KEY, fresh);
  return fresh;
}

export async function loadRegister() {
  const existing = await get(REGISTER_KEY);
  if (existing) return existing;
  const fresh = emptyCrate('Register', 'Register of scanned objects awaiting cataloguing');
  await set(REGISTER_KEY, fresh);
  return fresh;
}

export function saveCatalogue(crate) {
  return set(CATALOGUE_KEY, crate);
}

export function saveRegister(crate) {
  return set(REGISTER_KEY, crate);
}
