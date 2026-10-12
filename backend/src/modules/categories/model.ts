import { t } from "elysia";

// --- QUERY SCHEMAS ---

export const ListCategoriesQuery = t.Object({
    searchQuery: t.Optional(t.String({ description: "Search query for category name" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, description: "Page number" })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, description: "Items per page" })),
});

export type ListCategoriesQuery = typeof ListCategoriesQuery.static;

// --- DTO SCHEMAS ---

export const CreateCategoryDTO = t.Object({
    name: t.String({ minLength: 1, error: "Name is required" }),
});

export type CreateCategoryDTO = typeof CreateCategoryDTO.static;

export const UpdateCategoryDTO = t.Object({
    name: t.Optional(t.String({ minLength: 1 })),
});

export type UpdateCategoryDTO = typeof UpdateCategoryDTO.static;

// --- RESPONSE SCHEMAS ---

// We define Category definition here since we can't access generated ones easily
export const CategoryItem = t.Object({
    id: t.String(),
    name: t.String(),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    questionsCount: t.Number(),
    // deletedAt is usually internal/filtered out, but if needed:
    // deletedAt: t.Union([t.Date(), t.Null()]),
});

export const PaginatedCategoryResponse = t.Object({
    categories: t.Array(CategoryItem),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type PaginatedCategoryResponse = typeof PaginatedCategoryResponse.static;

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;
