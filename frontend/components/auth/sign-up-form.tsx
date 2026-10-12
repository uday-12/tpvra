"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
    Field,
    FieldLabel,
    FieldError,
    FieldGroup,
    FieldTitle,
} from "@/components/ui/field";
import { Checkbox } from "@/components/ui/checkbox";
import { Spinner } from "../ui/spinner";
import { PhoneInput } from "@/components/ui/phone-input";
import "react-phone-number-input/style.css";

const signUpSchema = z.object({
    role: z.enum(["vendor", "assessor"] as const, {
        message: "Please select an account type.",
    }),
    // Name is now derived from Company/Assessor Name
    name: z.string().optional(),
    email: z.string().email("Please enter a valid email address."),
    phoneNumber: z.string().min(10, "Phone number must be at least 10 digits."),
    companyName: z.string().optional(),
    assessorName: z.string().optional(),
    licenseNumber: z.string().min(2, "License number is required."),
    terms: z.boolean({
        message: "You must agree to the terms and conditions.",
    }).refine((v) => v === true, "You must agree to the terms and conditions."),
}).superRefine((data, ctx) => {
    if (data.role === "vendor" && (!data.companyName || data.companyName.length < 2)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Company name is required.",
            path: ["companyName"],
        });
    }
    if (data.role === "assessor" && (!data.assessorName || data.assessorName.length < 2)) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Assessor name is required.",
            path: ["assessorName"],
        });
    }
});

type SignUpValues = z.infer<typeof signUpSchema>;

export function SignUpForm() {
    const router = useRouter();
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
    } = useForm<SignUpValues>({
        resolver: zodResolver(signUpSchema),
        defaultValues: {
            role: "vendor",
            name: "",
            email: "",
            phoneNumber: "",
            companyName: "",
            assessorName: "",
            licenseNumber: "",
            terms: false,
        },
    });

    const role = watch("role");

    async function onSubmit(values: SignUpValues) {
        setLoading(true);
        try {
            const { data, error } = await authClient.signUp.email({
                email: values.email,
                password: values.email, // we don't need password, but better auth needs it. 
                name: values.role === 'vendor' ? values.companyName! : values.assessorName!, // Use Entity Name as User Name
                userType: values.role,
                phoneNumber: values.phoneNumber,
                companyName: values.companyName,
                assessorName: values.assessorName,
                licenseNumber: values.licenseNumber,
                termsAccepted: values.terms,
            });

            if (error) {
                toast.error(error.message || "Failed to create account.");
                return;
            }

            setSubmitted(true);
            toast.success("Account created successfully!");
        } catch (err) {
            toast.error("An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    }

    if (submitted) {
        return (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none text-center">
                <div className="mb-6 flex justify-center">
                    <div className="h-16 w-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center">
                        <svg
                            className="h-8 w-8 text-green-600 dark:text-green-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Account Created</h1>
                <p className="text-slate-500 dark:text-slate-400 mb-8">
                    Your account has been created successfully and is awaiting administrator approval. You will be able to sign in once your account is approved.
                </p>
                <Button
                    onClick={() => router.push("/login")}
                    className="w-full h-11 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200"
                >
                    Return to Sign In
                </Button>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">Create Account</h1>
                <p className="text-slate-500 dark:text-slate-400 text-sm">
                    Get started with your new account
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Role Selection */}
                <Field data-invalid={!!errors.role}>
                    <FieldTitle>Create account as</FieldTitle>
                    <Controller
                        name="role"
                        control={control}
                        render={({ field }) => (
                            <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex gap-4 mt-2"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="vendor" id="vendor" />
                                    <FieldLabel htmlFor="vendor" className="font-normal cursor-pointer">Vendor</FieldLabel>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="assessor" id="assessor" />
                                    <FieldLabel htmlFor="assessor" className="font-normal cursor-pointer">Assessor</FieldLabel>
                                </div>
                            </RadioGroup>
                        )}
                    />
                    <FieldError errors={[errors.role]} />
                </Field>

                <FieldGroup className="gap-4">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-1">
                        {/* Full Name removed - using Entity Name instead */}

                        {/* Email */}
                        <Field data-invalid={!!errors.email}>
                            <FieldLabel htmlFor="up-email">Email Address</FieldLabel>
                            <Input
                                id="up-email"
                                placeholder="Enter your email address"
                                className="h-11 border-slate-200 dark:border-slate-800"
                                {...register("email")}
                            />
                            <FieldError errors={[errors.email]} />
                        </Field>

                        {/* Phone */}
                        <Field data-invalid={!!errors.phoneNumber}>
                            <FieldLabel htmlFor="phoneNumber">Phone Number</FieldLabel>
                            <Controller
                                name="phoneNumber"
                                control={control}
                                render={({ field }) => (
                                    <PhoneInput
                                        id="phoneNumber"
                                        placeholder="Enter phone number"
                                        value={field.value as any}
                                        onChange={field.onChange}
                                    />
                                )}
                            />
                            <FieldError errors={[errors.phoneNumber]} />
                        </Field>

                        {/* Company Name / Assessor Name */}
                        {role === "vendor" ? (
                            <Field data-invalid={!!errors.companyName}>
                                <FieldLabel htmlFor="companyName">Company Name</FieldLabel>
                                <Input
                                    id="companyName"
                                    placeholder="Enter company name"
                                    className="h-11 border-slate-200 dark:border-slate-800"
                                    {...register("companyName")}
                                />
                                <FieldError errors={[errors.companyName]} />
                            </Field>
                        ) : (
                            <Field data-invalid={!!errors.assessorName}>
                                <FieldLabel htmlFor="assessorName">Assessor Name</FieldLabel>
                                <Input
                                    id="assessorName"
                                    placeholder="Enter assessor name"
                                    className="h-11 border-slate-200 dark:border-slate-800"
                                    {...register("assessorName")}
                                />
                                <FieldError errors={[errors.assessorName]} />
                            </Field>
                        )}

                        {/* License Number */}
                        <Field data-invalid={!!errors.licenseNumber}>
                            <FieldLabel htmlFor="licenseNumber">License Number</FieldLabel>
                            <Input
                                id="licenseNumber"
                                placeholder="Enter license number"
                                className="h-11 border-slate-200 dark:border-slate-800"
                                {...register("licenseNumber")}
                            />
                            <FieldError errors={[errors.licenseNumber]} />
                        </Field>
                    </div>
                </FieldGroup>

                {/* Terms */}
                <div className="flex items-start gap-2 py-2">
                    <Controller
                        name="terms"
                        control={control}
                        render={({ field }) => (
                            <Checkbox
                                id="terms"
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                className="mt-1 border-slate-300 data-[state=checked]:bg-orange-600 data-[state=checked]:border-orange-600"
                            />
                        )}
                    />
                    <div className="grid gap-1.5 leading-none">
                        <label htmlFor="terms" className="text-sm text-slate-500 font-normal">
                            I agree to the <span className="text-orange-600 cursor-pointer hover:underline">Terms & Conditions</span> and <span className="text-orange-600 cursor-pointer hover:underline">Privacy Policy</span>
                        </label>
                        <FieldError errors={[errors.terms]} />
                    </div>
                </div>

                <Button
                    type="submit"
                    className="w-full h-11 mt-2 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-orange-600/20 disabled:opacity-70"
                    disabled={loading}
                >
                    {loading ? (
                        <>
                            <Spinner className="mr-2 h-4 w-4" />
                            Creating Account...
                        </>
                    ) : (
                        "Create Account"
                    )}
                </Button>

                <div className="text-center text-sm text-slate-500 pb-2">
                    Already have an account?{" "}
                    <Button
                        variant="link"
                        type="button"
                        onClick={() => router.push("/login")}
                        className="text-orange-600 font-medium p-0 h-auto hover:underline focus-visible:ring-0"
                    >
                        Sign in
                    </Button>
                </div>
            </form>
        </div>
    );
}
