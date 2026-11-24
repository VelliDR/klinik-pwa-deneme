/**
 * DEDICATED WEB WORKER FOR CLINICAL DRUG SEARCH & INDEXING (AŞAMA 2)
 *
 * Ana UI thread'ini (60 FPS) kilitlenmeden korur.
 * Ağır metin normalizasyonunu, token posting kesişimlerini ve puanlamayı arka planda yürütür.
 */

import {
  searchDrugsInDB,
  setMemoryDrugsCache,
  getDrugsByEsdegerGroup,
  findEquivalentsInCatalog,
  isDrugCatalogReady,
  ensureDrugCatalogReady,
  type DrugSearchMode,
  type DrugFilterOptions,
  type DrugEquivalentQuery,
  type RawDrugRecord
} from '../db/titckIndexedDB';
import {
  ensureIcd10DictionaryReady,
  setIcd10DictionaryCache
} from '../engines/icd10DictionaryEngine';
import type { AtcIcd10DictionaryData } from '../types/clinical';

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
  icd10Data?: AtcIcd10DictionaryData | null;
  initSeq?: number;
}

export interface WorkerSyncIcd10Request {
  type: 'SYNC_ICD10';
  icd10Data: AtcIcd10DictionaryData;
}

export interface WorkerEsdegerRequest {
  type: 'ESDEGER';
  esdegerGroup: string;
  seq: number;
}

export interface WorkerEquivalentsRequest {
  type: 'FIND_EQUIVALENTS';
  drug: DrugEquivalentQuery;
  seq: number;
}

export type WorkerMessage =
  | WorkerSearchRequest
  | WorkerInitRequest
  | WorkerSyncIcd10Request
  | WorkerEsdegerRequest
  | WorkerEquivalentsRequest;

// Dedicated Web Worker Context
const workerCtx = typeof self !== 'undefined' ? (self as any) : null;

if (workerCtx && typeof workerCtx.postMessage === 'function') {
  workerCtx.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const msg = event.data;
    if (!msg) return;

    try {
      if (msg.type === 'INIT') {
        const start = performance.now();
        const isValid = Array.isArray(msg.data) && msg.data.length > 0;
        if (isValid) {
          setMemoryDrugsCache(msg.data);
          if (msg.icd10Data) {
            setIcd10DictionaryCache(msg.icd10Data);
          } else {
            void ensureIcd10DictionaryReady();
          }
        }
        const durationMs = Math.round(performance.now() - start);
        workerCtx.postMessage({
          type: 'INIT_COMPLETE',
          success: isValid,
          initSeq: msg.initSeq,
          count: isValid ? msg.data.length : 0,
          durationMs
        });
      } else if (msg.type === 'SYNC_ICD10') {
        if (msg.icd10Data) {
          setIcd10DictionaryCache(msg.icd10Data);
        }
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
        if (!isDrugCatalogReady()) {
          await ensureDrugCatalogReady();
        }
        const results = getDrugsByEsdegerGroup(msg.esdegerGroup);
        workerCtx.postMessage({
          type: 'ESDEGER_RESULTS',
          seq: msg.seq,
          results
        });
      } else if (msg.type === 'FIND_EQUIVALENTS') {
        const start = performance.now();
        const results = await findEquivalentsInCatalog(msg.drug);
        const durationMs = Math.round(performance.now() - start);
        workerCtx.postMessage({
          type: 'EQUIVALENTS_RESULTS',
          seq: msg.seq,
          results,
          durationMs
        });
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      workerCtx.postMessage({
        type: 'ERROR',
        seq: 'seq' in msg ? msg.seq : undefined,
        requestType: msg.type,
        error: errMsg
      });
    }
  };
}
