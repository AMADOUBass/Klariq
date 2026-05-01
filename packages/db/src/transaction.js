"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withTransaction = withTransaction;
exports.withReadonlyTransaction = withReadonlyTransaction;
const client_1 = require("@prisma/client");
const client_2 = require("./client");
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
async function withTransaction(fn) {
    return client_2.prisma.$transaction(fn, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5_000,
        timeout: 30_000,
    });
}
/**
 * Read-only query helper — uses READ COMMITTED for performance.
 * Reports and dashboards may use this; mutations must use withTransaction.
 */
async function withReadonlyTransaction(fn) {
    return client_2.prisma.$transaction(fn, {
        isolationLevel: client_1.Prisma.TransactionIsolationLevel.ReadCommitted,
        maxWait: 5_000,
        timeout: 15_000,
    });
}
//# sourceMappingURL=transaction.js.map