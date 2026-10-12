import { t } from "elysia";

export interface FileUploadResponse {
    fileName: string;
    filePath: string;
    fileSize: number; // in bytes
    fileExtension: string;
    s3Key: string;
    uploadedFileId: string; // Changed to string (UUID)
}

export interface PresignedUrlResponse {
    url: string;
    expiresIn: number;
}

export interface BulkFileUploadResponse {
    files: FileUploadResponse[];
    totalUploaded: number;
    totalFailed: number;
}

export const ApiErrorResponseSchema = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export const UploadSuccessResponseSchema = t.Object({
    success: t.Boolean(),
    message: t.String(),
    data: t.Object({
        fileName: t.String(),
        filePath: t.String(),
        fileSize: t.Number(),
        fileExtension: t.String(),
        s3Key: t.String(),
        uploadedFileId: t.String(), // Changed to string (UUID)
    }),
});

export const BulkUploadSuccessResponseSchema = t.Object({
    success: t.Boolean(),
    message: t.String(),
    data: t.Object({
        files: t.Array(t.Object({
            fileName: t.String(),
            filePath: t.String(),
            fileSize: t.Number(),
            fileExtension: t.String(),
            s3Key: t.String(),
            uploadedFileId: t.String(), // Changed to string (UUID)
        })),
        totalUploaded: t.Number(),
        totalFailed: t.Number(),
    }),
});

export const PresignedUrlSuccessResponseSchema = t.Object({
    success: t.Boolean(),
    data: t.Object({
        url: t.String(),
        expiresIn: t.Number(),
    }),
});

export const DeleteSuccessResponseSchema = t.Object({
    success: t.Boolean(),
    message: t.String(),
});

export const MultiUploadSuccessResponseSchema = t.Object({
    success: t.Boolean(),
    message: t.String(),
    data: t.Array(t.Object({
        fileName: t.String(),
        filePath: t.String(),
        fileSize: t.Number(),
        fileExtension: t.String(),
        s3Key: t.String(),
        uploadedFileId: t.String(),
    })),
});
