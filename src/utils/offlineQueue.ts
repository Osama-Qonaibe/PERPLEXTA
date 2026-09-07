/**
 * Service Worker Background Sync & Offline Chat Message Queue
 * Provides durable local queuing in IndexedDB / LocalStorage when offline
 * and coordinates automatic background dispatch via Service Worker SyncManager or online events.
 */

import { toast } from '../context/NotificationContext';
import { triggerHaptic } from './haptics';

export interface QueuedChatMessage {
  id: string;
  chatId: string | null;
  content: string;
  tool: string;
  files?: Array<{ name: string; type: string; size: number; base64?: string }>;
  timestamp: number;
  status: 'pending' | 'syncing' | 'failed';
  retryCount: number;
}

const STORAGE_KEY = 'perplexta_offline_chat_queue_v1';
const DB_NAME = 'perplexta_pwa_sync_db';
const STORE_NAME = 'offline_chat_messages';

/**
 * Helper to get IndexedDB instance
 */
function openSyncDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported'));
      return;
    }

    const request = indexedDB.open(DB_NAME, 1);

    request.onupgradeneeded = (e: IDBVersionChangeEvent) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Retrieves all queued messages from storage
 */
export async function getOfflineQueuedMessages(): Promise<QueuedChatMessage[]> {
  try {
    const db = await openSyncDatabase();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        // Fallback to LocalStorage
        resolve(getFallbackQueue());
      };
    });
  } catch {
    return getFallbackQueue();
  }
}

/**
 * Fallback retrieval from localStorage
 */
function getFallbackQueue(): QueuedChatMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * Enqueues a message for background sync
 */
export async function enqueueOfflineMessage(msg: Omit<QueuedChatMessage, 'id' | 'timestamp' | 'status' | 'retryCount'>): Promise<QueuedChatMessage> {
  const queuedItem: QueuedChatMessage = {
    ...msg,
    id: `queue_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    status: 'pending',
    retryCount: 0
  };

  try {
    const db = await openSyncDatabase();
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(queuedItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Save to LocalStorage fallback
    const current = getFallbackQueue();
    current.push(queuedItem);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch {}
  }

  // Request Service Worker Background Sync if available
  registerServiceWorkerSync();

  return queuedItem;
}

/**
 * Removes a successfully dispatched message from the queue
 */
export async function removeOfflineMessage(id: string): Promise<void> {
  try {
    const db = await openSyncDatabase();
    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
    });
  } catch {}

  // Also clean from fallback
  try {
    const current = getFallbackQueue().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

/**
 * Registers background sync tag in the Service Worker
 */
export async function registerServiceWorkerSync(): Promise<boolean> {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.ready;
      if ('sync' in registration && typeof (registration as any).sync.register === 'function') {
        await (registration as any).sync.register('sync-chat-messages');
        return true;
      }
    } catch (err) {
      console.warn('[Sync] Background sync registration skipped:', err);
    }
  }
  return false;
}

/**
 * Processes all pending offline chat messages in sequence
 */
let isProcessingQueue = false;

export async function processOfflineChatQueue(
  sendCallback: (item: QueuedChatMessage) => Promise<boolean>
): Promise<number> {
  if (isProcessingQueue || (typeof navigator !== 'undefined' && !navigator.onLine)) {
    return 0;
  }

  const queue = await getOfflineQueuedMessages();
  if (queue.length === 0) return 0;

  isProcessingQueue = true;
  let successCount = 0;

  try {
    for (const item of queue) {
      try {
        const success = await sendCallback(item);
        if (success) {
          await removeOfflineMessage(item.id);
          successCount++;
        } else {
          // If dispatch failed due to offline, stop batch processing
          if (!navigator.onLine) break;
        }
      } catch (err) {
        console.error('[Sync] Error processing queued message:', err);
        if (!navigator.onLine) break;
      }
    }

    if (successCount > 0) {
      triggerHaptic('success');
      toast.success(
        typeof window !== 'undefined' && document.documentElement.dir === 'rtl'
          ? `تم إرسال ${successCount} رسالة كانت معلقة أثناء انقطاع الاتصال!`
          : `Dispatched ${successCount} queued offline message(s) successfully!`
      );
    }
  } finally {
    isProcessingQueue = false;
  }

  return successCount;
}

/**
 * Initializes global background sync listener
 */
export function initBackgroundSyncListener(
  sendCallback: (item: QueuedChatMessage) => Promise<boolean>
): () => void {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = () => {
    setTimeout(() => {
      processOfflineChatQueue(sendCallback);
    }, 1000);
  };

  const handleSwMessage = (event: MessageEvent) => {
    if (event.data && event.data.type === 'SYNC_CHAT_MESSAGES') {
      processOfflineChatQueue(sendCallback);
    }
  };

  window.addEventListener('online', handleOnline);
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', handleSwMessage);
  }

  // Attempt initial drain if already online
  if (navigator.onLine) {
    setTimeout(() => {
      processOfflineChatQueue(sendCallback);
    }, 2000);
  }

  return () => {
    window.removeEventListener('online', handleOnline);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.removeEventListener('message', handleSwMessage);
    }
  };
}
