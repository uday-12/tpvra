"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
} from "@/components/ui/field";
import { Spinner } from "../ui/spinner";

const signInSchema = z.object({
    email: z.string().email("Please enter a valid email address."),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<SignInValues>({
        resolver: zodResolver(signInSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(values: SignInValues) {
        setLoading(true);
        try {
            const { data, error } = await authClient.emailOtp.sendVerificationOtp({
                email: values.email,
                type: "sign-in",
            });

            if (error) {
                toast.error(error.message || "Failed to send verification code.");
                return;
            }

            toast.success("Verification code sent to your email.");
            router.push(`/verify?email=${encodeURIComponent(values.email)}&type=sign-in`);
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Welcome Back</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Sign in to access your account
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <FieldGroup>
                    <Field data-invalid={!!errors.email}>
                        <FieldLabel htmlFor="email">Email Address</FieldLabel>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email address"
                            autoComplete="email"
                            className="h-12 border-slate-200 dark:border-slate-800 focus:ring-orange-600 focus:border-orange-600"
                            {...register("email")}
                        />
                        <FieldError errors={[errors.email]} />
                    </Field>
                </FieldGroup>

                <Button
                    type="submit"
                    className="w-full h-12 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-600/20 disabled:opacity-70"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Sending Code...
                        </>
                    ) : (
                        "Continue"
                    )}
                </Button>

                <div className="text-center text-sm text-slate-500">
                    Don't have an account?{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={() => router.push("/register")}
                        className="text-orange-600 p-0 h-auto font-medium hover:underline focus-visible:ring-0"
                    >
                        Create account
                    </Button>
                </div>
            </form>
        </div>
    );
}
