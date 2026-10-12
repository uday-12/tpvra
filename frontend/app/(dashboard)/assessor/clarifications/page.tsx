"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2, Download, Paperclip } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { getClarifications, getClarificationFilters, getSubmittedClarificationResponse, type Clarification, type SubmittedClarificationResponse } from "@/apis/clarifications"
import { getFilePresignedUrl } from "@/apis/vendorAssessments"
import { useSession } from "@/lib/auth-client"

export default function AssessorClarificationsPage() {
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState<"pending" | "responded">("responded")
    const [vendorFilter, setVendorFilter] = useState<string[]>([])
    const [assessmentFilter, setAssessmentFilter] = useState<string[]>([])

    // API state
    const [pendingClarifications, setPendingClarifications] = useState<Clarification[]>([])
    const [respondedClarifications, setRespondedClarifications] = useState<Clarification[]>([])
    const [isLoadingPending, setIsLoadingPending] = useState(false)
    const [isLoadingResponded, setIsLoadingResponded] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [submittedCount, setSubmittedCount] = useState(0)
    const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([])
    const [assessments, setAssessments] = useState<Array<{ id: string; name: string }>>([])

    // Pagination state
    const ITEMS_PER_PAGE = 10
    const [pendingPage, setPendingPage] = useState(1)
    const [pendingTotalPages, setPendingTotalPages] = useState(1)
    const [pendingHasNextPage, setPendingHasNextPage] = useState(false)
    const [pendingHasPrevPage, setPendingHasPrevPage] = useState(false)

    const [respondedPage, setRespondedPage] = useState(1)
    const [respondedTotalPages, setRespondedTotalPages] = useState(1)
    const [respondedHasNextPage, setRespondedHasNextPage] = useState(false)
    const [respondedHasPrevPage, setRespondedHasPrevPage] = useState(false)

    // Dialog state
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedClarification, setSelectedClarification] = useState<Clarification | null>(null)
    const [submittedClarificationDetails, setSubmittedClarificationDetails] = useState<SubmittedClarificationResponse | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null)

    // Fetch pending clarifications with filters
    const fetchPendingClarifications = async (
        page: number = pendingPage,
        filters?: { vendorIds?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingPending(true)
        try {
            const filterParams = filters || {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            }
            const response = await getClarifications({
                fetchBy: 'pending',
                vendorIds: filterParams.vendorIds?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
                page,
                limit: ITEMS_PER_PAGE,
            })
            setPendingClarifications(response.clarifications)
            setPendingTotalPages(response.totalPages)
            setPendingHasNextPage(response.hasNextPage)
            setPendingHasPrevPage(response.hasPrevPage)

            // Extract unique vendors and assessments from clarifications
            const uniqueVendors = Array.from(
                new Map(
                    response.clarifications.map(c => [c.assessorId, { id: c.assessorId, name: c.assessorName }])
                ).values()
            )
            if (uniqueVendors.length > 0) {
                setVendors(prev => {
                    const merged = new Map([...prev.map(v => [v.id, v] as const), ...uniqueVendors.map(v => [v.id, v] as const)])
                    return Array.from(merged.values())
                })
            }

            const uniqueAssessments = Array.from(
                new Map(
                    response.clarifications.map(c => [c.assessmentId, { id: c.assessmentId, name: c.assessmentName }])
                ).values()
            )
            if (uniqueAssessments.length > 0) {
                setAssessments(prev => {
                    const merged = new Map([...prev.map(a => [a.id, a] as const), ...uniqueAssessments.map(a => [a.id, a] as const)])
                    return Array.from(merged.values())
                })
            }
        } catch (error) {
            console.error("Error fetching pending clarifications:", error)
            toast.error("Failed to fetch pending clarifications")
        } finally {
            setIsLoadingPending(false)
        }
    }

    // Handle pending page change
    const handlePendingPageChange = (page: number) => {
        setPendingPage(page)
        fetchPendingClarifications(page)
    }

    // Fetch responded clarifications with filters
    const fetchRespondedClarifications = async (
        page: number = respondedPage,
        filters?: { vendorIds?: string[]; assessmentIds?: string[] }
    ) => {
        setIsLoadingResponded(true)
        try {
            const filterParams = filters || {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            }
            const response = await getClarifications({
                fetchBy: 'submitted',
                vendorIds: filterParams.vendorIds?.join(',') || '',
                assessmentIds: filterParams.assessmentIds?.join(',') || '',
                page,
                limit: ITEMS_PER_PAGE,
            })
            setRespondedClarifications(response.clarifications)
            setRespondedTotalPages(response.totalPages)
            setRespondedHasNextPage(response.hasNextPage)
            setRespondedHasPrevPage(response.hasPrevPage)

            // Extract unique vendors and assessments from clarifications
            const uniqueVendors = Array.from(
                new Map(
                    response.clarifications.map(c => [c.assessorId, { id: c.assessorId, name: c.assessorName }])
                ).values()
            )
            if (uniqueVendors.length > 0) {
                setVendors(prev => {
                    const merged = new Map([...prev.map(v => [v.id, v] as const), ...uniqueVendors.map(v => [v.id, v] as const)])
                    return Array.from(merged.values())
                })
            }

            const uniqueAssessments = Array.from(
                new Map(
                    response.clarifications.map(c => [c.assessmentId, { id: c.assessmentId, name: c.assessmentName }])
                ).values()
            )
            if (uniqueAssessments.length > 0) {
                setAssessments(prev => {
                    const merged = new Map([...prev.map(a => [a.id, a] as const), ...uniqueAssessments.map(a => [a.id, a] as const)])
                    return Array.from(merged.values())
                })
            }
        } catch (error) {
            console.error("Error fetching responded clarifications:", error)
            toast.error("Failed to fetch responded clarifications")
        } finally {
            setIsLoadingResponded(false)
        }
    }

    // Handle responded page change
    const handleRespondedPageChange = (page: number) => {
        setRespondedPage(page)
        fetchRespondedClarifications(page)
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

    // Fetch filter data including counts
    const fetchFilterData = async () => {
        try {
            const response = await getClarificationFilters('', session?.user?.id || '', '')
            setPendingCount(response.pendingCount)
            setSubmittedCount(response.submittedCount)
            // Note: vendors and assessments are extracted from clarification data instead
            // because the filter API returns IDs instead of names
        } catch (error) {
            console.error("Error fetching filter data:", error)
            // Don't show error toast, just log it
        }
    }

    // Ref to track if tab just changed (to prevent double fetch)
    const isTabChanging = useRef(false)

    // Fetch filter data on mount
    useEffect(() => {
        if (!session?.user?.id) return
        fetchFilterData()
    }, [session?.user?.id])

    // Fetch data on mount and tab change - reset filters when switching tabs
    useEffect(() => {
        if (!session?.user?.id) return

        // Mark that tab is changing
        isTabChanging.current = true

        // Reset filters when switching tabs
        setVendorFilter([])
        setAssessmentFilter([])

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingClarifications(1, {
                vendorIds: [],
                assessmentIds: [],
            })
        } else {
            setRespondedPage(1)
            fetchRespondedClarifications(1, {
                vendorIds: [],
                assessmentIds: [],
            })
        }

        // Reset the flag after a short delay
        setTimeout(() => {
            isTabChanging.current = false
        }, 100)
    }, [activeTab, session?.user?.id])

    // Refetch data when filters change (skip if tab just changed)
    useEffect(() => {
        if (!session?.user?.id) return
        if (isTabChanging.current) return

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingClarifications(1, {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            })
        } else {
            setRespondedPage(1)
            fetchRespondedClarifications(1, {
                vendorIds: vendorFilter,
                assessmentIds: assessmentFilter,
            })
        }
    }, [vendorFilter, assessmentFilter])

    // Handle opening view dialog
    const handleOpenViewDialog = async (clarification: Clarification) => {
        setSelectedClarification(clarification)
        setIsViewDialogOpen(true)
        setIsLoadingDetails(true)
        setSubmittedClarificationDetails(null)

        // Only fetch details for responded clarifications
        if (activeTab === "responded") {
            try {
                const details = await getSubmittedClarificationResponse(clarification.id)
                setSubmittedClarificationDetails(details)
            } catch (error) {
                console.error("Error fetching submitted clarification details:", error)
                toast.error("Failed to load clarification details")
            } finally {
                setIsLoadingDetails(false)
            }
        } else {
            setIsLoadingDetails(false)
        }
    }

    // Extract s3_key from URL (fallback if s3_key is not provided)
    const extractS3KeyFromUrl = (url: string): string | null => {
        try {
            const urlObj = new URL(url)
            // Remove leading slash from pathname
            return urlObj.pathname.substring(1)
        } catch {
            return null
        }
    }

    // Handle file download using presigned URL
    const handleFileDownload = async (fileKey: string, fileName: string) => {
        setDownloadingFileKey(fileKey)
        try {
            const response = await getFilePresignedUrl(fileKey, fileName)
            if (response.success && response.data?.url) {
                window.open(response.data.url, '_blank')
            }
        } catch (error) {
            console.error("Error downloading file:", error)
            toast.error("Failed to download file")
        } finally {
            setDownloadingFileKey(null)
        }
    }

    // Clarifications (filters are now handled by API)
    const filteredPendingClarifications = pendingClarifications

    // Responded clarifications (filters are now handled by API)
    const filteredRespondedClarifications = respondedClarifications

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Clarifications</h1>
                <p className="text-sm text-muted-foreground">
                    Manage clarification requests and responses
                </p>
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <Button
                    variant="ghost"
                    className={activeTab === "responded"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("responded")}
                >
                    Responded ({submittedCount})
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "pending"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("pending")}
                >
                    Pending ({pendingCount})
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center">
                <MultiSelectFilter
                    options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
                    selectedValues={vendorFilter}
                    onSelectionChange={setVendorFilter}
                    placeholder="Vendor"
                    allLabel="All Vendors"
                    triggerClassName="w-[200px]"
                />

                <MultiSelectFilter
                    options={assessments.map((assessment) => ({ value: assessment.id, label: assessment.name }))}
                    selectedValues={assessmentFilter}
                    onSelectionChange={setAssessmentFilter}
                    placeholder="Assessment"
                    allLabel="All Assessments"
                    triggerClassName="w-[200px]"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                {activeTab === "responded" ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-xs font-semibold uppercase">Clarification</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Question</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Assessment</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Vendor</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Requested At</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Responded At</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingResponded ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredRespondedClarifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No responded clarifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredRespondedClarifications.map((clarification) => (
                                    <TableRow key={clarification.id}>
                                        <TableCell className="max-w-xs">
                                            <div className="truncate">{clarification.clarificationRequested}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs text-muted-foreground">
                                            <div className="truncate">{clarification.questionText}</div>
                                        </TableCell>
                                        <TableCell>{clarification.assessmentName}</TableCell>
                                        <TableCell>{clarification.assessorName}</TableCell>
                                        <TableCell>{formatDate(clarification.requestedAt)}</TableCell>
                                        <TableCell>{formatDate(clarification.dueDate)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                                onClick={() => handleOpenViewDialog(clarification)}
                                            >
                                                Review
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
                                <TableHead className="text-xs font-semibold uppercase">Clarification</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Question</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Assessment</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Vendor</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Requested At</TableHead>
                                <TableHead className="text-xs font-semibold uppercase">Due Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPending ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredPendingClarifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        No pending clarifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredPendingClarifications.map((clarification) => (
                                    <TableRow key={clarification.id}>
                                        <TableCell className="max-w-xs">
                                            <div className="truncate">{clarification.clarificationRequested}</div>
                                        </TableCell>
                                        <TableCell className="max-w-xs text-muted-foreground">
                                            <div className="truncate">{clarification.questionText}</div>
                                        </TableCell>
                                        <TableCell>{clarification.assessmentName}</TableCell>
                                        <TableCell>{clarification.assessorName}</TableCell>
                                        <TableCell>{formatDate(clarification.requestedAt)}</TableCell>
                                        <TableCell>{formatDate(clarification.dueDate)}</TableCell>
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
                    currentPage={respondedPage}
                    totalPages={respondedTotalPages}
                    hasNextPage={respondedHasNextPage}
                    hasPrevPage={respondedHasPrevPage}
                    onPageChange={handleRespondedPageChange}
                    isLoading={isLoadingResponded}
                />
            )}

            {/* Clarification Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Clarification Review</DialogTitle>
                        <DialogDescription>
                            View the details of the clarification request and vendor response.
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : activeTab === "responded" && submittedClarificationDetails ? (
                        <div className="space-y-6">
                            {/* Question Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {submittedClarificationDetails.questionText}
                                </div>
                            </div>

                            {/* Original Answer Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Original Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!submittedClarificationDetails.originalAnswer) return "No answer provided"
                                        const options = selectedClarification?.questionOptions || submittedClarificationDetails.questionOptions
                                        if (options && options.length > 0) {
                                            const selectedIds = submittedClarificationDetails.originalAnswer.split(',').map(id => id.trim())
                                            return selectedIds
                                                .map(id => {
                                                    const option = options.find(opt => String(opt.id) === id)
                                                    return option?.option || id
                                                })
                                                .join(', ')
                                        }
                                        return submittedClarificationDetails.originalAnswer
                                    })()}
                                </div>
                            </div>

                            {/* Clarification Request Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Clarification Requested</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {submittedClarificationDetails.clarificationRequested}
                                </div>
                            </div>

                            {/* Vendor Response Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Vendor Response</Label>
                                <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm">
                                    {submittedClarificationDetails.clarificationAnswer}
                                </div>
                            </div>

                            {/* Uploaded File Section */}
                            {submittedClarificationDetails.clarificationFile && (() => {
                                const fileKey = submittedClarificationDetails.clarificationFile.s3_key ||
                                    extractS3KeyFromUrl(submittedClarificationDetails.clarificationFile.url)
                                return (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Attached File</Label>
                                        <div className="flex items-center justify-between rounded-md border p-3 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4 text-slate-400" />
                                                <span className="text-slate-600">
                                                    {submittedClarificationDetails.clarificationFile.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => fileKey && handleFileDownload(fileKey, submittedClarificationDetails.clarificationFile!.name)}
                                                disabled={downloadingFileKey === fileKey}
                                                className="inline-flex items-center gap-1 text-sm font-medium text-orange-500 hover:text-orange-600 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {downloadingFileKey === fileKey ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                Download
                                            </button>
                                        </div>
                                    </div>
                                )
                            })()}
                        </div>
                    ) : selectedClarification ? (
                        <div className="space-y-6">
                            {/* Question Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {selectedClarification.questionText}
                                </div>
                            </div>

                            {/* Submitted Answer Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Vendor's Submitted Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!selectedClarification.submittedAnswer) return "No answer provided yet"
                                        if (selectedClarification.questionOptions && selectedClarification.questionOptions.length > 0) {
                                            const selectedIds = selectedClarification.submittedAnswer.split(',').map(id => id.trim())
                                            return selectedIds
                                                .map(id => {
                                                    const option = selectedClarification.questionOptions?.find(opt => String(opt.id) === id)
                                                    return option?.option || id
                                                })
                                                .join(', ')
                                        }
                                        return selectedClarification.submittedAnswer
                                    })()}
                                </div>
                            </div>

                            {/* Clarification Request Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Your Clarification Request</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {selectedClarification.clarificationRequested}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-12 text-muted-foreground">
                            No details available
                        </div>
                    )}
                    <DialogFooter>
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
