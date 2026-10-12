import { AuthLayout } from "@/components/auth/auth-layout";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function RegisterPage() {
    return (
        <AuthLayout>
            <SignUpForm />
        </AuthLayout>
    );
}
