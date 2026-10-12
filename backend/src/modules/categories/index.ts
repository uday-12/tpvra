import { Elysia, t } from "elysia";
import { CategoryService } from "./service";
import { Auth } from "../auth";
import { auth } from "@/lib/auth";
import {
    CreateCategoryDTO,
    UpdateCategoryDTO,
    ListCategoriesQuery,
    PaginatedCategoryResponse,
    SuccessMessageResponse,
    CategoryItem
} from "./model";

export const CategoryAPIs = new Elysia({ name: "CategoryAPIs" })
    .use(Auth)
    .group("/categories", (app) =>
        app
            .get("/", async ({ query, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            category: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await CategoryService.listCategories(query);
            }, {
                query: ListCategoriesQuery,
                response: { "200": PaginatedCategoryResponse },
                detail: {
                    summary: "List categories with pagination",
                    tags: ["Categories"],
                },
                auth: true,
            })
            .get("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            category: ["read"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                const category = await CategoryService.getById(id);
                if (!category) {
                    throw new Error("Category not found");
                }
                return category;
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": CategoryItem },
                detail: {
                    summary: "Get category by ID",
                    tags: ["Categories"],
                },
                auth: true,
            })
            .post("/", async ({ body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            category: ["create"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await CategoryService.create(body);
            }, {
                body: CreateCategoryDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Create a new category",
                    tags: ["Categories"],
                },
                auth: true,
            })
            .patch("/:id", async ({ params: { id }, body, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            category: ["update"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await CategoryService.update(id, body);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                body: UpdateCategoryDTO,
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Update a category",
                    tags: ["Categories"],
                },
                auth: true,
            })
            .delete("/:id", async ({ params: { id }, user }) => {
                const hasPermission = await auth.api.userHasPermission({
                    body: {
                        userId: user.id,
                        permissions: {
                            category: ["delete"],
                        },
                    },
                });
                if (!hasPermission.success) {
                    throw new Error("Unauthorized");
                }
                return await CategoryService.delete(id);
            }, {
                params: t.Object({
                    id: t.String(),
                }),
                response: { "200": SuccessMessageResponse },
                detail: {
                    summary: "Soft delete a category",
                    tags: ["Categories"],
                },
                auth: true,
            })
    );
