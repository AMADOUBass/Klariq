"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
const adapter_pg_1 = require("@prisma/adapter-pg");
const pg_1 = require("pg");
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const isDev = process.env['NODE_ENV'] === 'development';
const pool = new pg_1.Pool({ connectionString: process.env['DATABASE_URL'] });
const adapter = new adapter_pg_1.PrismaPg(pool);
exports.prisma = globalForPrisma.prisma ??
    new client_1.PrismaClient({
        adapter,
        log: isDev
            ? [
                { emit: 'stdout', level: 'query' },
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ]
            : [
                { emit: 'stdout', level: 'warn' },
                { emit: 'stdout', level: 'error' },
            ],
    });
if (isDev) {
    globalForPrisma.prisma = exports.prisma;
}
//# sourceMappingURL=client.js.map