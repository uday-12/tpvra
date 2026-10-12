import { AuthCarousel } from "./auth-carousel";

export function AuthLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
            {/* Left side: Carousel (hidden on mobile) */}
            <div className="hidden lg:block lg:w-1/2 overflow-hidden sticky top-0 h-screen">
                <AuthCarousel />
            </div>

            {/* Right side: Auth forms */}
            <div className="flex w-full flex-col justify-center lg:w-1/2">
                <div className="mx-auto w-full max-w-lg px-8 py-12">
                    {children}

                    <div className="mt-8 text-center text-sm text-slate-500">
                        © 2024 TPVRA Platform. All rights reserved.
                    </div>
                </div>
            </div>
        </div>
    );
}
