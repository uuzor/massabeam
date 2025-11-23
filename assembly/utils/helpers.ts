import { POOL_STORAGE_PREFIX } from '../storage/factory';

export function _build_pool_key(
  tokenA: string,
  tokenB: string,
  fee: u64,
): string {
  return `${POOL_STORAGE_PREFIX}_${tokenA}_${tokenB}_${fee}`;
}
