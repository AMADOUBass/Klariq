import { z } from 'zod';
/** UUID v4 string */
export declare const UuidSchema: z.ZodString;
/** ISO 8601 date string (YYYY-MM-DD) */
export declare const DateStringSchema: z.ZodString;
/** Positive integer */
export declare const PositiveIntSchema: z.ZodNumber;
/** Pagination query params */
export declare const PaginationSchema: z.ZodObject<{
    page: z.ZodDefault<z.ZodNumber>;
    limit: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    page: number;
}, {
    limit?: number | undefined;
    page?: number | undefined;
}>;
export type PaginationParams = z.infer<typeof PaginationSchema>;
/** Standard paginated response envelope */
export declare const PaginatedSchema: <T extends z.ZodTypeAny>(itemSchema: T) => z.ZodObject<{
    data: z.ZodArray<T, "many">;
    total: z.ZodNumber;
    page: z.ZodNumber;
    limit: z.ZodNumber;
    totalPages: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    data: T["_output"][];
    limit: number;
    page: number;
    total: number;
    totalPages: number;
}, {
    data: T["_input"][];
    limit: number;
    page: number;
    total: number;
    totalPages: number;
}>;
/** Standard API success response */
export declare const SuccessResponseSchema: <T extends z.ZodTypeAny>(dataSchema: T) => z.ZodObject<{
    success: z.ZodLiteral<true>;
    data: T;
}, "strip", z.ZodTypeAny, z.objectUtil.addQuestionMarks<z.baseObjectOutputType<{
    success: z.ZodLiteral<true>;
    data: T;
}>, any> extends infer T_1 ? { [k in keyof T_1]: T_1[k]; } : never, z.baseObjectInputType<{
    success: z.ZodLiteral<true>;
    data: T;
}> extends infer T_2 ? { [k_1 in keyof T_2]: T_2[k_1]; } : never>;
/** Standard API error response */
export declare const ErrorResponseSchema: z.ZodObject<{
    success: z.ZodLiteral<false>;
    error: z.ZodObject<{
        code: z.ZodString;
        message: z.ZodString;
        details: z.ZodOptional<z.ZodUnknown>;
    }, "strip", z.ZodTypeAny, {
        code: string;
        message: string;
        details?: unknown;
    }, {
        code: string;
        message: string;
        details?: unknown;
    }>;
}, "strip", z.ZodTypeAny, {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    success: false;
}, {
    error: {
        code: string;
        message: string;
        details?: unknown;
    };
    success: false;
}>;
//# sourceMappingURL=index.d.ts.map