const DB_NAME = 'freelance-images';
const IMAGES_STORE = 'images';
const DOCS_STORE = 'docs';
const DB_VERSION = 2;

export interface LibraryDoc {
  id: string;
  fileName: string;
  data: string;
  title: string;
  amount: number;
  date: string;
  docType: 'invoice' | 'expense';
  category: string;
  client?: string;
}

export interface LibraryImage {
  id: string;
  data: string;
  title: string;
  amount: number;
  date: string;
  docType: 'invoice' | 'expense';
  category: string;
  client?: string;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(IMAGES_STORE)) {
        db.createObjectStore(IMAGES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DOCS_STORE)) {
        db.createObjectStore(DOCS_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function getAll<T>(store: string): Promise<T[]> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const req = db.transaction(store, 'readonly').objectStore(store).getAll();
    req.onsuccess = () => resolve((req.result as T[]) || []);
    req.onerror = () => reject(req.error);
  }));
}

function putItem(store: string, item: object): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

function removeItem(store: string, id: string): Promise<void> {
  return openDB().then(db => new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  }));
}

export const loadImages = () => getAll<LibraryImage>(IMAGES_STORE);
export const saveImage = (image: LibraryImage) => putItem(IMAGES_STORE, image);
export const deleteImage = (id: string) => removeItem(IMAGES_STORE, id);

export const loadDocs = () => getAll<LibraryDoc>(DOCS_STORE);
export const saveDoc = (doc: LibraryDoc) => putItem(DOCS_STORE, doc);
export const deleteDoc = (id: string) => removeItem(DOCS_STORE, id);
