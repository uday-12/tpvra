"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSeparator,
    InputOTPSlot,
} from "@/components/ui/input-otp";
import {
    Field,
    FieldError,
    FieldGroup,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { Spinner } from "../ui/spinner";

const otpSchema = z.object({
    otp: z.string().length(6, "The verification code must be 6 digits."),
});

type OtpValues = z.infer<typeof otpSchema>;

const RESEND_TIMER_SECONDS = 30;

export function OtpVerifyForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get("email") || "";
    const type = searchParams.get("type") || "sign-in";

    const [loading, setLoading] = useState(false);
    const [resending, setResending] = useState(false);
    const [timer, setTimer] = useState(RESEND_TIMER_SECONDS);
    const [canResend, setCanResend] = useState(false);

    const {
        control,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<OtpValues>({
        resolver: zodResolver(otpSchema),
        defaultValues: {
            otp: "",
        },
    });

    const otpValue = watch("otp");

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (timer > 0) {
            interval = setInterval(() => {
                setTimer((prev) => prev - 1);
            }, 1000);
        } else {
            setCanResend(true);
        }
        return () => clearInterval(interval);
    }, [timer]);

    async function onSubmit(values: OtpValues) {
        if (!email) {
            toast.error("Email is missing. Please start over.");
            router.push("/login");
            return;
        }

        setLoading(true);
        try {
            let data, error;
            if (type === 'sign-in') {
                ({ data, error } = await authClient.signIn.emailOtp({
                    email,
                    otp: values.otp,
                }));
            } else {
                ({ data, error } = await authClient.emailOtp.verifyEmail({
                    email,
                    otp: values.otp,
                }));
            }

            if (error) {
                toast.error(error.message || "Invalid verification code.");
                return;
            }

            toast.success("Signed in successfully!");

            // Fetch fresh session data to get complete user info
            const sessionResponse = await authClient.getSession();
            const sessionUser = sessionResponse?.data?.user as any;

            // Role-based navigation - check both role and userType fields
            const userRole = sessionUser?.role?.toLowerCase();
            const userType = sessionUser?.userType?.toLowerCase();

            // Determine the correct dashboard based on role or userType
            const role = userRole || userType;

            if (role === 'admin') {
                router.push("/admin/dashboard");
            } else if (role === 'vendor') {
                router.push("/vendor/dashboard");
            } else if (role === 'assessor') {
                router.push("/assessor/dashboard");
            } else {
                // Fallback to default dashboard
                router.push("/dashboard");
            }
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    async function handleResend() {
        if (!canResend) return;

        setResending(true);
        try {
            const { error } = await authClient.emailOtp.sendVerificationOtp({
                email,
                type: type as "sign-in" | "email-verification" | "forget-password",
            });

            if (error) {
                toast.error(error.message || "Failed to resend code.");
                return;
            }

            toast.success("Verification code resent.");
            setTimer(RESEND_TIMER_SECONDS);
            setCanResend(false);
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setResending(false);
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="mb-8 text-center sm:text-left">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Enter verification code</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    A 6 digit verification code sent to <span className="font-medium text-slate-900 dark:text-white">{email}</span>
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FieldGroup>
                    <Field data-invalid={!!errors.otp}>
                        <div className="flex justify-center">
                            <Controller
                                name="otp"
                                control={control}
                                render={({ field }) => (
                                    <InputOTP
                                        maxLength={6}
                                        value={field.value}
                                        onChange={field.onChange}
                                    >
                                        <InputOTPGroup>
                                            <InputOTPSlot index={0} className="h-16 w-14 text-2xl" />
                                            <InputOTPSlot index={1} className="h-16 w-14 text-2xl" />
                                            <InputOTPSlot index={2} className="h-16 w-14 text-2xl" />
                                            <InputOTPSlot index={3} className="h-16 w-14 text-2xl" />
                                            <InputOTPSlot index={4} className="h-16 w-14 text-2xl" />
                                            <InputOTPSlot index={5} className="h-16 w-14 text-2xl" />
                                        </InputOTPGroup>
                                    </InputOTP>
                                )}
                            />
                        </div>
                        <FieldError className="text-center" errors={[errors.otp]} />
                    </Field>
                </FieldGroup>

                <Button
                    type="submit"
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-600/20 disabled:opacity-70"
                    disabled={loading || otpValue.length !== 6}
                >
                    {loading ? (
                        <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Verifying...
                        </>
                    ) : (
                        "Verify & Sign In"
                    )}
                </Button>

                <div className="text-center text-sm text-slate-500">
                    Didn't receive the code?{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={handleResend}
                        disabled={!canResend || resending}
                        className={cn(
                            "font-medium p-0 h-auto transition-colors hover:underline focus-visible:ring-0",
                            canResend ? "text-orange-600" : "text-slate-400 cursor-not-allowed"
                        )}
                    >
                        {resending ? "Sending..." : canResend ? "Resend" : `Resend in ${timer}s`}
                    </Button>
                </div>
            </form>
        </div>
    );
}
