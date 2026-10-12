"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import {
    getVendorDashboard,
    type VendorAssessment,
} from "@/apis/dashboard";
import { useVendorAssessmentFilters } from "@/hooks/use-vendor-assessment-filters";

// Map numeric risk to display string (1=Critical, 2=High, 3=Medium, 4=Low, 5=Very Low)
const getRiskLabel = (risk: number): string => {
    switch (risk) {
        case 1:
            return "Critical";
        case 2:
            return "High";
        case 3:
            return "Medium";
        case 4:
            return "Low";
        case 5:
            return "Very Low";
        default:
            return "Not Assigned";
    }
};

const getRiskBadgeColor = (risk: number) => {
    switch (risk) {
        case 1:
            return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400";
        case 2:
            return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
        case 3:
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
        case 4:
            return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
        case 5:
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
        default:
            return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400";
    }
};

const RISK_OPTIONS = [
    { value: "1", label: "Critical" },
    { value: "2", label: "High" },
    { value: "3", label: "Medium" },
    { value: "4", label: "Low" },
    { value: "5", label: "Very Low" },
];

export default function VendorDashboardPage() {
    const router = useRouter();
    const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
    const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [assessments, setAssessments] = useState<VendorAssessment[]>([]);

    // Fetch filter options from API
    const { data: filtersData } = useVendorAssessmentFilters();

    // Fetch assessments
    const fetchAssessments = async () => {
        setIsLoading(true);
        try {
            const response = await getVendorDashboard({
                risk: selectedRisks.length > 0 ? selectedRisks.join(",") : "",
                assessmentId: selectedAssessments.length > 0 ? selectedAssessments.join(",") : "",
            });
            setAssessments(response.data);
        } catch (error) {
            console.error("Error fetching vendor dashboard:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssessments();
    }, [selectedRisks, selectedAssessments]);

    // Get assessment options from API
    const assessmentOptions = (filtersData?.assessmentCounts || []).map((a) => ({
        value: a.id,
        label: a.name,
    }));

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

            {/* Filters */}
            <div className="flex gap-4 flex-wrap">
                <MultiSelectFilter
                    options={assessmentOptions}
                    selectedValues={selectedAssessments}
                    onSelectionChange={setSelectedAssessments}
                    placeholder="Assessment"
                    allLabel="All Assessments"
                    triggerClassName="w-[200px]"
                />

                <MultiSelectFilter
                    options={RISK_OPTIONS}
                    selectedValues={selectedRisks}
                    onSelectionChange={setSelectedRisks}
                    placeholder="Risk"
                    allLabel="All Risk Levels"
                    triggerClassName="w-[160px]"
                />
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[350px]">Assessment</TableHead>
                            <TableHead className="text-center">Questions Submitted</TableHead>
                            <TableHead className="text-center">Overall Risk</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assessments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={4} className="h-24 text-center">
                                    No assessments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            assessments.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">
                                        {row.assessmentName}
                                    </TableCell>
                                    <TableCell className="text-center">{row.questionsSubmitted}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={getRiskBadgeColor(row.overallRisk)}>
                                            {getRiskLabel(row.overallRisk)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                const params = new URLSearchParams();
                                                params.set("assessment", row.assessmentName);
                                                router.push(`/vendor/risk-profile/${row.submittedAssessmentId || row.id}?${params.toString()}`);
                                            }}
                                            className="gap-2"
                                        >
                                            <Eye className="h-4 w-4" />
                                            View risk profile
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
