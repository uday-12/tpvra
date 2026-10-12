import { Elysia, t } from "elysia";
import { DashboardService } from "./service";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";
import { AdminDashboardStats, AssessmentReviewResponse } from "./model";
import { AssessorDashboardService } from "./assessor-service";
import { ListAssessorAssessmentsQuery, PaginatedAssessorAssessmentResponse, AssessorFilterDataResponse } from "./assessor-model";
import { VendorDashboardService } from "./vendor-service";
import { ListVendorAssessmentsQuery, PaginatedVendorAssessmentResponse, VendorFilterDataResponse, VendorDashboardStats } from "./vendor-model";

export const DashboardAPIs = new Elysia({ name: "DashboardAPIs" })
    .use(Auth)
    .group("/dashboard", (app) =>
        app
            .get("/admin", async ({ user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            account: ["read"]
                        },
                    },
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await DashboardService.getAdminStats();
            }, {
                response: { "200": AdminDashboardStats },
                detail: {
                    summary: "Get Admin Dashboard Statistics",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/assessor/assessments", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorDashboardService.listAssignedAssessments(user.id, query);
            }, {
                query: ListAssessorAssessmentsQuery,
                response: { "200": PaginatedAssessorAssessmentResponse },
                detail: {
                    summary: "List assigned assessments for Assessor",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/assessor/filters", async ({ user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await AssessorDashboardService.getFilterData(user.id);
            }, {
                response: { "200": AssessorFilterDataResponse },
                detail: {
                    summary: "Get filter options for Assessor Dashboard",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/assessment-metrics/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await DashboardService.getReviewMetrics(id);
            }, {
                params: t.Object({
                    id: t.String()
                }),
                response: { "200": AssessmentReviewResponse },
                detail: {
                    summary: "Get assessment review metrics",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/vendor/stats", async ({ user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"],
                            clarification: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await VendorDashboardService.getVendorStats(user.id);
            }, {
                response: { "200": VendorDashboardStats },
                detail: {
                    summary: "Get pending stats for Vendor Dashboard",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/vendor/assessments", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await VendorDashboardService.listVendorAssessments(user.id, query);
            }, {
                query: ListVendorAssessmentsQuery,
                response: { "200": PaginatedVendorAssessmentResponse },
                detail: {
                    summary: "List assigned assessments for Vendor",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
            .get("/vendor/filters", async ({ user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessorVendorAssessment: ["read"]
                        }
                    }
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await VendorDashboardService.getFilterData(user.id);
            }, {
                response: { "200": VendorFilterDataResponse },
                detail: {
                    summary: "Get filter options for Vendor Dashboard",
                    tags: ["Dashboard"],
                },
                auth: true,
            })
    );
