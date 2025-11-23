import { MapManager } from '@massalabs/massa-as-sdk';
import { PersistentMap } from '../utils/collections/persistentMap';

export const feeAmountTickSpacing = new PersistentMap<u64, u64>(
  'feeAmountTickSpacing',
);
export const POOL_STORAGE_PREFIX = 'pool';
