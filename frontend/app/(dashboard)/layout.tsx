"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { DynamicBreadcrumbs } from "@/components/dashboard/dynamic-breadcrumbs";
import { HeaderUser } from "@/components/dashboard/header-user";
import { AssessmentProvider } from "@/contexts/assessment-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <SidebarProvider>
            <AssessmentProvider>
                <div className="print:hidden">
                    <AppSidebar />
                </div>
                <SidebarInset className="print:!ml-0">
                    <header className="flex h-16 shrink-0 items-center justify-end gap-2 border-b px-6 print:hidden">
                        {/* Hidden for now, will use in future */}
                        {/* <DynamicBreadcrumbs /> */}
                        <HeaderUser />
                    </header>
                    <main className="flex flex-1 flex-col">
                        {children}
                    </main>
                </SidebarInset>
            </AssessmentProvider>
        </SidebarProvider>
    );
}
