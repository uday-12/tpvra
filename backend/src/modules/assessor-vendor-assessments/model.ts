import { t } from "elysia";
import { AssessmentStatus, RiskRating } from "@/generated/prisma";
import { QuestionType } from "@/generated/prisma";
import { QuestionItem, OptionSchema } from "../questions/model";

export const AssessmentStatusSchema = t.Enum(AssessmentStatus);

export const QuestionTypeSchema = t.Enum(QuestionType);

export const QuestionAnswerDTO = t.Object({
    questionId: t.String(),
    questionType: QuestionTypeSchema,
    answer: t.Optional(t.String()),
    answerExplanation: t.Optional(t.String()),
    fileId: t.Optional(t.String()), // For FILE_UPLOAD type
    supportingFileId: t.Optional(t.String()), // Additional support file
    selectedOptions: t.Optional(t.Array(t.String())), // For Multi-choice
});

export const SubmitAssessmentDTO = t.Object({
    answers: t.Array(QuestionAnswerDTO)
});

export type SubmitAssessmentDTO = typeof SubmitAssessmentDTO.static;

export const OrderSummaryResponse = t.Object({
    amount: t.Number(),
    currency: t.String({ default: "INR" }),
    assessmentId: t.String(),
    assessmentTitle: t.String(),
});

export const CreateOrderResponse = t.Object({
    orderId: t.String(),
    amount: t.Number(),
    currency: t.String(),
    keyId: t.String(),
    vendorName: t.String(),
    vendorEmail: t.String(),
    vendorPhone: t.Optional(t.String()),
});

export const CreateAssessorVendorAssessmentDTO = t.Object({
    assessorId: t.String({ description: "Assessor User ID" }),
    vendorId: t.String({ description: "Vendor User ID" }),
    assessmentId: t.String({ description: "Parent Assessment ID" }),
    amount: t.Optional(t.Numeric({ minimum: 0, default: 0 })),
    dueDate: t.Optional(t.String({ format: "date-time", description: "Due Date" })),
}, { description: "DTO for creating an assignment" });

export type CreateAssessorVendorAssessmentDTO = typeof CreateAssessorVendorAssessmentDTO.static;

export const UpdateAssessorVendorAssessmentDTO = t.Object({
    assessorId: t.Optional(t.String({ description: "Assessor User ID" })),
    vendorId: t.Optional(t.String({ description: "Vendor User ID" })),
    assessmentId: t.Optional(t.String({ description: "Parent Assessment ID" })),
    amount: t.Optional(t.Numeric({ minimum: 0 })),
    dueDate: t.Optional(t.String({ format: "date-time", description: "Due Date" })),
}, { description: "DTO for updating an assignment" });

export type UpdateAssessorVendorAssessmentDTO = typeof UpdateAssessorVendorAssessmentDTO.static;

export const ListAssessorVendorAssessmentQuery = t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    assessorId: t.Optional(t.String()), // Keep for backward compatibility or single filter
    vendorId: t.Optional(t.String()),
    status: t.Optional(AssessmentStatusSchema), // Keep for backward compatibility

    // New Filters
    assessmentName: t.Optional(t.String()),
    assessorIds: t.Optional(t.Union([t.String(), t.Array(t.String())])), // Handle likely comma-separated string or array in query
    vendorIds: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    statuses: t.Optional(t.Union([t.String(), t.Array(AssessmentStatusSchema)])),
    assessmentIds: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    fetchBy: t.Optional(t.Union([t.Literal("pending"), t.Literal("submitted")])),
});

export type ListAssessorVendorAssessmentQuery = typeof ListAssessorVendorAssessmentQuery.static;

export const AssessorVendorAssessmentResponse = t.Object({
    id: t.String(),
    assessorId: t.String(),
    vendorId: t.String(),
    parentAssessmentId: t.Union([t.String(), t.Null()]),
    status: AssessmentStatusSchema,
    createdAt: t.Date(),
    updatedAt: t.Date(),
    dueDate: t.Union([t.Date(), t.Null()]),
    daysLeft: t.Union([t.Number(), t.Null()]),
    assignedDate: t.Date(),
    amount: t.Number(),
    submittedAssessmentId: t.Union([t.String(), t.Null()]),
    assessor: t.Optional(t.Object({
        id: t.String(),
        name: t.String(),
        email: t.String(),
    })),
    vendor: t.Optional(t.Object({
        id: t.String(),
        name: t.String(),
        email: t.String(),
    })),
    parentAssessment: t.Optional(t.Object({
        id: t.String(),
        title: t.String(),
    })),
});

export type AssessorVendorAssessmentResponse = typeof AssessorVendorAssessmentResponse.static;

export const PaginatedAssessorVendorAssessmentResponse = t.Object({
    assignments: t.Array(AssessorVendorAssessmentResponse),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type PaginatedAssessorVendorAssessmentResponse = typeof PaginatedAssessorVendorAssessmentResponse.static;

export const AssessorVendorAssessmentDetailResponse = t.Object({
    id: t.String(),
    assessorId: t.String(),
    vendorId: t.String(),
    parentAssessmentId: t.Union([t.String(), t.Null()]),
    status: AssessmentStatusSchema,
    createdAt: t.Date(),
    updatedAt: t.Date(),
    dueDate: t.Union([t.Date(), t.Null()]),
    amount: t.Number(),
    parentAssessment: t.Union([t.Object({
        id: t.String(),
        title: t.String(),
        questionsCount: t.Number(),
        questions: t.Array(QuestionItem),
    }), t.Null()]),
});

export type AssessorVendorAssessmentDetailResponse = typeof AssessorVendorAssessmentDetailResponse.static;

export const VendorAssessmentFilterDataResponse = t.Object({
    pendingCount: t.Number(), // In Progress or Pending
    submittedCount: t.Number(),
    statusCounts: t.Array(t.Object({
        status: t.String(),
        count: t.Number()
    })),
    assessorCounts: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        count: t.Number()
    })),
    assessmentCounts: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        count: t.Number()
    })),
});

export type VendorAssessmentFilterDataResponse = typeof VendorAssessmentFilterDataResponse.static;

export const AssessorAssessmentFilterDataResponse = t.Object({
    pendingCount: t.Number(), // In Progress or Pending
    submittedCount: t.Number(),
    statusCounts: t.Array(t.Object({
        status: t.String(),
        count: t.Number()
    })),
    vendorCounts: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        count: t.Number()
    })),
    assessmentCounts: t.Array(t.Object({
        id: t.String(),
        name: t.String(),
        count: t.Number()
    })),
});

export type AssessorAssessmentFilterDataResponse = typeof AssessorAssessmentFilterDataResponse.static;

export const RiskRatingSchema = t.Enum(RiskRating);

export const AssessorAssessmentReviewResponse = t.Object({
    id: t.String(),
    vendorName: t.String(),
    submittedAt: t.Union([t.Date(), t.Null()]),
    questions: t.Array(t.Object({
        questionId: t.String(),
        questionText: t.String(),
        questionType: QuestionTypeSchema,
        options: t.Optional(t.Union([t.Array(OptionSchema), t.Null()])),
        answer: t.String(),
        answerFile: t.Union([t.Object({
            url: t.String(),
            name: t.String(),
            id: t.String(),
        }), t.Null()]),
        explanation: t.Union([t.String(), t.Null()]),
        supportingFile: t.Union([t.Object({
            url: t.String(),
            name: t.String(),
            s3_key: t.String(),
            id: t.String(),
        }), t.Null()]),
        riskRating: t.String(), // Vendor's risk rating
        assignedRiskRating: t.Union([t.String(), t.Null()]), // Assessor's assigned risk rating
        createdAt: t.Date(),
        updatedAt: t.Date(),
    }))
});

export type AssessorAssessmentReviewResponse = typeof AssessorAssessmentReviewResponse.static;

export const UpdateQuestionRiskRatingDTO = t.Object({
    assignedRiskRating: RiskRatingSchema
});

export type UpdateQuestionRiskRatingDTO = typeof UpdateQuestionRiskRatingDTO.static;

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;

export const SubmittedAssessmentResponse = t.Object({
    id: t.String(),
    assessorName: t.String(),
    submittedAt: t.Union([t.Date(), t.Null()]),
    questions: t.Array(t.Object({
        questionText: t.String(),
        answer: t.String(), // Or empty string
        answerFile: t.Union([t.Object({
            url: t.String(),
            name: t.String()
        }), t.Null()]),
        explanation: t.Union([t.String(), t.Null()]),
        supportingFile: t.Union([t.Object({
            url: t.String(),
            name: t.String()
        }), t.Null()]),
        riskRating: t.String(), // RiskRating enum string
    }))
});

export type SubmittedAssessmentResponse = typeof SubmittedAssessmentResponse.static;
