import { Elysia, t } from "elysia";
import { ClarificationService } from "./service";
import { ListClarificationsQuery, PaginatedClarificationResponse, ClarificationFilterDataResponse, SubmitClarificationResponseDTO, SuccessMessageResponse, ClarificationDetailResponse, CreateClarificationDTO } from "./model";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";


export const ClarificationAPIs = new Elysia({ prefix: "/clarifications" })
    .use(Auth)
    .get("/", async ({ query, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    clarification: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        return ClarificationService.list(query);
    }, {
        query: ListClarificationsQuery,
        response: PaginatedClarificationResponse,
        auth: true,
        detail: {
            tags: ["Clarifications"],
            summary: "List clarifications with filters"
        }
    })
    .get("/filters", async ({ query, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    clarification: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        let targetVendorId = query.vendorId;
        const targetAssessorId = query.assessorId;

        // Default to current user as vendor if no filters provided
        if (!targetVendorId && !targetAssessorId) {
            targetVendorId = user.id;
        }

        return ClarificationService.getFilterData({
            vendorId: targetVendorId,
            assessorId: targetAssessorId,
            assessmentName: query.assessmentName
        });
    }, {
        query: t.Object({
            vendorId: t.Optional(t.String()),
            assessorId: t.Optional(t.String()),
            assessmentName: t.Optional(t.String())
        }),
        response: ClarificationFilterDataResponse,
        auth: true,
        detail: {
            tags: ["Clarifications"],
            summary: "Get Clarification Filter Data"
        }
    })
    .post("/request", async ({ body, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    clarification: ["create"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        return ClarificationService.createRequest(user.id, body);
    }, {
        body: CreateClarificationDTO,
        response: SuccessMessageResponse,
        auth: true,
        detail: {
            tags: ["Clarifications"],
            summary: "Create a clarification request"
        }
    })
    .post("/:id/submit", async ({ params: { id }, body, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    clarification: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        return ClarificationService.submitResponse(id, user.id, body);
    }, {
        params: t.Object({ id: t.String() }),
        body: SubmitClarificationResponseDTO,
        response: SuccessMessageResponse,
        auth: true,
        detail: {
            tags: ["Clarifications"],
            summary: "Submit response to a clarification"
        }
    })
    .get("/:id/submitted-response", async ({ params: { id }, user }) => {
        const hasPermission = await auth.api.userHasPermission({
            body: {
                userId: user.id,
                permissions: {
                    clarification: ["read"],
                },
            },
        });

        if (!hasPermission.success) {
            throw new Error("Unauthorized");
        }

        const result = await ClarificationService.getDetails(id);
        if (!result) throw new Error("Clarification not found");

        return result;
    }, {
        params: t.Object({ id: t.String() }),
        response: ClarificationDetailResponse,
        auth: true,
        detail: {
            tags: ["Clarifications"],
            summary: "Get clarification details with answer"
        }
    });
