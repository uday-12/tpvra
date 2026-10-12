import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements, adminAc } from "better-auth/plugins/admin/access";

/**
 * Define valid statements (resources and actions).
 * We include the default admin statements (user, session, etc.) and can add custom ones here.
 */
const statement = {
    ...defaultStatements,
    category: ["create", "read", "update", "delete"],
    question: ["create", "read", "update", "delete"],
    assessment: ["create", "read", "update", "delete"],
    assessmentQuestion: ["create", "read", "update", "delete"],
    assessorVendorAssessment: ["create", "read", "update", "delete"],
    vendorAnswer: ["create", "read", "update", "delete"],
    vendorAnswerFile: ["create", "read", "update", "delete"],
    clarification: ["create", "read", "update", "delete"],
    file: ["create", "read", "update", "delete"],
    payment: ["create", "read", "update", "delete"],
    paymentLog: ["create", "read", "update", "delete"],
    notification: ["create", "read", "update", "delete"],
    account: ["create", "read", "update", "delete"],
    verification: ["create", "read", "update", "delete"],
} as const;

export const ac = createAccessControl(statement);

/**
 * Admin role: Full access to admin features.
 */
export const admin = ac.newRole({
    ...adminAc.statements,
    category: ["create", "read", "update", "delete"],
    question: ["create", "read", "update", "delete"],
    assessment: ["create", "read", "update", "delete"],
    assessmentQuestion: ["create", "read", "update", "delete"],
    assessorVendorAssessment: ["create", "read", "update", "delete"],
    vendorAnswer: ["create", "read", "update", "delete"],
    vendorAnswerFile: ["create", "read", "update", "delete"],
    clarification: ["create", "read", "update", "delete"],
    file: ["create", "read", "update", "delete"],
    payment: ["create", "read", "update", "delete"],
    paymentLog: ["create", "read", "update", "delete"],
    notification: ["create", "read", "update", "delete"],
    account: ["create", "read", "update", "delete"],
    verification: ["create", "read", "update", "delete"],
});

/**
 * User role: Default role with limited permissions.
 */
export const user = ac.newRole({
    notification: ["read"],
});

/**
 * Vendor role: Custom role for vendors.
 */
export const vendor = ac.newRole({
    notification: ["read"],
    assessment: ["read"],
    assessorVendorAssessment: ["read", "update"],
    vendorAnswer: ["create", "read", "update"],
    vendorAnswerFile: ["create", "read", "update", "delete"],
    clarification: ["create", "read", "update"],
    file: ["create", "read"],
    payment: ["read", "create"],
});

/**
 * Assessor role: Custom role for assessors.
 */
export const assessor = ac.newRole({
    notification: ["read"],
    assessment: ["read"],
    assessorVendorAssessment: ["read", "update"],
    vendorAnswer: ["read"],
    vendorAnswerFile: ["read"],
    clarification: ["create", "read", "update"],
    file: ["read"],
    payment: ["read"],
});
