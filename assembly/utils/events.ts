export function FeeAmountEnabledEvent(fee: u64, tickSpacing: u64): string {
  return `FeeAmountEnabled:${fee}:${tickSpacing}`;
}

export function PoolCreatedEvent(
  token0: string,
  token1: string,
  fee: u64,
  tickSpacing: u64,
  pool: string,
): string {
  return `PoolCreated:${token0}:${token1}:${fee.toString()}:${tickSpacing.toString()}:${pool}`;
}
