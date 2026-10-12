import { t } from "elysia";
import { QuestionType, RiskRating } from "@/generated/prisma";

export const QuestionTypeSchema = t.Enum(QuestionType, { description: "Type of the question" });
export const RiskRatingSchema = t.Enum(RiskRating, { description: "Risk rating of the question" });

export const OptionSchema = t.Object({
    id: t.Number(),
    option: t.String(),
    sequence: t.Number(),
});

export type Option = typeof OptionSchema.static;

export const ListQuestionsQuery = t.Object({
    searchQuery: t.Optional(t.String({ description: "Search query for question text" })),
    categoryId: t.Optional(t.String({ description: "Filter by Category ID" })),
    questionType: t.Optional(QuestionTypeSchema),
    riskRating: t.Optional(RiskRatingSchema),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, description: "Page number" })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, description: "Items per page" })),
});

export type ListQuestionsQuery = typeof ListQuestionsQuery.static;

export const CreateQuestionDTO = t.Object({
    questionText: t.String({ minLength: 1, error: "Question text is required" }),
    questionType: QuestionTypeSchema,
    riskRating: RiskRatingSchema,
    categoryId: t.String({ error: "Category ID is required" }),
    options: t.Optional(t.Array(OptionSchema)),
    rtv: t.Optional(t.String()),
    recommendation: t.Optional(t.String()),
});

export type CreateQuestionDTO = typeof CreateQuestionDTO.static;

export const BulkCreateQuestionDTO = t.Object({
    questions: t.Array(CreateQuestionDTO)
});

export type BulkCreateQuestionDTO = typeof BulkCreateQuestionDTO.static;

export const BulkDeleteQuestionDTO = t.Object({
    ids: t.Array(t.String(), { minItems: 1 }),
});

export type BulkDeleteQuestionDTO = typeof BulkDeleteQuestionDTO.static;

export const UpdateQuestionDTO = t.Object({
    questionText: t.Optional(t.String({ minLength: 1 })),
    questionType: t.Optional(QuestionTypeSchema),
    riskRating: t.Optional(RiskRatingSchema),
    categoryId: t.Optional(t.String()),
    options: t.Optional(t.Array(OptionSchema)),
    rtv: t.Optional(t.String()),
    recommendation: t.Optional(t.String()),
});

export type UpdateQuestionDTO = typeof UpdateQuestionDTO.static;

export const QuestionItem = t.Object({
    id: t.String(),
    questionText: t.String(),
    questionType: QuestionTypeSchema,
    riskRating: RiskRatingSchema,
    options: t.Union([t.Array(OptionSchema), t.Null()]),
    categoryId: t.String(),
    category: t.Optional(t.Object({
        id: t.String(),
        name: t.String(),
    })),
    createdAt: t.Date(),
    updatedAt: t.Date(),
    rtv: t.Union([t.String(), t.Null()]),
    recommendation: t.Union([t.String(), t.Null()]),
});

export const PaginatedQuestionResponse = t.Object({
    questions: t.Array(QuestionItem),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type PaginatedQuestionResponse = typeof PaginatedQuestionResponse.static;

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;
