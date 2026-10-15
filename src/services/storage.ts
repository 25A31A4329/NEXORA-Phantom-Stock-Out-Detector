import { DatasetState, DetectionWeights } from '../types';
import { generateDemoDataset } from './demoData';
import { DEFAULT_DETECTION_WEIGHTS } from './detectionEngine';

const STORAGE_KEYS = {
  DATASET: 'nexora_dataset_v2', // Updated to v2 for Indian Rupees currency conversion
  VERIFICATIONS: 'nexora_verifications_v1',
  WEIGHTS: 'nexora_weights_v1',
  CONFIG: 'nexora_config_v1',
};

export interface VerificationRecord {
  status: 'pending' | 'verified_stockout' | 'false_alarm' | 'needs_recheck';
  notes?: string;
  verifiedAt?: string;
  verifiedBy?: string;
}

export function loadStoredDataset(): DatasetState {
  try {
    // Purge legacy v1 USD dataset to ensure clean INR values
    if (typeof localStorage !== 'undefined' && localStorage.getItem('nexora_dataset_v1')) {
      localStorage.removeItem('nexora_dataset_v1');
    }

    const raw = localStorage.getItem(STORAGE_KEYS.DATASET);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.sales && parsed.sales.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Error loading stored dataset, defaulting to demo:', e);
  }
  return generateDemoDataset();
}

export function saveDataset(dataset: DatasetState): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DATASET, JSON.stringify(dataset));
  } catch (e) {
    console.warn('Dataset too large for localStorage, keeping in session memory', e);
  }
}

export function clearStoredDataset(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DATASET);
  } catch (e) {
    console.error(e);
  }
}

export function loadStoredVerifications(): Record<string, VerificationRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.VERIFICATIONS);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Error loading stored verifications:', e);
  }
  return {};
}

export function saveVerification(
  caseId: string,
  record: VerificationRecord
): Record<string, VerificationRecord> {
  const current = loadStoredVerifications();
  current[caseId] = record;
  try {
    localStorage.setItem(STORAGE_KEYS.VERIFICATIONS, JSON.stringify(current));
  } catch (e) {
    console.error('Error saving verification to localStorage:', e);
  }
  return current;
}

export function loadStoredWeights(): DetectionWeights {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.WEIGHTS);
    if (raw) {
      return { ...DEFAULT_DETECTION_WEIGHTS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.error('Error loading stored weights:', e);
  }
  return DEFAULT_DETECTION_WEIGHTS;
}

export function saveStoredWeights(weights: DetectionWeights): void {
  try {
    localStorage.setItem(STORAGE_KEYS.WEIGHTS, JSON.stringify(weights));
  } catch (e) {
    console.error('Error saving weights:', e);
  }
}

export function resetAllStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEYS.DATASET);
    localStorage.removeItem('nexora_dataset_v1');
    localStorage.removeItem(STORAGE_KEYS.VERIFICATIONS);
    localStorage.removeItem(STORAGE_KEYS.WEIGHTS);
  } catch (e) {
    console.error(e);
  }
}
