/**
 * DEDICATED WEB WORKER FOR CLINICAL DRUG SEARCH & INDEXING (AŞAMA 2)
 *
 * Ana UI thread'ini (60 FPS) kilitlenmeden korur.
 * Ağır metin normalizasyonunu, token posting kesişimlerini ve puanlamayı arka planda yürütür.
 */

import {
  normalizeDrugRecord,
  searchDrugsInDB,
  setMemoryDrugsCache,
  getDrugsByEsdegerGroup,
  type NormalizedDrugRecord,
  type DrugSearchMode,
  type DrugFilterOptions,
  type RawDrugRecord
} from '../db/titckIndexedDB';

export interface WorkerSearchRequest {
  type: 'SEARCH';
  query: string;
  mode?: DrugSearchMode;
  filters?: DrugFilterOptions;
  seq: number;
}

export interface WorkerInitRequest {
  type: 'INIT';
  data: RawDrugRecord[];
}

export interface WorkerEsdegerRequest {
  type: 'ESDEGER';
  esdegerGroup: string;
  seq: number;
}

export type WorkerMessage = WorkerSearchRequest | WorkerInitRequest | WorkerEsdegerRequest;

// Dedicated Web Worker Context
const workerCtx = typeof self !== 'undefined' ? (self as any) : null;

if (workerCtx && typeof workerCtx.postMessage === 'function') {
  workerCtx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data;
    if (!msg) return;

    try {
      if (msg.type === 'INIT') {
        const start = performance.now();
        setMemoryDrugsCache(msg.data);
        const durationMs = Math.round(performance.now() - start);
        workerCtx.postMessage({
          type: 'INIT_COMPLETE',
          success: true,
          durationMs
        });
      } else if (msg.type === 'SEARCH') {
        const start = performance.now();
        const results = await searchDrugsInDB(msg.query, msg.mode || 'all', msg.filters);
        const durationMs = Math.round(performance.now() - start);
        workerCtx.postMessage({
          type: 'SEARCH_RESULTS',
          seq: msg.seq,
          results,
          durationMs
        });
      } else if (msg.type === 'ESDEGER') {
        const results = getDrugsByEsdegerGroup(msg.esdegerGroup);
        workerCtx.postMessage({
          type: 'ESDEGER_RESULTS',
          seq: msg.seq,
          results
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      workerCtx.postMessage({
        type: 'ERROR',
        error: errMsg
      });
    }
  };
}
