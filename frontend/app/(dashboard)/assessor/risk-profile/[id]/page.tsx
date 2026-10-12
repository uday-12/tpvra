"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Printer, AlertTriangle, Loader2 } from "lucide-react";
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
import { RadarChart } from "@/components/charts/radar-chart";
import { getAssessmentMetrics, type AssessmentMetricsResponse } from "@/apis/dashboard";
import { useAssessmentContext } from "@/contexts/assessment-context";

// Convert risk score (1-5) to label
const getRiskLabelFromScore = (score: number): string => {
    switch (score) {
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

// Convert risk enum to display label
const formatRiskLabel = (risk: string): string => {
    switch (risk) {
        case "CRITICAL":
            return "Critical";
        case "HIGH":
            return "High";
        case "MEDIUM":
            return "Medium";
        case "LOW":
            return "Low";
        case "VERY_LOW":
            return "Very Low";
        default:
            return risk;
    }
};

const getRiskBadgeColor = (risk: string) => {
    switch (risk) {
        case "Critical":
            return "bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400";
        case "High":
            return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400";
        case "Medium":
            return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400";
        case "Low":
            return "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400";
        case "Very Low":
            return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400";
        default:
            return "bg-slate-100 text-slate-700 dark:bg-slate-900/20 dark:text-slate-400";
    }
};

export default function RiskProfilePage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = params?.id as string;

    const vendorName = searchParams.get("vendor") || "Vendor";
    const assessmentName = searchParams.get("assessment") || "Assessment";
    const { setAssessmentTitle } = useAssessmentContext();

    const [isLoading, setIsLoading] = useState(true);
    const [metricsData, setMetricsData] = useState<AssessmentMetricsResponse | null>(null);

    // Set breadcrumb title
    useEffect(() => {
        if (assessmentName) {
            setAssessmentTitle(assessmentName);
        }
    }, [assessmentName, setAssessmentTitle]);

    useEffect(() => {
        const fetchMetrics = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const data = await getAssessmentMetrics(id);
                setMetricsData(data);
            } catch (error) {
                console.error("Error fetching assessment metrics:", error);
                toast.error("Failed to load risk profile data");
            } finally {
                setIsLoading(false);
            }
        };

        fetchMetrics();
    }, [id]);

    // Transform radar chart data
    const radarChartData = metricsData?.riskByCategory.map((item) => ({
        category: item.categoryName,
        value: item.averageScore,
    })) || [];

    // Get overall risk label from score
    const overallRiskLabel = metricsData ? getRiskLabelFromScore(metricsData.overallScore) : "Unknown";

    const handlePrint = () => {
        window.print();
    };

    // Format date for print
    const formatPrintDate = () => {
        const now = new Date();
        return now.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }) + ' at ' + now.toLocaleTimeString('en-GB', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    // Get print badge color class
    const getPrintBadgeColor = (risk: string) => {
        switch (risk) {
            case "Critical":
                return "!bg-purple-600";
            case "High":
                return "!bg-red-600";
            case "Medium":
                return "!bg-yellow-500";
            case "Low":
                return "!bg-green-600";
            case "Very Low":
                return "!bg-emerald-600";
            default:
                return "!bg-slate-600";
        }
    };

    // Get color for overall risk
    const getOverallRiskColor = (risk: string) => {
        switch (risk) {
            case "Critical":
                return "text-purple-600 dark:text-purple-500";
            case "High":
                return "text-red-600 dark:text-red-500";
            case "Medium":
                return "text-yellow-600 dark:text-yellow-500";
            case "Low":
                return "text-green-600 dark:text-green-500";
            case "Very Low":
                return "text-emerald-600 dark:text-emerald-500";
            default:
                return "text-slate-600 dark:text-slate-500";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-6 risk-profile-print-container print:gap-2 print:p-4">
            {/* Print Header - Only visible when printing */}
            <div className="hidden print:flex print:justify-between print:items-center print:pb-2 print:border-b print:border-gray-200 print:mb-2">
                <span className="text-sm text-gray-500">{new Date().toLocaleDateString('en-GB')} {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                <span className="text-sm text-blue-600 font-medium">Risk Profile Report - {assessmentName}</span>
            </div>

            {/* Print Report Title - Only visible when printing */}
            <div className="hidden print:block print:mb-1">
                <h1 className="text-2xl font-bold text-gray-900 mb-0">{assessmentName}</h1>
                <p className="text-sm text-gray-500">Risk Profile Report</p>
            </div>

            {/* Print Overall Risk Badge - Only visible when printing */}
            <div className={`hidden print:inline-flex print:w-fit print:px-4 print:py-1.5 print:rounded-full print:text-white print:text-sm print:font-medium print:mb-2 ${getPrintBadgeColor(overallRiskLabel)}`}>
                Overall Risk: {overallRiskLabel}
            </div>

            {/* Print Separator - Only visible when printing */}
            <div className="hidden print:block print:border-t print:border-gray-200 print:my-2" />

            {/* Back Button - Hidden when printing */}
            <Button
                variant="ghost"
                className="w-fit gap-2 print:hidden"
                onClick={() => router.back()}
            >
                <ArrowLeft className="h-4 w-4" />
                Back
            </Button>

            {/* Header - Hidden when printing */}
            <div className="flex items-start justify-between gap-4 flex-wrap print:hidden">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20">
                        <FileText className="h-8 w-8 text-orange-600 dark:text-orange-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                            {vendorName}
                        </h1>
                        <p className="text-slate-600 dark:text-slate-400">
                            {assessmentName}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-700">
                        <span className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                            Overall Risk
                        </span>
                        <AlertTriangle className={`h-4 w-4 ${getOverallRiskColor(overallRiskLabel)}`} />
                        <span className={`text-lg font-bold ${getOverallRiskColor(overallRiskLabel)}`}>
                            {overallRiskLabel}
                        </span>
                    </div>
                    <Button
                        variant="outline"
                        className="gap-2"
                        onClick={handlePrint}
                    >
                        <Printer className="h-4 w-4" />
                        Print report
                    </Button>
                </div>
            </div>

            {/* Risk by Category */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-6">
                    Risk by Category
                </h2>

                {/* Legend */}
                <div className="flex items-center justify-end gap-6 mb-6 text-sm text-slate-600 dark:text-slate-400">
                    <span>1 = Critical</span>
                    <span>2 = High</span>
                    <span>3 = Medium</span>
                    <span>4 = Low</span>
                    <span>5 = Very Low</span>
                </div>

                <div className="flex items-center justify-center">
                    {radarChartData.length > 0 ? (
                        <RadarChart data={radarChartData} maxValue={5} />
                    ) : (
                        <p className="text-slate-500 dark:text-slate-400 py-8">No category data available</p>
                    )}
                </div>
            </div>

            {/* Questions Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
                <div className="p-6 border-b border-slate-200 dark:border-slate-800">
                    <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
                        Questions ({metricsData?.questions.length || 0})
                    </h2>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[500px] print:w-auto">Question</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead className="text-center">Inherent Risk</TableHead>
                            <TableHead className="text-center">Residual Risk</TableHead>
                            <TableHead className="hidden print:table-cell">
                                Risk, Threat & Vulnerability
                            </TableHead>
                            <TableHead className="hidden print:table-cell">
                                Recommendation
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!metricsData?.questions.length ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No questions found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            metricsData.questions.map((question) => (
                                <TableRow key={question.id}>
                                    <TableCell className="font-normal">
                                        {question.title}
                                    </TableCell>
                                    <TableCell className="text-slate-600 dark:text-slate-400">
                                        {question.categoryName}
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={getRiskBadgeColor(formatRiskLabel(question.defaultRisk))}>
                                            {formatRiskLabel(question.defaultRisk)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge className={getRiskBadgeColor(formatRiskLabel(question.assignedRisk))}>
                                            {formatRiskLabel(question.assignedRisk)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="hidden print:table-cell text-sm text-slate-600 dark:text-slate-400">
                                        {question.riskThreatVulnerability || "-"}
                                    </TableCell>
                                    <TableCell className="hidden print:table-cell text-sm text-slate-600 dark:text-slate-400">
                                        {question.recommendation || "-"}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Print Footer - Only visible when printing */}
            <div className="hidden print:block print:mt-8 print:pt-4 print:text-sm print:text-gray-400">
                Generated on {formatPrintDate()}
            </div>
        </div>
    );
}
