import { t } from "elysia";
import { AssessmentStatus, RiskRating } from "@/generated/prisma";

export const AssignedAssessmentItem = t.Object({
    id: t.String(),
    status: t.Enum(AssessmentStatus),
    assessmentName: t.String(), // Parent Assessment Title
    vendorName: t.String(),
    vendorId: t.String(),
    questionsSubmitted: t.Number(),
    overallRisk: t.Union([t.Number(), t.Null()]), // 1 (Critical) to 5 (Very Low), or Custom logic
    dueDate: t.Union([t.Date(), t.Null()]),
    submittedAt: t.Union([t.Date(), t.Null()]),
    submittedAssessmentId: t.Union([t.String(), t.Null()]),
});

export const ListAssessorAssessmentsQuery = t.Object({
    searchQuery: t.Optional(t.String({ description: "Search by assessment title or vendor name" })),
    risk: t.Optional(t.String({ description: "Filter by Overall Risk (1-5)" })),
    vendorId: t.Optional(t.String()),
    assessmentId: t.Optional(t.String({ description: "Parent Assessment ID" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const FilterItem = t.Object({
    id: t.String(),
    name: t.String(),
});

export const AssessorFilterDataResponse = t.Object({
    vendors: t.Array(FilterItem),
    assessments: t.Array(FilterItem),
});

export type AssessorFilterDataResponse = typeof AssessorFilterDataResponse.static;

export const PaginatedAssessorAssessmentResponse = t.Object({
    data: t.Array(AssignedAssessmentItem),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type ListAssessorAssessmentsQuery = typeof ListAssessorAssessmentsQuery.static;
