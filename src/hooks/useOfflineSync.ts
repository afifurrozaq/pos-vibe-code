import { useState, useEffect, useCallback } from 'react';
import { CartItem } from '../types';
import { api } from '../services/api';

export type OfflineAction = {
  type: 'checkout' | 'product' | 'category';
  data: any;
  timestamp: number;
};

export function useOfflineSync(onSyncComplete: () => void, showNotification: (msg: string, type: 'success' | 'error') => void) {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineQueue, setOfflineQueue] = useState<OfflineAction[]>(() => {
    const saved = localStorage.getItem('offline_actions');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const syncOfflineData = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    showNotification(`Syncing ${offlineQueue.length} offline actions...`, 'success');
    
    const remainingQueue = [...offlineQueue];
    const failedQueue = [];

    for (const action of remainingQueue) {
      try {
        if (action.type === 'checkout') {
          await api.checkout(action.data.items, action.data.total);
        } else if (action.type === 'product') {
          await api.saveProduct({ ...action.data, updated_at: Math.floor(action.timestamp / 1000) });
        } else if (action.type === 'category') {
          await api.saveCategory({ ...action.data, updated_at: Math.floor(action.timestamp / 1000) });
        }
      } catch (err: any) {
        if (err.type === 'conflict') {
          console.warn('Conflict detected during sync, skipping client change:', err.data);
          continue;
        }
        failedQueue.push(action);
      }
    }

    setOfflineQueue(failedQueue);
    localStorage.setItem('offline_actions', JSON.stringify(failedQueue));
    
    if (failedQueue.length === 0) {
      showNotification('All offline actions synced!', 'success');
      onSyncComplete();
    } else {
      showNotification(`Failed to sync ${failedQueue.length} actions. Will retry later.`, 'error');
    }
  }, [offlineQueue, onSyncComplete, showNotification]);

  useEffect(() => {
    if (isOnline) {
      syncOfflineData();
    }
  }, [isOnline, syncOfflineData]);

  const addOfflineAction = useCallback((type: OfflineAction['type'], data: any) => {
    const newAction: OfflineAction = { type, data, timestamp: Date.now() };
    const newQueue = [...offlineQueue, newAction];
    setOfflineQueue(newQueue);
    localStorage.setItem('offline_actions', JSON.stringify(newQueue));
    showNotification(`Offline: ${type} change saved locally.`, 'success');
  }, [offlineQueue, showNotification]);

  return {
    isOnline,
    offlineQueue,
    addOfflineAction
  };
}
