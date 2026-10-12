import { t } from "elysia";
import { ClarificationStatus } from "@/generated/prisma";
import { OptionSchema } from "../questions/model";

export const ClarificationStatusSchema = t.Enum(ClarificationStatus);

export const ListClarificationsQuery = t.Object({
    page: t.Optional(t.Numeric({ minimum: 1, default: 1 })),
    limit: t.Optional(t.Numeric({ minimum: 1, maximum: 100, default: 20 })),
    vendorIds: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    assessorIds: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    assessmentIds: t.Optional(t.Union([t.String(), t.Array(t.String())])),
    fetchBy: t.Optional(t.Union([t.Literal("pending"), t.Literal("submitted")])),
});

export type ListClarificationsQuery = typeof ListClarificationsQuery.static;

export const ClarificationResponse = t.Object({
    id: t.String(),
    clarificationRequested: t.String(),
    questionId: t.String(),
    questionText: t.String(),
    questionOptions: t.Union([t.Array(OptionSchema), t.Null()]),
    assessmentId: t.String(),
    assessmentName: t.String(),
    assessorId: t.String(),
    assessorName: t.String(),
    requestedAt: t.Date(),
    dueDate: t.Union([t.Date(), t.Null()]),
    daysLeft: t.Union([t.Number(), t.Null()]),
    status: ClarificationStatusSchema,
    submittedAnswer: t.Union([t.String(), t.Null()]), // Original Answer
    submittedAnswerFilePath: t.Union([t.String(), t.Null()]), // Original File
    clarificationAnswer: t.Union([t.String(), t.Null()]), // Response to clarification
    clarificationFile: t.Union([t.Object({
        url: t.String(),
        name: t.String()
    }), t.Null()]),
});

export type ClarificationResponse = typeof ClarificationResponse.static;


export const PaginatedClarificationResponse = t.Object({
    clarifications: t.Array(ClarificationResponse),
    totalCount: t.Number(),
    totalPages: t.Number(),
    currentPage: t.Number(),
    hasNextPage: t.Boolean(),
    hasPrevPage: t.Boolean(),
});

export type PaginatedClarificationResponse = typeof PaginatedClarificationResponse.static;



export const ClarificationFilterDataResponse = t.Object({
    pendingCount: t.Number(),
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

export type ClarificationFilterDataResponse = typeof ClarificationFilterDataResponse.static;

export const ClarificationDetailResponse = t.Object({
    id: t.String(),
    questionText: t.String(),
    originalAnswer: t.Union([t.String(), t.Null()]),
    clarificationRequested: t.String(),
    clarificationAnswer: t.Union([t.String(), t.Null()]),
    clarificationFile: t.Union([t.Object({
        id: t.String(),
        name: t.String(),
        url: t.String(),
    }), t.Null()])
});

export type ClarificationDetailResponse = typeof ClarificationDetailResponse.static;


export const SubmitClarificationResponseDTO = t.Object({
    response: t.String({ minLength: 1 }),
    fileId: t.Optional(t.String())
});

export type SubmitClarificationResponseDTO = typeof SubmitClarificationResponseDTO.static;

export const SuccessMessageResponse = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export type SuccessMessageResponse = typeof SuccessMessageResponse.static;

export const CreateClarificationDTO = t.Object({
    assessorVendorAssessmentId: t.String(),
    questionId: t.String(),
    clarificationRequested: t.String({ minLength: 1 }),
    dueDate: t.Optional(t.String()) // Optional Date string
});

export type CreateClarificationDTO = typeof CreateClarificationDTO.static;


