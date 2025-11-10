import { useState, useEffect } from 'react';
import { db } from '../db/offlineDb';
import { googleDriveUploader } from '../utils/googleDriveUpload';
import { useEntregasStore } from '../stores/entregasStore';

export interface SyncStatus {
  isPending: boolean;
  isSyncing: boolean;
  lastSync: Date | null;
  pendingCount: number;
  syncError: string | null;
}

export function useOfflineSync() {
  const [status, setStatus] = useState<SyncStatus>({
    isPending: false,
    isSyncing: false,
    lastSync: null,
    pendingCount: 0,
    syncError: null,
  });

  const { isOnline } = useEntregasStore();

  // Check pending items on mount
  useEffect(() => {
    checkPendingItems();
  }, []);

  // Auto-sync when online
  useEffect(() => {
    if (isOnline && status.pendingCount > 0 && !status.isSyncing) {
      console.log('[useOfflineSync] Online detected, auto-syncing...');
      syncAll();
    }
  }, [isOnline]);

  const checkPendingItems = async () => {
    try {
      const pending = await db.syncQueue.where('retries').below(5).count();
      setStatus(prev => ({ ...prev, pendingCount: pending, isPending: pending > 0 }));
    } catch (error) {
      console.error('[useOfflineSync] Error checking pending items:', error);
    }
  };

  const syncAll = async (): Promise<boolean> => {
    if (status.isSyncing) {
      console.log('[useOfflineSync] Sync already in progress');
      return false;
    }

    setStatus(prev => ({ ...prev, isSyncing: true, syncError: null }));

    try {
      // Get pending sync items
      const pendingItems = await db.syncQueue
        .where('retries')
        .below(5)
        .toArray();

      console.log(`[useOfflineSync] Found ${pendingItems.length} pending items`);

      let successCount = 0;
      let errorCount = 0;

      for (const item of pendingItems) {
        try {
          await syncItem(item);

          // Remove from queue on success
          await db.syncQueue.delete(item.id);
          successCount++;
        } catch (error) {
          console.error(`[useOfflineSync] Error syncing item ${item.id}:`, error);

          // Update retry count
          await db.syncQueue.update(item.id, {
            retries: item.retries + 1,
            lastAttempt: new Date().toISOString(),
            error: error instanceof Error ? error.message : 'Unknown error',
          });

          errorCount++;
        }
      }

      console.log(`[useOfflineSync] Sync completed: ${successCount} success, ${errorCount} errors`);

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSync: new Date(),
        pendingCount: errorCount,
        isPending: errorCount > 0,
        syncError: errorCount > 0 ? `${errorCount} items failed to sync` : null,
      }));

      return errorCount === 0;
    } catch (error) {
      console.error('[useOfflineSync] Sync error:', error);

      setStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncError: error instanceof Error ? error.message : 'Sync failed',
      }));

      return false;
    }
  };

  const syncItem = async (item: any): Promise<void> => {
    console.log(`[useOfflineSync] Syncing item ${item.id} (type: ${item.type})`);

    switch (item.type) {
      case 'pdf':
        await syncPDF(item.data);
        break;
      case 'entrega':
        await syncEntrega(item.data);
        break;
      default:
        throw new Error(`Unknown sync type: ${item.type}`);
    }
  };

  const syncPDF = async (data: any): Promise<void> => {
    const { pdfBlob, filename } = data;

    // Upload to Google Drive with retry
    const result = await googleDriveUploader.uploadWithRetry(
      pdfBlob,
      filename,
      3 // max retries
    );

    if (!result.success) {
      throw new Error(result.error || 'Upload failed');
    }

    console.log(`[useOfflineSync] PDF uploaded: ${filename} -> ${result.fileId}`);
  };

  const syncEntrega = async (data: any): Promise<void> => {
    // Send to N8N webhook
    const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_URL;

    if (!webhookUrl || webhookUrl.includes('your-n8n-instance')) {
      console.warn('[useOfflineSync] N8N webhook URL not configured, skipping');
      return;
    }

    console.log('[useOfflineSync] ===== SENDING TO N8N =====');
    console.log('[useOfflineSync] URL:', webhookUrl);
    console.log('[useOfflineSync] Data:', data);
    console.log('[useOfflineSync] JSON:', JSON.stringify(data, null, 2));

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        mode: 'cors', // Explicitly set CORS mode
      });

      console.log('[useOfflineSync] Response status:', response.status);
      console.log('[useOfflineSync] Response ok:', response.ok);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[useOfflineSync] N8N error response:', errorText);
        throw new Error(`N8N webhook error: ${response.status} - ${errorText}`);
      }

      const responseText = await response.text();
      console.log('[useOfflineSync] N8N response:', responseText);
      console.log('[useOfflineSync] ✓ Entrega synced to N8N successfully');
    } catch (error) {
      console.error('[useOfflineSync] ===== FETCH ERROR =====');
      console.error('[useOfflineSync] Error type:', error instanceof TypeError ? 'TypeError (likely CORS)' : typeof error);
      console.error('[useOfflineSync] Error message:', error);

      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('[useOfflineSync] 🚨 CORS ERROR DETECTED 🚨');
        console.error('[useOfflineSync] N8N webhook is blocking requests from localhost');
        console.error('[useOfflineSync] Solution: Enable CORS in N8N webhook settings');
        console.error('[useOfflineSync] Add these headers to your N8N webhook:');
        console.error('[useOfflineSync]   - Access-Control-Allow-Origin: *');
        console.error('[useOfflineSync]   - Access-Control-Allow-Methods: POST, OPTIONS');
        console.error('[useOfflineSync]   - Access-Control-Allow-Headers: Content-Type');
      }

      throw error;
    }
  };

  const savePending = async (type: 'pdf' | 'entrega', data: any): Promise<void> => {
    try {
      console.log(`[useOfflineSync] ===== SAVING TO QUEUE =====`);
      console.log(`[useOfflineSync] Type: ${type}`);
      console.log(`[useOfflineSync] Data:`, data);
      console.log(`[useOfflineSync] Data keys:`, Object.keys(data || {}));

      await db.syncQueue.add({
        id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        retries: 0,
        lastAttempt: undefined,
        error: undefined,
      });

      await checkPendingItems();

      console.log(`[useOfflineSync] ✓ Item saved to sync queue (type: ${type})`);
    } catch (error) {
      console.error('[useOfflineSync] Error saving to queue:', error);
      throw error;
    }
  };

  const retryFailed = async (): Promise<boolean> => {
    // Reset retry count for failed items
    const failedItems = await db.syncQueue
      .where('retries')
      .aboveOrEqual(3)
      .toArray();

    for (const item of failedItems) {
      await db.syncQueue.update(item.id, {
        retries: 0,
        error: undefined,
      });
    }

    await checkPendingItems();

    return syncAll();
  };

  return {
    status,
    syncAll,
    savePending,
    retryFailed,
    checkPendingItems,
  };
}
