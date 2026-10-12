import { t } from "elysia";
import { RiskRating } from "@/generated/prisma";

export const StatsCount = t.Object({
    total: t.Number(),
    active: t.Number(),
    inactive: t.Number(),
});

export const AssessorVendorAssessmentStats = t.Object({
    assigned: t.Number(),
    inProgress: t.Number(),
    submitted: t.Number(),
    total: t.Number(),
});

export const AdminDashboardStats = t.Object({
    assessors: StatsCount,
    vendors: StatsCount,
    assessments: AssessorVendorAssessmentStats,
});

export const QuestionMetricItem = t.Object({
    id: t.String(),
    title: t.String(),
    categoryName: t.String(),
    defaultRisk: t.Optional(t.Enum(RiskRating)),
    assignedRisk: t.Union([t.Enum(RiskRating), t.Null()]),
    rtv: t.Union([t.String(), t.Null()]),
    recommendation: t.Union([t.String(), t.Null()]),
});

export const CategoryRiskItem = t.Object({
    categoryName: t.String(),
    averageScore: t.Number(), // Rounded integer
});

export const AssessmentReviewResponse = t.Object({
    overallScore: t.Union([t.Number(), t.Null()]), // From AssessorVendorAssessment
    riskByCategory: t.Array(CategoryRiskItem),
    questions: t.Array(QuestionMetricItem),
});

export type AssessmentReviewResponse = typeof AssessmentReviewResponse.static;
