"use client"

import { useState, useEffect, useRef } from "react"
import { Eye, Upload, Loader2, Download, Paperclip } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { getClarifications, getClarificationFilters, submitClarificationResponse, getSubmittedClarificationResponse, type Clarification, type SubmittedClarificationResponse } from "@/apis/clarifications"
import { uploadFile, getFilePresignedUrl } from "@/apis/vendorAssessments"
import { useSession } from "@/lib/auth-client"

export default function ClarificationsPage() {
    const { data: session } = useSession()
    const [activeTab, setActiveTab] = useState<"pending" | "submitted">("pending")
    const [assessorFilter, setAssessorFilter] = useState<string[]>([])
    const [assessmentFilter, setAssessmentFilter] = useState<string[]>([])

    // API state
    const [pendingClarifications, setPendingClarifications] = useState<Clarification[]>([])
    const [submittedClarifications, setSubmittedClarifications] = useState<Clarification[]>([])
    const [isLoadingPending, setIsLoadingPending] = useState(false)
    const [isLoadingSubmitted, setIsLoadingSubmitted] = useState(false)
    const [pendingCount, setPendingCount] = useState(0)
    const [submittedCount, setSubmittedCount] = useState(0)
    const [assessors, setAssessors] = useState<Array<{ id: string; name: string }>>([])
    const [assessments, setAssessments] = useState<Array<{ id: string; name: string }>>([])

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
    const [isRespondDialogOpen, setIsRespondDialogOpen] = useState(false)
    const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
    const [selectedClarification, setSelectedClarification] = useState<Clarification | null>(null)
    const [submittedClarificationDetails, setSubmittedClarificationDetails] = useState<SubmittedClarificationResponse | null>(null)
    const [isLoadingDetails, setIsLoadingDetails] = useState(false)
    const [responseText, setResponseText] = useState("")
    const [uploadedFile, setUploadedFile] = useState<File | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null)

    // Fetch filter data
    const fetchFilterData = async () => {
        try {
            const response = await getClarificationFilters(session?.user?.id || '', '', '')
            setPendingCount(response.pendingCount)
            setSubmittedCount(response.submittedCount)
            setAssessors(response.assessorCounts.map(a => ({ id: a.id, name: a.name })))
            setAssessments(response.assessmentCounts.map(a => ({ id: a.id, name: a.name })))
        } catch (error) {
            console.error("Error fetching filter data:", error)
            toast.error("Failed to fetch filter data")
        }
    }

    // Fetch pending clarifications
    const fetchPendingClarifications = async (page: number = pendingPage) => {
        setIsLoadingPending(true)
        try {
            const response = await getClarifications({
                fetchBy: 'pending',
                vendorIds: session?.user?.id || '',
                assessorIds: assessorFilter.length > 0 ? assessorFilter.join(',') : '',
                assessmentIds: assessmentFilter.length > 0 ? assessmentFilter.join(',') : '',
                page,
                limit: ITEMS_PER_PAGE,
            })
            setPendingClarifications(response.clarifications)
            setPendingTotalPages(response.totalPages)
            setPendingHasNextPage(response.hasNextPage)
            setPendingHasPrevPage(response.hasPrevPage)
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

    // Fetch submitted clarifications
    const fetchSubmittedClarifications = async (page: number = submittedPage) => {
        setIsLoadingSubmitted(true)
        try {
            const response = await getClarifications({
                fetchBy: 'submitted',
                vendorIds: session?.user?.id || '',
                assessorIds: assessorFilter.length > 0 ? assessorFilter.join(',') : '',
                assessmentIds: assessmentFilter.length > 0 ? assessmentFilter.join(',') : '',
                page,
                limit: ITEMS_PER_PAGE,
            })
            setSubmittedClarifications(response.clarifications)
            setSubmittedTotalPages(response.totalPages)
            setSubmittedHasNextPage(response.hasNextPage)
            setSubmittedHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching submitted clarifications:", error)
            toast.error("Failed to fetch submitted clarifications")
        } finally {
            setIsLoadingSubmitted(false)
        }
    }

    // Handle submitted page change
    const handleSubmittedPageChange = (page: number) => {
        setSubmittedPage(page)
        fetchSubmittedClarifications(page)
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

    // Ref to track if tab just changed (to prevent double fetch)
    const isTabChanging = useRef(false)

    // Fetch filter data on mount
    useEffect(() => {
        if (!session?.user?.id) return
        fetchFilterData()
    }, [session?.user?.id])

    // Fetch data on tab change - reset filters when switching tabs
    useEffect(() => {
        if (!session?.user?.id) return

        // Mark that tab is changing
        isTabChanging.current = true

        // Reset filters when switching tabs
        setAssessorFilter([])
        setAssessmentFilter([])

        if (activeTab === "pending") {
            setPendingPage(1)
            fetchPendingClarifications(1)
        } else {
            setSubmittedPage(1)
            fetchSubmittedClarifications(1)
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
            fetchPendingClarifications(1)
        } else {
            setSubmittedPage(1)
            fetchSubmittedClarifications(1)
        }
    }, [assessorFilter, assessmentFilter])

    // Handle opening clarify dialog
    const handleOpenClarifyDialog = (clarification: Clarification) => {
        setSelectedClarification(clarification)
        setResponseText("")
        setUploadedFile(null)
        setIsRespondDialogOpen(true)
    }

    // Handle opening view dialog
    const handleOpenViewDialog = async (clarification: Clarification) => {
        setSelectedClarification(clarification)
        setIsViewDialogOpen(true)
        setIsLoadingDetails(true)
        setSubmittedClarificationDetails(null)

        try {
            const details = await getSubmittedClarificationResponse(clarification.id)
            setSubmittedClarificationDetails(details)
        } catch (error) {
            console.error("Error fetching submitted clarification details:", error)
            toast.error("Failed to load clarification details")
        } finally {
            setIsLoadingDetails(false)
        }
    }

    // Handle submit response
    const handleSubmitResponse = async () => {
        if (!selectedClarification || !responseText.trim()) return

        setIsSubmitting(true)
        try {
            let fileId: string | undefined

            // Upload file if one is selected
            if (uploadedFile) {
                try {
                    const uploadResponse = await uploadFile(uploadedFile, 'uploads', 'header')
                    fileId = uploadResponse.data.uploadedFileId
                } catch (uploadError) {
                    console.error("Error uploading file:", uploadError)
                    toast.error("Failed to upload file. Please try again.")
                    setIsSubmitting(false)
                    return
                }
            }

            // Submit clarification response
            await submitClarificationResponse(selectedClarification.id, {
                response: responseText,
                fileId: fileId,
            })

            toast.success("Response submitted successfully")
            setIsRespondDialogOpen(false)
            setResponseText("")
            setUploadedFile(null)

            // Refresh the clarifications lists
            fetchFilterData()
            if (activeTab === "pending") {
                fetchPendingClarifications()
            } else {
                fetchSubmittedClarifications()
            }
        } catch (error) {
            console.error("Error submitting clarification response:", error)
            toast.error("Failed to submit response. Please try again.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // Handle file change
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setUploadedFile(e.target.files[0])
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

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Clarifications</h1>
                <p className="text-sm text-muted-foreground">
                    View and respond to clarification requests
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
                    Pending ({pendingCount})
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "submitted"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => setActiveTab("submitted")}
                >
                    Submitted ({submittedCount})
                </Button>
            </div>

            {/* Filters */}
            <div className="flex gap-4">
                <MultiSelectFilter
                    options={assessors.map((assessor) => ({ value: assessor.id, label: assessor.name }))}
                    selectedValues={assessorFilter}
                    onSelectionChange={setAssessorFilter}
                    placeholder="Assessor"
                    allLabel="All Assessors"
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
                {activeTab === "pending" ? (
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>CLARIFICATION</TableHead>
                                <TableHead>QUESTION</TableHead>
                                <TableHead>ASSESSMENT</TableHead>
                                <TableHead>ASSESSOR</TableHead>
                                <TableHead>REQUESTED AT</TableHead>
                                <TableHead>DUE DATE</TableHead>
                                <TableHead>DAYS LEFT</TableHead>
                                <TableHead>ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingPending ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : pendingClarifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center">
                                        No pending clarifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                pendingClarifications.map((clarification) => (
                                    <TableRow key={clarification.id}>
                                        <TableCell className="max-w-xs">
                                            {clarification.clarificationRequested}
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            {clarification.questionText}
                                        </TableCell>
                                        <TableCell>{clarification.assessmentName}</TableCell>
                                        <TableCell>{clarification.assessorName}</TableCell>
                                        <TableCell>{formatDate(clarification.requestedAt)}</TableCell>
                                        <TableCell>{formatDate(clarification.dueDate)}</TableCell>
                                        <TableCell>{clarification.daysLeft} days</TableCell>
                                        <TableCell>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                                onClick={() => handleOpenClarifyDialog(clarification)}
                                            >
                                                Clarify
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
                                <TableHead>CLARIFICATION</TableHead>
                                <TableHead>QUESTION</TableHead>
                                <TableHead>ASSESSMENT</TableHead>
                                <TableHead>ASSESSOR</TableHead>
                                <TableHead>REQUESTED AT</TableHead>
                                <TableHead>SUBMITTED AT</TableHead>
                                <TableHead>ACTIONS</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoadingSubmitted ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                    </TableCell>
                                </TableRow>
                            ) : submittedClarifications.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-24 text-center">
                                        No submitted clarifications found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                submittedClarifications.map((clarification) => (
                                    <TableRow key={clarification.id}>
                                        <TableCell className="max-w-xs">
                                            {clarification.clarificationRequested}
                                        </TableCell>
                                        <TableCell className="max-w-md">
                                            {clarification.questionText}
                                        </TableCell>
                                        <TableCell>{clarification.assessmentName}</TableCell>
                                        <TableCell>{clarification.assessorName}</TableCell>
                                        <TableCell>{formatDate(clarification.requestedAt)}</TableCell>
                                        <TableCell>{formatDate(clarification.dueDate)}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-orange-500 hover:text-orange-600 hover:bg-orange-50"
                                                onClick={() => handleOpenViewDialog(clarification)}
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

            {/* Respond to Clarification Dialog */}
            <Dialog open={isRespondDialogOpen} onOpenChange={setIsRespondDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Respond to Clarification</DialogTitle>
                        <DialogDescription>
                            Please provide your response to the clarification request below.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedClarification && (
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
                                <Label className="text-sm font-medium">Submitted Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!selectedClarification.submittedAnswer) return "No answer provided"
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
                                <Label className="text-sm font-medium">Clarification Request</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {selectedClarification.clarificationRequested}
                                </div>
                            </div>

                            {/* Your Response Section */}
                            <div className="space-y-2">
                                <Label htmlFor="response" className="text-sm font-medium">
                                    Your Response <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="response"
                                    placeholder="Enter your response here..."
                                    value={responseText}
                                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setResponseText(e.target.value)}
                                    rows={4}
                                    className="resize-none focus-visible:ring-orange-500"
                                />
                            </div>

                            {/* Upload File Section */}
                            <div className="space-y-2">
                                <Label htmlFor="file-upload" className="text-sm font-medium">
                                    Upload File <span className="text-muted-foreground font-normal">(Optional)</span>
                                </Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        id="file-upload"
                                        type="file"
                                        onChange={handleFileChange}
                                        className="hidden"
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        onClick={() => document.getElementById("file-upload")?.click()}
                                        className="w-fit text-muted-foreground"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Choose file
                                    </Button>
                                    {uploadedFile && (
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground border rounded-md px-3 py-1.5">
                                            <span>{uploadedFile.name}</span>
                                            <button
                                                type="button"
                                                onClick={() => setUploadedFile(null)}
                                                className="text-muted-foreground hover:text-foreground text-lg cursor-pointer"
                                            >
                                                &times;
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsRespondDialogOpen(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitResponse}
                            disabled={!responseText.trim() || isSubmitting}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Submitting...
                                </>
                            ) : (
                                'Submit Response'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Clarification Details Dialog */}
            <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Clarification Details</DialogTitle>
                        <DialogDescription>
                            View the details of your submitted clarification response.
                        </DialogDescription>
                    </DialogHeader>
                    {isLoadingDetails ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                        </div>
                    ) : submittedClarificationDetails ? (
                        <div className="space-y-6">
                            {/* Question Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {submittedClarificationDetails.questionText}
                                </div>
                            </div>

                            {/* Submitted Answer Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Submitted Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!submittedClarificationDetails.originalAnswer) return "No answer provided"
                                        // Use questionOptions from selectedClarification (already fetched) or submittedClarificationDetails
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
                                <Label className="text-sm font-medium">Clarification Request</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {submittedClarificationDetails.clarificationRequested}
                                </div>
                            </div>

                            {/* Your Response Section */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Your Response</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {submittedClarificationDetails.clarificationAnswer}
                                </div>
                            </div>

                            {/* Uploaded File Section */}
                            {submittedClarificationDetails.clarificationFile && (() => {
                                const fileKey = submittedClarificationDetails.clarificationFile.s3_key ||
                                    extractS3KeyFromUrl(submittedClarificationDetails.clarificationFile.url)
                                return (
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium">Uploaded File</Label>
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
