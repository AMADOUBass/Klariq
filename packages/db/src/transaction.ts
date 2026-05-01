import { Prisma } from './generated/client';
import { prisma } from './client';

export type TransactionClient = Prisma.TransactionClient;
export type TransactionFn<T> = (tx: TransactionClient) => Promise<T>;

/**
 * Executes a database transaction at SERIALIZABLE isolation level.
 *
 * ALL financial mutations MUST use this helper. SERIALIZABLE isolation prevents:
 *   - phantom reads across concurrent journal entry creation
 *   - lost updates on account balance snapshots
 *   - write skew on period-close checks
 *
 * @throws If the transaction deadlocks after internal retries.
 */
export async function withTransaction<T>(fn: TransactionFn<T>): Promise<T> {
  return prisma.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    maxWait: 5_000,
    timeout: 30_000,
  });
}

/**
 * Read-only query helper — uses READ COMMITTED for performance.
 * Reports and dashboards may use this; mutations must use withTransaction.
 */
export async function withReadonlyTransaction<T>(fn: TransactionFn<T>): Promise<T> {
  return prisma.$transaction(fn, {
    isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
    maxWait: 5_000,
    timeout: 15_000,
  });
}
