import { t } from "elysia";
import { QuestionItem } from "../questions/model";

export const CreateAssessmentDTO = t.Object({
    title: t.String({ minLength: 1, error: "Title is required" }),
    questionIds: t.Array(t.String(), { minItems: 1, error: "At least one question is required" }),
}, { description: "Data transfer object for creating an assessment" });

export type CreateAssessmentDTO = typeof CreateAssessmentDTO.static;

export const UpdateAssessmentDTO = t.Object({
    title: t.Optional(t.String({ minLength: 1 })),
    questionIds: t.Optional(t.Array(t.String(), { minItems: 1 })),
}, { description: "Data transfer object for updating an assessment" });

export type UpdateAssessmentDTO = typeof UpdateAssessmentDTO.static;

export const AssessmentResponse = t.Object({
    id: t.String(),
    title: t.String(),
    questionsCount: t.Number(),
    createdAt: t.Date(),
});

export type AssessmentResponse = typeof AssessmentResponse.static;

export const ListAssessmentsQuery = t.Object({
    searchQuery: t.Optional(t.String({ description: "Search query for assessment title" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1, description: "Page number" })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20, description: "Items per page" })),
});

export type ListAssessmentsQuery = typeof ListAssessmentsQuery.static;

export const AssessmentDetailResponse = t.Object({
    id: t.String(),
    title: t.String(),
    questionsCount: t.Number(),
    createdAt: t.Date(),
    questions: t.Array(QuestionItem),
});

export type AssessmentDetailResponse = typeof AssessmentDetailResponse.static;

export const PaginatedAssessmentResponse = t.Object({
    assessments: t.Array(AssessmentResponse),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type PaginatedAssessmentResponse = typeof PaginatedAssessmentResponse.static;

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;
