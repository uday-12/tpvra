import { t } from "elysia";
import { AssessmentStatus } from "@/generated/prisma";
import { FilterItem } from "./assessor-model";

export const VendorAssessmentItem = t.Object({
    id: t.String(),
    status: t.Enum(AssessmentStatus),
    assessmentName: t.String(),
    assessorName: t.String(),
    questionsSubmitted: t.Number(),
    overallRisk: t.Union([t.Number(), t.Null()]),
    dueDate: t.Union([t.Date(), t.Null()]),
    submittedAt: t.Union([t.Date(), t.Null()]),
    submittedAssessmentId: t.Union([t.String(), t.Null()]),
});

export const ListVendorAssessmentsQuery = t.Object({
    searchQuery: t.Optional(t.String({ description: "Search by assessment title" })),
    risk: t.Optional(t.String({ description: "Filter by Overall Risk (1-5)" })),
    assessmentId: t.Optional(t.String({ description: "Parent Assessment ID" })),
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
});

export const VendorFilterDataResponse = t.Object({
    assessments: t.Array(FilterItem),
});

export const VendorDashboardStats = t.Object({
    pendingAssessments: t.Number(),
    pendingClarifications: t.Number(),
});

export type VendorDashboardStats = typeof VendorDashboardStats.static;

export type VendorFilterDataResponse = typeof VendorFilterDataResponse.static;

export const PaginatedVendorAssessmentResponse = t.Object({
    data: t.Array(VendorAssessmentItem),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type ListVendorAssessmentsQuery = typeof ListVendorAssessmentsQuery.static;
