"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Download, Eye, Search, Loader2, Paperclip } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { MultiSelectFilter, type MultiSelectOption } from "@/components/ui/multi-select-filter"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { getVendorAssessments, getAssessmentReview, getFilePresignedUrl, type VendorAssessment, type AssessmentReviewResponse } from "@/apis/vendorAssessments"
import { generateAssessmentPDF } from "@/lib/pdf-generator"
import { useSession } from "@/lib/auth-client"
import { useVendorAssessmentFilters } from "@/hooks/use-vendor-assessment-filters"

// Types
type PendingAssessment = {
    id: string
    assessmentName: string
    assessorName: string
    status: "not_started" | "in_progress" | "completed"
    dueDate: string
    daysLeft: number
    assignedDate: string
    parentAssessmentId: string
    submittedAssessmentId?: string // Used when status is in_progress
}

type SubmittedAssessment = {
    id: string
    assessmentName: string
    assessorName: string
    submittedAt: string
}

export default function VendorAssessmentsPage() {
    const router = useRouter()
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending")
    const [searchQuery, setSearchQuery] = useState("")
    const [assessmentFilter, setAssessmentFilter] = useState<string[]>([])
    const [statusFilter, setStatusFilter] = useState<string[]>([])
    const [assessorFilter, setAssessorFilter] = useState<string[]>([])
    const [isMounted, setIsMounted] = useState(false)

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

    // View dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedAssessmentId, setSelectedAssessmentId] = useState<string | null>(null)
    const [selectedAssessment, setSelectedAssessment] = useState<SubmittedAssessment | null>(null)
    const [assessmentReview, setAssessmentReview] = useState<AssessmentReviewResponse | null>(null)
    const [isLoadingReview, setIsLoadingReview] = useState(false)
    const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null)
    const [downloadingPdfId, setDownloadingPdfId] = useState<string | null>(null)

    // Fetch counts from filters API (vendorId is determined from session cookie on backend)
    const { data: filtersData } = useVendorAssessmentFilters()

    // Handle mounting to prevent hydration errors
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Map UI status to API status
    const mapUIStatusToAPI = (status: string): string => {
        const statusMap: Record<string, string> = {
            not_started: 'ASSIGNED',
            in_progress: 'IN_PROGRESS',
            completed: 'SUBMITTED',
        }
        return statusMap[status] || status
    }

    // Fetch pending assessments with filters
    const fetchPendingAssessments = async (
        page: number = pendingPage,
        filters?: { assessorIds?: string[]; statuses?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingPending(true)
        try {
            const filterParams = filters || {
                assessorIds: assessorFilter,
                statuses: statusFilter,
                assessmentIds: assessmentFilter,
            }

            const response = await getVendorAssessments({
                fetchBy: 'pending',
                vendorId: session?.user?.id || '',
                page,
                limit: ITEMS_PER_PAGE,
                assessorIds: filterParams.assessorIds?.join(',') || '',
                statuses: filterParams.statuses?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
            })

            // Map API response to component format
            const mapped: PendingAssessment[] = response.assignments.map((assessment) => ({
                id: assessment.id,
                assessmentName: assessment.parentAssessment.title,
                assessorName: assessment.assessor.name,
                status: mapApiStatusToUI(assessment.status),
                dueDate: formatDate(assessment.dueDate),
                daysLeft: assessment.daysLeft,
                assignedDate: formatDate(assessment.assignedDate),
                parentAssessmentId: assessment.parentAssessmentId,
                submittedAssessmentId: assessment.submittedAssessmentId,
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
        filters?: { assessorIds?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingSubmitted(true)
        try {
            const filterParams = filters || {
                assessorIds: assessorFilter,
                assessmentIds: assessmentFilter,
            }

            const response = await getVendorAssessments({
                fetchBy: 'submitted',
                vendorId: session?.user?.id || '',
                page,
                limit: ITEMS_PER_PAGE,
                assessorIds: filterParams.assessorIds?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
            })

            // Map API response to component format
            const mapped: SubmittedAssessment[] = response.assignments.map((assessment) => ({
                id: assessment.id,
                assessmentName: assessment.parentAssessment.title,
                assessorName: assessment.assessor.name,
                submittedAt: formatDate(assessment.updatedAt),
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
        return date.toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
        })
    }

    // Map API status to UI status
    const mapApiStatusToUI = (status: string): "not_started" | "in_progress" | "completed" => {
        switch (status) {
            case "ASSIGNED":
                return "not_started"
            case "IN_PROGRESS":
                return "in_progress"
            case "SUBMITTED":
                return "completed"
            default:
                return "not_started"
        }
    }

    // Ref to track if tab just changed (to prevent double fetch)
    const isTabChanging = useRef(false)

    // Fetch data on mount and tab change - reset filters when switching tabs
    useEffect(() => {
        if (!isMounted || !session?.user?.id) return

        // Mark that tab is changing
        isTabChanging.current = true

        // Reset filters when switching tabs
        setAssessmentFilter([])
        setStatusFilter([])
        setAssessorFilter([])

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingAssessments(1, {
                assessorIds: [],
                statuses: [],
                assessmentIds: [],
            })
        } else {
            setSubmittedPage(1)
            fetchSubmittedAssessments(1, {
                assessorIds: [],
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
                assessorIds: assessorFilter,
                statuses: statusFilter,
                assessmentIds: assessmentFilter,
            })
        } else {
            setSubmittedPage(1)
            fetchSubmittedAssessments(1, {
                assessorIds: assessorFilter,
                assessmentIds: assessmentFilter,
            })
        }
    }, [assessorFilter, statusFilter, assessmentFilter])

    // Get assessor options from filtersData (with IDs)
    const assessorOptions = filtersData?.assessorCounts?.map(a => ({
        value: a.id,
        label: a.name
    })) || []

    // Get assessment options from filtersData (with IDs)
    const assessmentOptions = filtersData?.assessmentCounts?.map(a => ({
        value: a.id,
        label: a.name
    })) || []

    // Pending assessments (filters are now handled by API)
    const filteredPendingAssessments = pendingAssessments

    // Submitted assessments (filters are now handled by API)
    const filteredSubmittedAssessments = submittedAssessments

    // Get status badge variant
    const getStatusVariant = (status: string) => {
        switch (status) {
            case "not_started":
                return "secondary"
            case "in_progress":
                return "secondary"
            case "completed":
                return "success"
            default:
                return "secondary"
        }
    }

    // Get status display
    const getStatusDisplay = (status: string) => {
        return status.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ")
    }

    // Handle view submitted assessment
    const handleViewSubmittedAssessment = async (assessment: SubmittedAssessment) => {
        setSelectedAssessmentId(assessment.id)
        setSelectedAssessment(assessment)
        setIsViewDialogOpen(true)
        setIsLoadingReview(true)

        try {
            const review = await getAssessmentReview(assessment.id)
            setAssessmentReview(review)
        } catch (error) {
            console.error("Error fetching assessment review:", error)
            toast.error("Failed to load assessment details")
            setIsViewDialogOpen(false)
        } finally {
            setIsLoadingReview(false)
        }
    }

    // Close dialog and reset state
    const handleCloseDialog = () => {
        setIsViewDialogOpen(false)
        setSelectedAssessmentId(null)
        setSelectedAssessment(null)
        setAssessmentReview(null)
    }

    // Handle file download using presigned URL
    const handleFileDownload = async (fileKey: string, fileName: string) => {
        setDownloadingFileKey(fileKey)
        try {
            const response = await getFilePresignedUrl(fileKey, fileName)
            if (response.success && response.data?.url) {
                // Open the presigned URL - browser will download due to Content-Disposition header
                window.open(response.data.url, '_blank')
            }
        } catch (error) {
            console.error("Error downloading file:", error)
            toast.error("Failed to download file")
        } finally {
            setDownloadingFileKey(null)
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
                    assessorName: assessment.assessorName,
                    vendorName: review.vendorName,
                    submittedAt: assessment.submittedAt,
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
                    View and manage your assessments
                </p>
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <Button
                    variant="ghost"
                    className={activeTab === "pending"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending ({filtersData?.pendingCount ?? 0})
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "submitted"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("submitted")}
                >
                    Submitted ({filtersData?.submittedCount ?? 0})
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <MultiSelectFilter
                    options={assessmentOptions}
                    selectedValues={assessmentFilter}
                    onSelectionChange={setAssessmentFilter}
                    placeholder="Assessment"
                    allLabel="All Assessments"
                    triggerClassName="w-[200px]"
                />

                {activeTab === "pending" && (
                    <MultiSelectFilter
                        options={[
                            { value: "not_started", label: "Not Started" },
                            { value: "in_progress", label: "In Progress" },
                            { value: "completed", label: "Completed" },
                        ]}
                        selectedValues={statusFilter}
                        onSelectionChange={setStatusFilter}
                        placeholder="Status"
                        allLabel="All Statuses"
                        triggerClassName="w-[180px]"
                    />
                )}

                <MultiSelectFilter
                    options={assessorOptions}
                    selectedValues={assessorFilter}
                    onSelectionChange={setAssessorFilter}
                    placeholder="Assessor"
                    allLabel="All Assessors"
                    triggerClassName="w-[200px]"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                {activeTab === "pending" ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ASSESSMENT NAME</TableHead>
                                <TableHead>ASSESSOR NAME</TableHead>
                                <TableHead>STATUS</TableHead>
                                <TableHead>DUE DATE</TableHead>
                                <TableHead>DAYS LEFT</TableHead>
                                <TableHead>ASSIGNED DATE</TableHead>
                                <TableHead>ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPending ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPendingAssessments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No pending assessments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPendingAssessments.map((assessment) => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{assessment.assessmentName}</TableCell>
                                        <TableCell>{assessment.assessorName}</TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className="bg-amber-50 text-amber-700 border-amber-200"
                                            >
                                                {getStatusDisplay(assessment.status)}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>{assessment.dueDate}</TableCell>
                                        <TableCell>{assessment.daysLeft} days</TableCell>
                                        <TableCell>{assessment.assignedDate}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                                onClick={() => {
                                                    // If status is in_progress, pass submittedAssessmentId, otherwise pass parentAssessmentId
                                                    const params = new URLSearchParams()

                                                    if (assessment.status === "in_progress" && assessment.submittedAssessmentId) {
                                                        params.set('submittedAssessmentId', assessment.submittedAssessmentId)
                                                    } else {
                                                        params.set('parentAssessmentId', assessment.parentAssessmentId)
                                                    }
                                                    params.set('name', assessment.assessmentName)

                                                    router.push(`/vendor/assessments/${assessment.id}?${params.toString()}`)
                                                }}
                                            >
                                                Submit
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
                                <TableHead>ASSESSMENT NAME</TableHead>
                                <TableHead>ASSESSOR NAME</TableHead>
                                <TableHead>SUBMITTED AT</TableHead>
                                <TableHead>ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSubmitted ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredSubmittedAssessments.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No submitted assessments found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredSubmittedAssessments.map((assessment) => (
                                    <TableRow key={assessment.id}>
                                        <TableCell className="font-medium">{assessment.assessmentName}</TableCell>
                                        <TableCell>{assessment.assessorName}</TableCell>
                                        <TableCell>{assessment.submittedAt}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                    onClick={() => handleViewSubmittedAssessment(assessment)}
                                                >
                                                    <Eye className="mr-1 h-4 w-4" />
                                                    View
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="hover:bg-gray-100 hover:text-gray-900"
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

            {/* View Submitted Assessment Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={handleCloseDialog}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-semibold">
                            {selectedAssessment?.assessmentName || "Assessment Details"}
                        </DialogTitle>
                        <DialogDescription asChild>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400 mt-1">
                                {/* <div>
                                    <span className="font-medium text-slate-900 dark:text-slate-300">ID:</span>{" "}
                                    {selectedAssessmentId?.slice(0, 7) || "-"}
                                </div> */}
                                <div>
                                    <span className="font-medium text-slate-900 dark:text-slate-300">Assessor:</span>{" "}
                                    {selectedAssessment?.assessorName || "-"}
                                </div>
                                <div>
                                    <span className="font-medium text-slate-900 dark:text-slate-300">Submitted:</span>{" "}
                                    {selectedAssessment?.submittedAt || "-"}
                                </div>
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        {isLoadingReview ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                        ) : assessmentReview ? (
                            <>
                                {assessmentReview.questions.map((question, index) => {
                                    // Helper to get display value for answer
                                    const getAnswerDisplay = () => {
                                        if (!question.answer) return "No answer provided"

                                        // For SINGLE_CHOICE and MULTIPLE_CHOICE, convert IDs to option text
                                        if ((question.questionType === 'SINGLE_CHOICE' || question.questionType === 'MULTIPLE_CHOICE') && question.options) {
                                            const selectedIds = question.answer.split(',').map(id => id.trim())
                                            const selectedOptions = selectedIds
                                                .map(id => {
                                                    const option = question.options?.find(opt => String(opt.id) === id)
                                                    return option?.option || id
                                                })
                                                .join(', ')
                                            return selectedOptions
                                        }

                                        return question.answer
                                    }

                                    return (
                                    <div
                                        key={question.questionId}
                                        className="border border-slate-200 dark:border-slate-700 rounded-lg p-5"
                                    >
                                        <div className="font-medium text-slate-900 dark:text-white mb-4">
                                            {index + 1}. {question.questionText}
                                        </div>

                                        {/* Answer and Explanation in gray box */}
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-4">
                                            {/* Answer Section */}
                                            <div>
                                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                                    Answer
                                                </div>
                                                <div className="text-slate-700 dark:text-slate-300">
                                                    {getAnswerDisplay()}
                                                </div>
                                                {question.answerFile && (
                                                    <div className="flex items-center justify-between mt-2 bg-white dark:bg-slate-700 rounded-md p-3 border border-slate-200 dark:border-slate-600">
                                                        <div className="flex items-center gap-2">
                                                            <Paperclip className="h-4 w-4 text-slate-400" />
                                                            <span className="text-sm text-slate-600 dark:text-slate-400">
                                                                {question.answerFile.name}
                                                            </span>
                                                        </div>
                                                        <button
                                                            onClick={() => question.answerFile?.s3_key && handleFileDownload(question.answerFile.s3_key, question.answerFile.name)}
                                                            disabled={downloadingFileKey === question.answerFile?.s3_key}
                                                            className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {downloadingFileKey === question.answerFile?.s3_key ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Download className="h-4 w-4" />
                                                            )}
                                                            Download
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Explanation Section */}
                                            {question.explanation && (
                                                <div>
                                                    <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">
                                                        Explanation
                                                    </div>
                                                    <div className="text-slate-700 dark:text-slate-300">
                                                        {question.explanation}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Supporting File Section - separate from gray box */}
                                        {question.supportingFile && (
                                            <div className="mt-4">
                                                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                                                    Supporting File
                                                </div>
                                                <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 rounded-md p-3 border border-slate-200 dark:border-slate-600">
                                                    <div className="flex items-center gap-2">
                                                        <Paperclip className="h-4 w-4 text-slate-400" />
                                                        <span className="text-sm text-slate-600 dark:text-slate-400">
                                                            {question.supportingFile.name}
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => question.supportingFile?.s3_key && handleFileDownload(question.supportingFile.s3_key, question.supportingFile.name)}
                                                        disabled={downloadingFileKey === question.supportingFile?.s3_key}
                                                        className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                    >
                                                        {downloadingFileKey === question.supportingFile?.s3_key ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Download className="h-4 w-4" />
                                                        )}
                                                        Download
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    )
                                })}
                            </>
                        ) : (
                            <div className="text-center py-12 text-slate-500">
                                No assessment data available
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end mt-6">
                        <Button
                            variant="outline"
                            onClick={handleCloseDialog}
                            className="border-sidebar-accent-foreground text-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                        >
                            Close
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
