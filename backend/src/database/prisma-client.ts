import { PrismaClient } from "@/generated/prisma";

// Create a singleton Prisma client instance
export const prisma = new PrismaClient();
