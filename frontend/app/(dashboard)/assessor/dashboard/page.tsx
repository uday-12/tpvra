"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Eye, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { MultiSelectFilter } from "@/components/ui/multi-select-filter";
import { getAssessorDashboard, type AssessorAssessment } from "@/apis/dashboard";
import { useAssessorAssessmentFilters } from "@/hooks/use-assessor-assessment-filters";

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

export default function AssessorDashboardPage() {
    const router = useRouter();
    const [vendorFilter, setVendorFilter] = useState<string>("all");
    const [selectedAssessments, setSelectedAssessments] = useState<string[]>([]);
    const [selectedRisks, setSelectedRisks] = useState<string[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [assessments, setAssessments] = useState<AssessorAssessment[]>([]);

    // Fetch filter options from API
    const { data: filtersData } = useAssessorAssessmentFilters();

    // Fetch assessments
    const fetchAssessments = async () => {
        setIsLoading(true);
        try {
            const response = await getAssessorDashboard({
                vendorId: vendorFilter !== "all" ? vendorFilter : "",
                risk: selectedRisks.length > 0 ? selectedRisks.join(",") : "",
                assessmentId: selectedAssessments.length > 0 ? selectedAssessments.join(",") : "",
            });
            setAssessments(response.data);
        } catch (error) {
            console.error("Error fetching assessor dashboard:", error);
            toast.error("Failed to load dashboard data");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchAssessments();
    }, [vendorFilter, selectedRisks, selectedAssessments]);

    // Get unique values for vendor filter (still local)
    const uniqueVendors = Array.from(
        new Map(assessments.map((item) => [item.vendorId, { id: item.vendorId, name: item.vendorName }])).values()
    );

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
                <Select value={vendorFilter} onValueChange={setVendorFilter}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Vendor" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {uniqueVendors.map((vendor) => (
                            <SelectItem key={vendor.id} value={vendor.id}>
                                {vendor.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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
                            <TableHead className="w-[250px]">Vendor</TableHead>
                            <TableHead>Assessment</TableHead>
                            <TableHead className="text-center">Questions Submitted</TableHead>
                            <TableHead className="text-center">Overall Risk</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assessments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="h-24 text-center">
                                    No assessments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            assessments.map((row) => (
                                <TableRow key={row.id}>
                                    <TableCell className="font-medium">{row.vendorName}</TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-400">
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
                                                params.set("vendor", row.vendorName);
                                                params.set("assessment", row.assessmentName);
                                                router.push(`/assessor/risk-profile/${row.submittedAssessmentId || row.id}?${params.toString()}`);
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
