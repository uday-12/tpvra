import { prisma } from "@/database/prisma-client";
import { UserStatus, Prisma } from "@/generated/prisma";
import { SuccessMessageResponse } from "./model";
import { sendAccountApprovedEmail, sendAccountRejectedEmail } from "./email";

export abstract class UsersService {
    static async approveUser(userId: string): Promise<SuccessMessageResponse> {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isApproved: "APPROVED" },
        });

        if (user.email && user.name) {
            await sendAccountApprovedEmail(user.email, user.name);
        }

        return {
            success: true,
            message: "User approved successfully",
        };
    }

    static async rejectUser(userId: string): Promise<SuccessMessageResponse> {
        const user = await prisma.user.update({
            where: { id: userId },
            data: { isApproved: "REJECTED" },
        });

        if (user.email && user.name) {
            await sendAccountRejectedEmail(user.email, user.name);
        }

        return {
            success: true,
            message: "User rejected successfully",
        };
    }

    static async listUsers(params: {
        page?: number;
        limit?: number;
        role?: string;
        status?: UserStatus;
        search?: string;
    }) {
        const { page = 1, limit = 10, role, status, search } = params;
        const skip = (page - 1) * limit;

        const where: Prisma.UserWhereInput = {};

        if (role) {
            where.role = { contains: role, mode: "insensitive" };
        }

        if (status) {
            where.isApproved = status;
        }

        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { email: { contains: search, mode: "insensitive" } },
                { companyName: { contains: search, mode: "insensitive" } },
                { assessorName: { contains: search, mode: "insensitive" } },
            ];
        }

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
            }),
            prisma.user.count({ where }),
        ]);

        return {
            users,
            total,
            limit,
            page,
        };
    }
}

