"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorResponseSchema = exports.SuccessResponseSchema = exports.PaginatedSchema = exports.PaginationSchema = exports.PositiveIntSchema = exports.DateStringSchema = exports.UuidSchema = void 0;
const zod_1 = require("zod");
// ─── Primitive schemas shared across API boundaries ───────────────────────────
/** UUID v4 string */
exports.UuidSchema = zod_1.z.string().uuid();
/** ISO 8601 date string (YYYY-MM-DD) */
exports.DateStringSchema = zod_1.z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format');
/** Positive integer */
exports.PositiveIntSchema = zod_1.z.number().int().positive();
/** Pagination query params */
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
});
/** Standard paginated response envelope */
const PaginatedSchema = (itemSchema) => zod_1.z.object({
    data: zod_1.z.array(itemSchema),
    total: zod_1.z.number().int().nonnegative(),
    page: zod_1.z.number().int().positive(),
    limit: zod_1.z.number().int().positive(),
    totalPages: zod_1.z.number().int().nonnegative(),
});
exports.PaginatedSchema = PaginatedSchema;
/** Standard API success response */
const SuccessResponseSchema = (dataSchema) => zod_1.z.object({
    success: zod_1.z.literal(true),
    data: dataSchema,
});
exports.SuccessResponseSchema = SuccessResponseSchema;
/** Standard API error response */
exports.ErrorResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    error: zod_1.z.object({
        code: zod_1.z.string(),
        message: zod_1.z.string(),
        details: zod_1.z.unknown().optional(),
    }),
});
//# sourceMappingURL=index.js.map