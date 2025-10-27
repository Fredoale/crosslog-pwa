import Dexie, { type Table } from 'dexie';
import type { Entrega, CapturaData, PDFGenerado, SyncQueueItem, FotoCapturada } from '../types';

// Extend Dexie class for type safety
export class CrosslogDB extends Dexie {
  entregas!: Table<Entrega, string>;
  capturas!: Table<CapturaData, string>;
  fotos!: Table<FotoCapturada & { entregaId: string }, string>;
  pdfs!: Table<PDFGenerado, string>;
  syncQueue!: Table<SyncQueueItem, string>;

  constructor() {
    super('CrosslogDatabase');

    this.version(1).stores({
      entregas: 'id, hdr, numeroRemito, estado, synced, fechaActualizacion',
      capturas: 'entregaId, timestamp',
      fotos: 'id, entregaId, timestamp, processed',
      pdfs: 'id, entregaId, uploaded, timestamp',
      syncQueue: 'id, type, retries, lastAttempt',
    });
  }

  // Helper methods
  async clearOldData(daysOld: number = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    const cutoffString = cutoffDate.toISOString();

    // Delete synced entregas older than cutoff
    await this.entregas
      .where('synced')
      .equals(1)
      .and((item) => item.fechaActualizacion < cutoffString)
      .delete();

    // Delete uploaded PDFs older than cutoff
    await this.pdfs
      .where('uploaded')
      .equals(1)
      .and((item) => item.timestamp < cutoffString)
      .delete();

    // Delete processed fotos older than cutoff
    await this.fotos
      .where('processed')
      .equals(1)
      .and((item) => item.timestamp < cutoffString)
      .delete();

    console.log(`[DB] Cleaned data older than ${daysOld} days`);
  }

  async getStorageSize(): Promise<number> {
    if (!navigator.storage || !navigator.storage.estimate) {
      return 0;
    }

    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }

  async requestPersistentStorage(): Promise<boolean> {
    if (!navigator.storage || !navigator.storage.persist) {
      return false;
    }

    const isPersisted = await navigator.storage.persist();
    console.log(`[DB] Persistent storage: ${isPersisted}`);
    return isPersisted;
  }
}

// Create singleton instance
export const db = new CrosslogDB();

// Initialize persistent storage on load
db.requestPersistentStorage();

// Clean old data on startup
db.clearOldData(7).catch((error) => {
  console.error('[DB] Error cleaning old data:', error);
});
