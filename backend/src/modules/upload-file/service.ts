import {
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3Client, S3_CONFIG, type AllowedExtension, type AllowedMimeType } from "../../config/s3.config";
import type { FileUploadResponse, PresignedUrlResponse } from "./model";
import { prisma } from "../../database/prisma-client";

export class FileUploadService {
    private generateFileName(originalName: string): string {
        const extension = this.getFileExtension(originalName);
        const nameWithoutExt = originalName.replace(/\.[^/.]+$/, "");
        const timestamp = Date.now();
        const sanitized = nameWithoutExt.replace(/[^a-zA-Z0-9-_]/g, "_");
        return `${sanitized}_${timestamp}.${extension}`;
    }

    private getFileExtension(fileName: string): string {
        return fileName.split(".").pop()?.toLowerCase() || "";
    }

    private isAllowedExtension(ext: string): ext is AllowedExtension {
        return S3_CONFIG.allowedExtensions.includes(ext as AllowedExtension);
    }

    private isAllowedMimeType(mimeType: string): boolean {
        return S3_CONFIG.allowedMimeTypes.includes(mimeType as AllowedMimeType);
    }

    validateFile(file: File): void {
        if (file.size > S3_CONFIG.maxFileSize) {
            throw new Error(`File size exceeds ${S3_CONFIG.maxFileSize / (1024 * 1024)}MB limit`);
        }
        const extension = this.getFileExtension(file.name);
        if (!this.isAllowedExtension(extension)) {
            throw new Error(`Invalid file type. Allowed: ${S3_CONFIG.allowedExtensions.join(", ")}`);
        }
        if (!this.isAllowedMimeType(file.type)) {
            throw new Error(`Invalid MIME type: ${file.type}`);
        }
    }

    async uploadFile(
        buffer: Buffer,
        fileName: string,
        mimeType: string,
        folderName: string = "uploads",
        uploadedBy: string | null = null,
        acl: "public-read" | "private" = "public-read"
    ): Promise<FileUploadResponse> {
        try {
            const uniqueFileName = this.generateFileName(fileName);
            const s3Key = `${folderName}/${uniqueFileName}`;
            const fileExtension = this.getFileExtension(fileName);

            const command = new PutObjectCommand({
                Bucket: S3_CONFIG.bucketName,
                Key: s3Key,
                Body: buffer,
                ContentType: mimeType,
                ACL: undefined, //TODO: Change this to public-read
            });

            await s3Client.send(command);

            // Construct URL (check if bucket is public, else use presigned or proxy)
            // Assuming public access or generating presigned URL on retrieval
            const fileUrl = `https://${S3_CONFIG.bucketName}.s3.${S3_CONFIG.region}.amazonaws.com/${s3Key}`;

            const uploadedFileInfo = await prisma.file.create({
                data: {
                    fileName: uniqueFileName,
                    s3Key,
                    s3Bucket: S3_CONFIG.bucketName,
                    fileSize: buffer.length,
                    mimeType,
                    uploadedBy,
                    url: fileUrl,
                    filePath: fileUrl,
                },
            });

            return {
                fileName: uniqueFileName,
                filePath: fileUrl,
                fileSize: buffer.length,
                fileExtension,
                s3Key,
                uploadedFileId: uploadedFileInfo.id,
            };
        } catch (error) {
            console.error(error);
            throw new Error("File upload failed");
        }
    }

    async generatePresignedUrl(fileKey: string, expiresIn: number = 3600, fileName?: string): Promise<PresignedUrlResponse> {
        const command = new GetObjectCommand({
            Bucket: S3_CONFIG.bucketName,
            Key: fileKey,
            ...(fileName && { ResponseContentDisposition: `attachment; filename="${fileName}"` })
        });
        const url = await getSignedUrl(s3Client, command, { expiresIn });
        return { url, expiresIn };
    }

    async deleteFile(fileKey: string, userId: string): Promise<void> {
        // Soft delete in DB
        await prisma.file.updateMany({
            where: { s3Key: fileKey },
            data: { deletedAt: new Date(), deletedBy: userId },
        });
        // Remove from S3
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_CONFIG.bucketName, Key: fileKey }));
    }

    async deleteFileById(fileId: string, userId: string): Promise<void> {
        const file = await prisma.file.findFirst({
            where: { id: fileId, deletedAt: null }
        });

        if (!file) {
            throw new Error("File not found");
        }

        // Soft delete in DB
        await prisma.file.update({
            where: { id: fileId },
            data: { deletedAt: new Date(), deletedBy: userId },
        });

        // Remove from S3
        await s3Client.send(new DeleteObjectCommand({ Bucket: S3_CONFIG.bucketName, Key: file.s3Key }));
    }
}
