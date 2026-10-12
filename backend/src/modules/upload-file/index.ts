import { Elysia, t } from "elysia";
import { FileUploadService } from "./service";
import sharp from "sharp";
import { rateLimit } from "elysia-rate-limit";
import { Auth } from "../auth";
import { UploadSuccessResponseSchema, PresignedUrlSuccessResponseSchema, DeleteSuccessResponseSchema, MultiUploadSuccessResponseSchema } from "./model";

const fileUploadService = new FileUploadService();

export const UploadAPI = new Elysia({ name: "UploadAPI" })
    .use(
        rateLimit({
            duration: 60000, // 1 minute
            max: 10, // 10 requests per minute
            scoping: "scoped",
            generator: (req, server) => server?.requestIP(req)?.address || "unknown",
        })
    )
    .use(Auth)
    .group("/files", (app) =>
        app
            .post(
                "/upload",
                async ({ body: { file, folderName }, user }) => {
                    fileUploadService.validateFile(file);
                    const arrayBuffer = await file.arrayBuffer();
                    let finalFileBuffer = Buffer.from(arrayBuffer as any);
                    let fileName = file.name;

                    const result = await fileUploadService.uploadFile(
                        finalFileBuffer,
                        fileName,
                        file.type,
                        folderName,
                        user.id,
                        "public-read"
                    );

                    return { success: true, message: "Uploaded", data: result };
                },
                {
                    body: t.Object({
                        file: t.File(),
                        folderName: t.Optional(t.String({ default: "uploads" }))
                    }),
                    response: {
                        200: UploadSuccessResponseSchema,
                    },
                    detail: {
                        summary: "Upload a file",
                        tags: ["Files"],
                    },
                    auth: true,
                }
            )
            .post(
                "/upload-multiple",
                async ({ body: { files, folderName }, user }) => {
                    const uploadedFiles = await Promise.all(
                        files.map(async (file) => {
                            fileUploadService.validateFile(file);
                            const arrayBuffer = await file.arrayBuffer();
                            let finalFileBuffer = Buffer.from(arrayBuffer as any);
                            let fileName = file.name;

                            return fileUploadService.uploadFile(
                                finalFileBuffer,
                                fileName,
                                file.type,
                                folderName,
                                user.id,
                                "public-read"
                            );
                        })
                    );

                    return { success: true, message: "Uploaded", data: uploadedFiles };
                },
                {
                    body: t.Object({
                        files: t.Files(),
                        folderName: t.Optional(t.String({ default: "uploads" }))
                    }),
                    response: {
                        200: MultiUploadSuccessResponseSchema,
                    },
                    detail: {
                        summary: "Upload multiple files",
                        tags: ["Files"],
                    },
                    auth: true,
                }
            )
            .get(
                "/url/:fileKey",
                async ({ params: { fileKey }, query: { fileName } }) => {
                    const data = await fileUploadService.generatePresignedUrl(
                        decodeURIComponent(fileKey),
                        3600,
                        fileName
                    );
                    return { success: true, data };
                },
                {
                    params: t.Object({
                        fileKey: t.String()
                    }),
                    query: t.Object({
                        fileName: t.Optional(t.String())
                    }),
                    response: {
                        200: PresignedUrlSuccessResponseSchema,
                    },
                    detail: {
                        summary: "Get presigned URL",
                        tags: ["Files"],
                    },
                    auth: true,
                }
            )
            .delete(
                "/:fileKey",
                async ({ params: { fileKey }, user }) => {
                    await fileUploadService.deleteFile(
                        decodeURIComponent(fileKey),
                        user.id
                    );
                    return { success: true, message: "Deleted" };
                },
                {
                    params: t.Object({
                        fileKey: t.String()
                    }),
                    response: {
                        200: DeleteSuccessResponseSchema,
                    },
                    detail: {
                        summary: "Delete a file",
                        tags: ["Files"],
                    },
                    auth: true,
                }
            )
            .delete(
                "/id/:id",
                async ({ params: { id }, user }) => {
                    await fileUploadService.deleteFileById(
                        id,
                        user.id
                    );
                    return { success: true, message: "Deleted" };
                },
                {
                    params: t.Object({
                        id: t.String()
                    }),
                    response: {
                        200: DeleteSuccessResponseSchema,
                    },
                    detail: {
                        summary: "Delete a file by ID",
                        tags: ["Files"],
                    },
                    auth: true,
                }
            )
    );
