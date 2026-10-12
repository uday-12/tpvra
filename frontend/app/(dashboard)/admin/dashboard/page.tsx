"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Users, Building2, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAdminDashboard, type AdminDashboardResponse } from "@/apis/dashboard";

interface StatCardProps {
    title: string;
    icon: React.ElementType;
    iconColor: string;
    iconBgColor: string;
    total: number;
    stats: Array<{
        label: string;
        count: number;
        bgColor: string;
    }>;
    viewLink: string;
}

function StatCard({ title, icon: Icon, iconColor, iconBgColor, total, stats, viewLink }: StatCardProps) {
    const router = useRouter();

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
                <div>
                    <h3 className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">
                        {title}
                    </h3>
                    <p className="text-3xl font-bold text-slate-900 dark:text-white">
                        {total}
                    </p>
                </div>
                <div className={`p-3 rounded-lg ${iconBgColor}`}>
                    <Icon className={`h-6 w-6 ${iconColor}`} />
                </div>
            </div>

            <div className="space-y-2.5 mb-6">
                {stats.map((stat) => (
                    <div key={stat.label} className="flex items-center justify-between text-sm">
                        <span className="text-slate-600 dark:text-slate-400">{stat.label}</span>
                        <Badge
                            className={`${stat.bgColor} min-w-[28px] justify-center`}
                        >
                            {stat.count}
                        </Badge>
                    </div>
                ))}
            </div>

            <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(viewLink)}
            >
                View
            </Button>
        </div>
    );
}

export default function AdminDashboardPage() {
    const [dashboardData, setDashboardData] = useState<AdminDashboardResponse | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchDashboard = async () => {
            try {
                const data = await getAdminDashboard();
                setDashboardData(data);
            } catch (error) {
                console.error("Error fetching dashboard data:", error);
                toast.error("Failed to load dashboard data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchDashboard();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            <div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {/* Assessors Card */}
                <StatCard
                    title="Assessors"
                    icon={Users}
                    iconColor="text-orange-600"
                    iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                    total={dashboardData?.assessors.total || 0}
                    stats={[
                        { label: "Active", count: dashboardData?.assessors.active || 0, bgColor: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                        { label: "Inactive", count: dashboardData?.assessors.inactive || 0, bgColor: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
                    ]}
                    viewLink="/admin/assessors"
                />

                {/* Vendors Card */}
                <StatCard
                    title="Vendors"
                    icon={Building2}
                    iconColor="text-orange-600"
                    iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                    total={dashboardData?.vendors.total || 0}
                    stats={[
                        { label: "Active", count: dashboardData?.vendors.active || 0, bgColor: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                        { label: "Inactive", count: dashboardData?.vendors.inactive || 0, bgColor: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400" },
                    ]}
                    viewLink="/admin/vendors"
                />

                {/* Assessments Card */}
                <StatCard
                    title="Assessments"
                    icon={FileText}
                    iconColor="text-orange-600"
                    iconBgColor="bg-orange-50 dark:bg-orange-900/20"
                    total={dashboardData?.assessments.total || 0}
                    stats={[
                        { label: "Assigned", count: dashboardData?.assessments.assigned || 0, bgColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400" },
                        { label: "In-progress", count: dashboardData?.assessments.inProgress || 0, bgColor: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400" },
                        { label: "Submitted", count: dashboardData?.assessments.submitted || 0, bgColor: "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400" },
                    ]}
                    viewLink="/admin/assessments"
                />
            </div>
        </div>
    );
}
