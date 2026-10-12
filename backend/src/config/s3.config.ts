import { S3Client } from "@aws-sdk/client-s3";

export type AllowedMimeType =
    | "image/jpeg"
    | "image/png"
    | "image/gif"
    | "image/webp"
    | "image/avif"
    | "video/mp4"
    | "video/mpeg"
    | "video/quicktime"
    | "video/x-msvideo"
    | "application/json"
    | "application/pdf";

export type AllowedExtension =
    | "jpg"
    | "jpeg"
    | "png"
    | "gif"
    | "webp"
    | "avif"
    | "mp4"
    | "mpeg"
    | "mov"
    | "avi"
    | "json"
    | "pdf";

export const s3Client = new S3Client({
    region: process.env.AWS_S3_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export const S3_CONFIG = {
    bucketName: process.env.AWS_S3_BUCKET!,
    region: process.env.AWS_S3_REGION!,
    maxFileSize: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: [
        "image/jpeg",
        "image/png",
        "image/gif",
        "image/webp",
        "image/avif",
        "video/mp4",
        "video/mpeg",
        "video/quicktime",
        "video/x-msvideo",
        "application/json",
        "application/pdf",
    ] as AllowedMimeType[],
    allowedExtensions: [
        "jpg",
        "jpeg",
        "png",
        "gif",
        "webp",
        "avif",
        "mp4",
        "mpeg",
        "mov",
        "avi",
        "json",
        "pdf",
    ] as AllowedExtension[],
};
