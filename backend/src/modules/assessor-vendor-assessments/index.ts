import { Elysia, t } from "elysia";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";
import { AssessorVendorAssessmentService } from "./service";
import {
    CreateAssessorVendorAssessmentDTO,
    ListAssessorVendorAssessmentQuery,
    PaginatedAssessorVendorAssessmentResponse,
    AssessorVendorAssessmentDetailResponse,
    SuccessMessageResponse,
    VendorAssessmentFilterDataResponse,
    SubmitAssessmentDTO,
    OrderSummaryResponse,
    CreateOrderResponse,
    AssessorAssessmentFilterDataResponse,
    AssessorAssessmentReviewResponse,
    UpdateQuestionRiskRatingDTO,
    UpdateAssessorVendorAssessmentDTO,
} from "./model";

export const AssessorVendorAssessmentAPIs = new Elysia({ name: "AssessorVendorAssessmentAPIs" })
    .use(Auth)
    .group("/assessor-vendor-assessments", (app) =>
        app
            .get("/", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessorVendorAssessmentService.list(query);
            }, {
                query: ListAssessorVendorAssessmentQuery,
                response: { "200": PaginatedAssessorVendorAssessmentResponse },
                detail: {
                    summary: "List assessment assignments",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .get("/filters", async ({ query, user }) => {
                // Ensure user is Vendor or Admin (though simplified permission check here)
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"], // Reusing read permission
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                let targetVendorId = query.vendorId;

                // Simple check: if no vendorId provided, assume current user.
                if (!targetVendorId) {
                    targetVendorId = user.id;
                }

                return await AssessorVendorAssessmentService.getFilterData(targetVendorId, query.assessmentName);
            }, {
                query: t.Object({
                    vendorId: t.Optional(t.String()),
                    assessmentName: t.Optional(t.String())
                }),
                response: { "200": VendorAssessmentFilterDataResponse },
                detail: {
                    summary: "Get Vendor Assessment Filter Data",
                    tags: ["AssessorVendorAssessments"]
                },
                auth: true
            })
            .get("/assessor-filters-data", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                // Assessor filter data usually for the logged-in assessor
                return await AssessorVendorAssessmentService.getAssessorFilterData(user.id, query.assessmentName);
            }, {
                query: t.Object({
                    assessmentName: t.Optional(t.String())
                }),
                response: { "200": AssessorAssessmentFilterDataResponse },
                detail: {
                    summary: "Get Assessor Assessment Filter Data",
                    tags: ["AssessorVendorAssessments"]
                },
                auth: true
            })
            .patch("/questions/:questionId/risk-rating", async ({ params: { questionId }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorVendorAssessmentService.updateQuestionRiskRating(questionId, body.assignedRiskRating);
            }, {
                params: t.Object({ questionId: t.String() }),
                body: UpdateQuestionRiskRatingDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Update question risk rating",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .get("/:id/review", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                const result = await AssessorVendorAssessmentService.getAssessmentReview(id);
                if (!result) throw new Error("Assessment not found");
                return result;
            }, {
                params: t.Object({ id: t.String() }),
                response: { "200": AssessorAssessmentReviewResponse },
                detail: {
                    summary: "Get assessment review details",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .get("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                const result = await AssessorVendorAssessmentService.getById(id);
                if (!result) throw new Error("Assignment not found");
                return result;
            }, {
                params: t.Object({ id: t.String() }),
                response: { "200": AssessorVendorAssessmentDetailResponse },
                detail: {
                    summary: "Get assignment details",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .post("/:id/draft", async ({ params: { id }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            // Vendor needs read access to their own assessment to submit.
                            assessorVendorAssessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorVendorAssessmentService.saveDraft(id, user.id, body);
            }, {
                params: t.Object({ id: t.String() }),
                body: SubmitAssessmentDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Save assessment draft",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .get("/:id/order-summary", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            // Vendor needs read access
                            assessorVendorAssessment: ["read"]
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorVendorAssessmentService.orderSummary(id, user.id);
            }, {
                params: t.Object({ id: t.String() }),
                response: { "200": OrderSummaryResponse },
                detail: {
                    summary: "Get order summary for payment",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true
            })
            .post("/:id/create-order", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            // Vendor needs read access
                            assessorVendorAssessment: ["read"]
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorVendorAssessmentService.createOrder(id, user.id, {
                    name: user.name,
                    email: user.email,
                    phone: user.phoneNumber,
                });
            }, {
                params: t.Object({ id: t.String() }),
                response: { "200": CreateOrderResponse },
                detail: {
                    summary: "Create Razorpay Order",
                    tags: ["AssessorVendorAssessments"]
                },
                auth: true
            })
            .post("/", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["create"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessorVendorAssessmentService.create(body);
            }, {
                body: CreateAssessorVendorAssessmentDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Assign assessment to vendor",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .delete("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["delete"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessorVendorAssessmentService.delete(id);
            }, {
                params: t.Object({ id: t.String() }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Delete assignment",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
            .patch("/:id", async ({ params: { id }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessorVendorAssessmentService.update(id, body);
            }, {
                params: t.Object({ id: t.String() }),
                body: UpdateAssessorVendorAssessmentDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Update assignment",
                    tags: ["AssessorVendorAssessments"],
                },
                auth: true,
            })
    );
