"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Download, Eye, Loader2, Info } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { getVendorAssessments, getAssessmentQuestions, getAssessmentReview, type AssessmentQuestion } from "@/apis/vendorAssessments"
import { generateAssessmentPDF } from "@/lib/pdf-generator"
import { useSession } from "@/lib/auth-client"
import { useAssessorAssessmentFilters } from "@/hooks/use-assessor-assessment-filters"

// Types
type PendingAssessment = {
    id: string
    assessmentId: string
    assessmentName: string
    vendorName: string
    assignedDate: string
    dueDate: string
    parentAssessmentId: string
}

type SubmittedAssessment = {
    id: string
    assessmentId: string
    assessmentName: string
    vendorName: string
    assignedDate: string
    submittedDate: string
}

type AssessmentDetails = {
    title: string
    vendorName: string
    questions: AssessmentQuestion[]
}

export default function AssessorAssessmentsPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState<"pending" | "submitted">("submitted")
    const [vendorFilter, setVendorFilter] = useState<string[]>([])
    const [assessmentFilter, setAssessmentFilter] = useState<string[]>([])
    const [isMounted, setIsMounted] = useState(false)

    // Fetch filter options from API
    const { data: filtersData } = useAssessorAssessmentFilters()

    // API state
    const [pendingAssessments, setPendingAssessments] = useState<PendingAssessment[]>([])
    const [submittedAssessments, setSubmittedAssessments] = useState<SubmittedAssessment[]>([])
    const [isLoadingPending, setIsLoadingPending] = useState(false)
    const [isLoadingSubmitted, setIsLoadingSubmitted] = useState(false)

    // Pagination state
    const ITEMS_PER_PAGE = 10
    const [pendingPage, setPendingPage] = useState(1)
    const [pendingTotalPages, setPendingTotalPages] = useState(1)
    const [pendingHasNextPage, setPendingHasNextPage] = useState(false)
    const [pendingHasPrevPage, setPendingHasPrevPage] = useState(false)

    const [submittedPage, setSubmittedPage] = useState(1)
    const [submittedTotalPages, setSubmittedTotalPages] = useState(1)
    const [submittedHasNextPage, setSubmittedHasNextPage] = useState(false)
    const [submittedHasPrevPage, setSubmittedHasPrevPage] = useState(false)

    // Dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedAssessment, setSelectedAssessment] = useState<AssessmentDetails | null>(null)
    const [isLoadingAssessment, setIsLoadingAssessment] = useState(false)
    const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)

    // Ref to track if tab just changed (to prevent double fetch)
    const isTabChanging = useRef(false)

    // Handle mounting to prevent hydration errors
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Fetch pending assessments with filters
    const fetchPendingAssessments = async (
        page: number = pendingPage,
        filters?: { vendorIds?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingPending(true)
        try {
            const filterParams = filters || {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            }

            const response = await getVendorAssessments({
                fetchBy: 'pending',
                assessorId: session?.user?.id || '',
                page,
                limit: ITEMS_PER_PAGE,
                vendorIds: filterParams.vendorIds?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
            })

            // Map API response to component format
            const mapped: PendingAssessment[] = response.assignments.map((assessment) => ({
                id: assessment.id,
                assessmentId: assessment.id.split('-')[0].toUpperCase().substring(0, 3),
                assessmentName: assessment.parentAssessment.title,
                vendorName: assessment.vendor.name,
                assignedDate: formatDate(assessment.assignedDate),
                dueDate: formatDate(assessment.dueDate),
                parentAssessmentId: assessment.parentAssessmentId,
            }))

            setPendingAssessments(mapped)
            setPendingTotalPages(response.totalPages)
            setPendingHasNextPage(response.hasNextPage)
            setPendingHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching pending assessments:", error)
            toast.error("Failed to fetch pending assessments")
        } finally {
            setIsLoadingPending(false)
        }
    }

    // Handle pending page change
    const handlePendingPageChange = (page: number) => {
        setPendingPage(page)
        fetchPendingAssessments(page)
    }

    // Fetch submitted assessments with filters
    const fetchSubmittedAssessments = async (
        page: number = submittedPage,
        filters?: { vendorIds?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingSubmitted(true)
        try {
            const filterParams = filters || {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            }

            const response = await getVendorAssessments({
                fetchBy: 'submitted',
                assessorId: session?.user?.id || '',
                page,
                limit: ITEMS_PER_PAGE,
                vendorIds: filterParams.vendorIds?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
            })

            // Map API response to component format
            const mapped: SubmittedAssessment[] = response.assignments.map((assessment) => ({
                id: assessment.id,
                assessmentId: assessment.id.split('-')[0].toUpperCase().substring(0, 3),
                assessmentName: assessment.parentAssessment.title,
                vendorName: assessment.vendor.name,
                assignedDate: formatDate(assessment.assignedDate),
                submittedDate: formatDate(assessment.updatedAt),
            }))

            setSubmittedAssessments(mapped)
            setSubmittedTotalPages(response.totalPages)
            setSubmittedHasNextPage(response.hasNextPage)
            setSubmittedHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching submitted assessments:", error)
            toast.error("Failed to fetch submitted assessments")
        } finally {
            setIsLoadingSubmitted(false)
        }
    }

    // Handle submitted page change
    const handleSubmittedPageChange = (page: number) => {
        setSubmittedPage(page)
        fetchSubmittedAssessments(page)
    }

    // Format date helper
    const formatDate = (dateString: string) => {
        const date = new Date(dateString)
        return date.toLocaleDateString("en-US", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
        })
    }

    // Get filter options from filtersData
    const vendorOptions = filtersData?.vendorCounts?.map(v => ({
        value: v.id,
        label: v.name
    })) || []

    const assessmentOptions = filtersData?.assessmentCounts?.map(a => ({
        value: a.id,
        label: a.name
    })) || []

    // Fetch data on mount and tab change - reset filters when switching tabs
    useEffect(() => {
        if (!isMounted || !session?.user?.id) return

        // Mark that tab is changing
        isTabChanging.current = true

        // Reset filters when switching tabs
        setVendorFilter([])
        setAssessmentFilter([])

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingAssessments(1, {
                vendorIds: [],
                assessmentIds: [],
            })
        } else {
            setSubmittedPage(1)
            fetchSubmittedAssessments(1, {
                vendorIds: [],
                assessmentIds: [],
            })
        }

        // Reset the flag after a short delay
        setTimeout(() => {
            isTabChanging.current = false
        }, 100)
    }, [activeTab, session?.user?.id, isMounted])

    // Refetch data when filters change (skip if tab just changed)
    useEffect(() => {
        if (!isMounted || !session?.user?.id) return
        if (isTabChanging.current) return

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingAssessments(1, {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            })
        } else {
            setSubmittedPage(1)
            fetchSubmittedAssessments(1, {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            })
        }
    }, [vendorFilter, assessmentFilter])

    // Handle viewing assessment
    const handleViewAssessment = async (assessment: PendingAssessment) => {
        setIsLoadingAssessment(true)
        setIsViewDialogOpen(true)
        try {
            const response = await getAssessmentQuestions(assessment.parentAssessmentId)
            setSelectedAssessment({
                title: assessment.assessmentName,
                vendorName: assessment.vendorName,
                questions: response.questions || [],
            })
        } catch (error) {
            console.error("Error fetching assessment questions:", error)
            toast.error("Failed to load assessment questions")
            setIsViewDialogOpen(false)
        } finally {
            setIsLoadingAssessment(false)
        }
    }

    // Handle PDF download for submitted assessment
    const handleDownloadPdf = async (assessment: SubmittedAssessment) => {
        setDownloadingPdfId(assessment.id)
        try {
            const review = await getAssessmentReview(assessment.id)
            if (review && review.questions) {
                generateAssessmentPDF({
                    assessmentName: assessment.assessmentName,
                    assessorName: session?.user?.name || 'Assessor',
                    vendorName: assessment.vendorName,
                    submittedAt: assessment.submittedDate,
                    questions: review.questions,
                })
                toast.success("PDF downloaded successfully")
            }
        } catch (error) {
            console.error("Error generating PDF:", error)
            toast.error("Failed to generate PDF")
        } finally {
            setDownloadingPdfId(null)
        }
    }

    // Pending assessments (filters are now handled by API)
    const filteredPendingAssessments = pendingAssessments

    // Submitted assessments (filters are now handled by API)
    const filteredSubmittedAssessments = submittedAssessments

    if (!isMounted) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
                <p className="text-sm text-muted-foreground">
                    Review and manage vendor assessments
                </p>
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <Button
                    variant="ghost"
                    className={activeTab === "submitted"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("submitted")}
                >
                    Submitted ({filtersData?.submittedCount ?? 0})
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "pending"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending ({filtersData?.pendingCount ?? 0})
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <MultiSelectFilter
                    options={vendorOptions}
                    selectedValues={vendorFilter}
                    onSelectionChange={setVendorFilter}
                    placeholder="Vendor"
                    allLabel="All Vendors"
                    triggerClassName="w-[200px]"
                />

                <MultiSelectFilter
                    options={assessmentOptions}
                    selectedValues={assessmentFilter}
                    onSelectionChange={setAssessmentFilter}
                    placeholder="Assessment"
                    allLabel="All Assessments"
                    triggerClassName="w-[200px]"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                {activeTab === "pending" ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-semibold uppercase">Assessment</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Vendor</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Assigned Date</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Due Date</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPending ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPendingAssessments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No pending assessments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPendingAssessments.map((assessment) => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{assessment.assessmentName}</TableCell>
                                        <TableCell className="text-muted-foreground">{assessment.vendorName}</TableCell>
                                        <TableCell>{assessment.assignedDate}</TableCell>
                                        <TableCell>{assessment.dueDate}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="text-muted-foreground hover:bg-sidebar-accent-foreground hover:text-white"
                                                onClick={() => handleViewAssessment(assessment)}
                                            >
                                                <Eye className="mr-1 h-4 w-4" />
                                                View
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-semibold uppercase">Assessment</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Vendor</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Assigned Date</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Submitted Date</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSubmitted ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredSubmittedAssessments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No submitted assessments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubmittedAssessments.map((assessment) => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{assessment.assessmentName}</TableCell>
                                        <TableCell className="text-muted-foreground">{assessment.vendorName}</TableCell>
                                        <TableCell>{assessment.assignedDate}</TableCell>
                                        <TableCell>{assessment.submittedDate}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                                    onClick={() => router.push(`/assessor/assessments/${assessment.id}/review?name=${encodeURIComponent(assessment.assessmentName)}`)}
                                                >
                                                    <Eye className="mr-1 h-4 w-4" />
                                                    Review
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-gray-700 hover:bg-sidebar-accent-foreground hover:text-white"
                                                    onClick={() => handleDownloadPdf(assessment)}
                                                    disabled={downloadingPdfId === assessment.id}
                                                >
                                                    {downloadingPdfId === assessment.id ? (
                                                        <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                                                    ) : (
                                                        <Download className="mr-1 h-4 w-4" />
                                                    )}
                                                    Download
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                )}
            </div>

            {/* Pagination */}
            {activeTab === "pending" ? (
                <Pagination
                    currentPage={pendingPage}
                    totalPages={pendingTotalPages}
                    hasNextPage={pendingHasNextPage}
                    hasPrevPage={pendingHasPrevPage}
                    onPageChange={handlePendingPageChange}
                    isLoading={isLoadingPending}
                />
            ) : (
                <Pagination
                    currentPage={submittedPage}
                    totalPages={submittedTotalPages}
                    hasNextPage={submittedHasNextPage}
                    hasPrevPage={submittedHasPrevPage}
                    onPageChange={handleSubmittedPageChange}
                    isLoading={isLoadingSubmitted}
                />
            )}

            {/* Assessment View Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b pb-4">
                        <DialogTitle className="text-xl">
                            {selectedAssessment?.title} for {selectedAssessment?.vendorName}
                        </DialogTitle>
                        <DialogDescription className="sr-only">
                            View assessment questions and details
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto py-4">
                        {isLoadingAssessment ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : selectedAssessment && selectedAssessment.questions.length > 0 ? (
                            <div className="space-y-4">
                                {selectedAssessment.questions
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                                    .map((question, index) => {
                                        const getRiskBadge = (rating: string) => {
                                            switch (rating) {
                                                case "HIGH":
                                                    return { label: "High", className: "bg-red-100 text-red-700 border-red-200" }
                                                case "MEDIUM":
                                                    return { label: "Medium", className: "bg-orange-100 text-orange-700 border-orange-200" }
                                                case "LOW":
                                                    return { label: "Low", className: "bg-green-100 text-green-700 border-green-200" }
                                                default:
                                                    return { label: "Critical", className: "bg-purple-100 text-purple-700 border-purple-200" }
                                            }
                                        }

                                        const getQuestionTypeLabel = (type: string) => {
                                            switch (type) {
                                                case "TEXT":
                                                    return "Text"
                                                case "NUMBER":
                                                    return "Number"
                                                case "BOOLEAN":
                                                    return "Yes/No"
                                                case "SINGLE_CHOICE":
                                                    return "Single Choice"
                                                case "MULTIPLE_CHOICE":
                                                    return "Multiple Choice"
                                                case "FILE_UPLOAD":
                                                    return "File Upload"
                                                default:
                                                    return type
                                            }
                                        }

                                        const riskBadge = getRiskBadge(question.riskRating)

                                        return (
                                            <div key={question.id} className="border rounded-lg p-4 bg-white hover:shadow-sm transition-shadow">
                                                <div className="flex items-start gap-3">
                                                    <span className="font-semibold text-gray-700 mt-0.5">{index + 1}.</span>
                                                    <div className="flex-1 space-y-3">
                                                        <div className="flex items-start justify-between gap-4">
                                                            <p className="font-medium text-gray-900 flex-1">
                                                                {question.questionText}
                                                            </p>
                                                            <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                                                        </div>

                                                        <div className="flex items-center gap-3 text-sm">
                                                            <span className="text-gray-600">
                                                                {question.category?.name || "Uncategorized"}
                                                            </span>
                                                            <span className="text-gray-300">•</span>
                                                            <span className="text-gray-600">
                                                                {getQuestionTypeLabel(question.questionType)}
                                                            </span>
                                                            <span className="text-gray-300">•</span>
                                                            <Badge
                                                                variant="outline"
                                                                className={riskBadge.className}
                                                            >
                                                                {riskBadge.label}
                                                            </Badge>
                                                        </div>

                                                        {/* Show options for multiple choice questions */}
                                                        {(question.questionType === "SINGLE_CHOICE" || question.questionType === "MULTIPLE_CHOICE") &&
                                                         question.options && question.options.length > 0 && (
                                                            <div className="mt-2 pl-4 border-l-2 border-gray-200">
                                                                <p className="text-sm text-gray-600 mb-2">Options:</p>
                                                                <ul className="space-y-1">
                                                                    {question.options
                                                                        .sort((a, b) => a.sequence - b.sequence)
                                                                        .map((option) => (
                                                                            <li key={option.id} className="text-sm text-gray-700">
                                                                                • {option.option}
                                                                            </li>
                                                                        ))}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                            </div>
                        ) : (
                            <div className="text-center py-12 text-gray-500">
                                No questions found for this assessment.
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsViewDialogOpen(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
