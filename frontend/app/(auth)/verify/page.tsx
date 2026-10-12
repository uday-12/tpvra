import { Suspense } from "react";
import { AuthLayout } from "@/components/auth/auth-layout";
import { OtpVerifyForm } from "@/components/auth/otp-verify-form";
import { Loader2 } from "lucide-react";

export default function VerifyPage() {
    return (
        <AuthLayout>
            <Suspense fallback={
                <div className="flex items-center justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-orange-600" />
                </div>
            }>
                <OtpVerifyForm />
            </Suspense>
        </AuthLayout>
    );
}
