import { Elysia, t } from "elysia";
import { Auth } from "../auth";
import { AssessmentService } from "./service";
import {
    CreateAssessmentDTO,
    UpdateAssessmentDTO,
    AssessmentResponse,
    ListAssessmentsQuery,
    PaginatedAssessmentResponse,
    AssessmentDetailResponse,
    SuccessMessageResponse,
} from "./model";
import { auth } from "@/lib/auth";

export const AssessmentAPIs = new Elysia({ name: "AssessmentAPIs" })
    .use(Auth)
    .group("/assessments", (app) =>
        app
            .get("/", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessmentService.list(query);
            }, {
                query: ListAssessmentsQuery,
                response: { "200": PaginatedAssessmentResponse },
                detail: {
                    summary: "List assessments",
                    tags: ["Assessments"],
                },
                auth: true,
            })
            .get("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessment: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                const assessment = await AssessmentService.getById(id);
                if (!assessment) {
                    throw new Error("Assessment not found");
                }
                return assessment;
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": AssessmentDetailResponse },
                detail: {
                    summary: "Get assessment details",
                    tags: ["Assessments"],
                },
                auth: true,
            })
            .post("/", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessment: ["create"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessmentService.create(body);
            }, {
                body: CreateAssessmentDTO,
                response: { "200": AssessmentResponse },
                detail: {
                    summary: "Create a new assessment",
                    tags: ["Assessments"],
                },
                auth: true,
            })
            .patch("/:id", async ({ params: { id }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessment: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessmentService.update(id, body);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                body: UpdateAssessmentDTO,
                response: { "200": AssessmentResponse },
                detail: {
                    summary: "Update an assessment",
                    tags: ["Assessments"],
                },
                auth: true,
            })
            .delete("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            assessment: ["delete"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await AssessmentService.delete(id);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Delete an assessment",
                    tags: ["Assessments"],
                },
                auth: true,
            })
    );
