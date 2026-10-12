import { APIError, betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { admin as adminPlugin, openAPI, phoneNumber } from "better-auth/plugins";
import { ac, admin, assessor, user, vendor } from "./permissions";
import { emailOTP } from "better-auth/plugins"
import { sendOtpEmail } from "@/modules/auth/email";
// If your Prisma file is located elsewhere, you can change the path
import { prisma } from "@/database/prisma-client";
import { status } from "elysia";

let _schema: ReturnType<typeof auth.api.generateOpenAPISchema>;
// biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
const getSchema = async () => (_schema ??= auth.api.generateOpenAPISchema());

export const auth = betterAuth({
	appName: "TPVRA",
	basePath: "/api",
	database: prismaAdapter(prisma, {
		provider: "postgresql",
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: true,
	},
	emailVerification: {
		autoSignInAfterVerification: true
	},
	plugins: [openAPI(),
	emailOTP({
		overrideDefaultEmailVerification: true,
		async sendVerificationOTP({ email, otp, type }) {
			if (type === "sign-in") {

				// TODO: Cache this if user exists or not to avoid frequent db calls
				const user = await prisma.user.findFirst({
					where: { email }
				});

				if (user) {
					if (user.isApproved === "REJECTED") {
						throw new APIError("FORBIDDEN", { message: "Your account has been rejected by the admin." });
					}
					if (user.isApproved === "AWAITING_FOR_APPROVAL") {
						throw new APIError("FORBIDDEN", { message: "Your account is awaiting admin approval." });
					}
					// await sendOtpEmail(email, otp, "sign-in");
				}
				else {
					throw new APIError("BAD_REQUEST", { message: "No user found with this email", code: "USER_NOT_FOUND" });
				}
				// Send the OTP for sign in
				console.log("OTP", otp);

			} else if (type === "email-verification") {

				// We won't be sending emails to signup
				// const user = await prisma.user.findFirst({
				// 	where: { email }
				// });

				// // Send the OTP for email verification
				// if (user) {
				// 	console.log("OTP", otp);
				// 	await sendOtpEmail(email, otp, "email-verification");
				// }
				// else {
				// 	throw new APIError("BAD_REQUEST", { message: "No user found with this email", code: "USER_NOT_FOUND" });
				// }
			} else if (type === "forget-password") {
				// Send the OTP for password reset
				// await sendOtpEmail(email, otp, "forget-password");
			}
		},
	}),
	adminPlugin({
		ac,
		roles: {
			admin,
			user,
			vendor,
			assessor,
		},
	}),
	phoneNumber()
	],
	logger: {
		level: process.env.NODE_ENV !== "production" ? "debug" : "info",
		disabled: process.env.NODE_ENV === "test",
	},
	session: {
		expiresIn: 60 * 60 * 24 * 7, // 7 days
		updateAge: 60 * 60 * 24, // 1 day (every 1 day the session expiration is updated)
	},
	user: {
		additionalFields: {
			userType: {
				type: "string",
				required: false,
				input: true,
			},
			companyName: {
				type: "string",
				required: false,
				input: true,
			},
			assessorName: {
				type: "string",
				required: false,
				input: true,
			},
			licenseNumber: {
				type: "string",
				required: false,
				input: true,
			},
			termsAccepted: {
				type: "boolean",
				required: false,
				input: true,
			},
			isApproved: {
				type: "string",
				required: false,
			},
		},
	},
	databaseHooks: {
		user: {
			create: {
				before: async (user) => {
					// Extract custom data sent from the client
					const selectedType = (user as any).userType;

					// Strictly allow only vendor or assessor
					let assignedRole = "user"; // Fallback default
					if (selectedType === "vendor" || selectedType === "assessor") {
						assignedRole = selectedType;
					}
					const { userType, ...rest } = user;
					// We gonna delete this actually to make sure we pass the proper information
					delete (user as any).userType;
					return {
						data: {
							...rest,
							role: selectedType,
						},
					};
				},
			},
		},
	},
	trustedOrigins: ["https://test.tprisk.acrossverticals.com", "http://localhost:3001", "http://localhost:3000"],
	advanced: {
		cookiePrefix: "tpvra",
		...(process.env.NODE_ENV === "production"
			? {
				crossSubDomainCookies: {
					enabled: true,
					domain: "acrossverticals.com",
				},
				defaultCookieAttributes: {
					sameSite: "lax",
					secure: true,
				},
				useSecureCookies: true,
			}
			: {
				defaultCookieAttributes: {
					sameSite: "lax",
					secure: false,
				},
				useSecureCookies: false,
			}),
		cookies: {
			session_token: {
				attributes: {
					httpOnly: true,
					sameSite: "lax",
					path: "/",
					...(process.env.NODE_ENV === "production"
						? {
							secure: true,
							// TODO: change this to actual depolyed domain
							domain: "acrossverticals.com",
						}
						: {}),
				},
			},
		},
	},
});

export const OpenAPI = {
	getPaths: (prefix = "/auth/api") =>
		getSchema().then(({ paths }) => {
			const reference: typeof paths = Object.create(null);

			for (const path of Object.keys(paths)) {
				const key = prefix + path;
				reference[key] = paths[path];

				for (const method of Object.keys(paths[path])) {
					const operation = (reference[key] as any)[method];

					operation.tags = ["Better Auth"];
				}
			}

			return reference;
		}) as Promise<any>,
	components: getSchema().then(({ components }) => components) as Promise<any>,
} as const;
