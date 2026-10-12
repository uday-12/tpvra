import { Elysia, t } from "elysia";
import { QuestionService } from "./service";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";
import {
    CreateQuestionDTO,
    BulkCreateQuestionDTO,
    BulkDeleteQuestionDTO,
    UpdateQuestionDTO,
    ListQuestionsQuery,
    PaginatedQuestionResponse,
    SuccessMessageResponse,
    QuestionItem
} from "./model";

export const QuestionAPIs = new Elysia({ name: "QuestionAPIs" })
    .use(Auth)
    .group("/questions", (app) =>
        app
            .get("/", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.listQuestions(query);
            }, {
                query: ListQuestionsQuery,
                response: { "200": PaginatedQuestionResponse },
                detail: {
                    summary: "List questions with pagination and filters",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .get("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                const question = await QuestionService.getById(id);
                if (!question) {
                    throw new Error("Question not found");
                }
                return question;
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": QuestionItem },
                detail: {
                    summary: "Get question by ID",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .post("/", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["create"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.create(body);
            }, {
                body: CreateQuestionDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Create a new question",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .post("/bulk", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["create"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.bulkCreate(body);
            }, {
                body: BulkCreateQuestionDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Bulk create questions",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .patch("/:id", async ({ params: { id }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.update(id, body);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                body: UpdateQuestionDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Update a question",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .delete("/bulk", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["delete"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.bulkDelete(body);
            }, {
                body: BulkDeleteQuestionDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Bulk soft delete questions",
                    tags: ["Questions"],
                },
                auth: true,
            })
            .delete("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            question: ["delete"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await QuestionService.delete(id);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Soft delete a question",
                    tags: ["Questions"],
                },
                auth: true,
            })
    );
