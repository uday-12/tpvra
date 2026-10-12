import { createAuthClient } from "better-auth/react";
import { adminClient, emailOTPClient, phoneNumberClient } from "better-auth/client/plugins"
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: process.env.NEXT_PUBLIC_BACKEND_URL,
    basePath: "/api",
    plugins: [
        emailOTPClient(),
        adminClient(),
        phoneNumberClient(),
        inferAdditionalFields({
            user: {
                userType: {
                    type: "string"
                },
                role: {
                    type: "string",
                    required: false,
                },
                companyName: {
                    type: "string",
                    required: false,
                },
                assessorName: {
                    type: "string",
                    required: false,
                },
                licenseNumber: {
                    type: "string",
                },
                termsAccepted: {
                    type: "boolean",
                    required: false,
                },
                isApproved: {
                    type: "string",
                    required: false,
                }
            }
        })
    ]
});

export const { signIn, signOut, signUp, useSession } = authClient;
