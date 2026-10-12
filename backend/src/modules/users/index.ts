import { Elysia, t } from "elysia";
import { UsersService } from "./service";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";
import { SuccessMessageResponse } from "./model";
import { UserStatus } from "@/generated/prisma";

export const UsersAPIs = new Elysia({ name: "UsersAPIs" })
    .use(Auth)
    .group("/users", (app) =>
        app
            .get("/", async ({ query: { page, limit, role, status, search }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            user: ["list"],
                        },
                    },
                });

                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }

                return await UsersService.listUsers({
                    page: page ? parseInt(page) : 1,
                    limit: limit ? parseInt(limit) : 10,
                    role,
                    status,
                    search,
                });
            }, {
                query: t.Object({
                    page: t.Optional(t.String()),
                    limit: t.Optional(t.String()),
                    role: t.Optional(t.String()),
                    status: t.Optional(t.Enum(UserStatus)),
                    search: t.Optional(t.String()),
                }),
                detail: {
                    summary: "List users",
                    tags: ["Users"],
                },
                auth: true,
            })
            .post("/:id/approve", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            user: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await UsersService.approveUser(id);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Approve a user",
                    tags: ["Users"],
                },
                auth: true,
            })
            .post("/:id/reject", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            user: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await UsersService.rejectUser(id);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Reject a user",
                    tags: ["Users"],
                },
                auth: true,
            })
    );
