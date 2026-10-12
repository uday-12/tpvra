"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, MessageSquare, AlertCircle, Loader2, Info, Paperclip, Download, Shield } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { getAssessmentReview, requestClarification, getFilePresignedUrl, type AssessmentReviewResponse, type SavedAnswer } from "@/apis/vendorAssessments"
import { useAssessmentContext } from "@/contexts/assessment-context"

export default function AssessorReviewPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const assessmentId = params.id as string
    const assessmentName = searchParams.get('name')
    const { setAssessmentTitle } = useAssessmentContext()

    const [assessment, setAssessment] = useState<AssessmentReviewResponse | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isMounted, setIsMounted] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    // Dialog states
    const [isClarificationDialogOpen, setIsClarificationDialogOpen] = useState(false)
    const [isRiskDialogOpen, setIsRiskDialogOpen] = useState(false)
    const [selectedQuestion, setSelectedQuestion] = useState<SavedAnswer | null>(null)
    const [clarificationText, setClarificationText] = useState("")
    const [clarificationDueDate, setClarificationDueDate] = useState("")
    const [isSubmittingClarification, setIsSubmittingClarification] = useState(false)
    const [assignedRisk, setAssignedRisk] = useState<string>("")
    const [downloadingFileKey, setDownloadingFileKey] = useState<string | null>(null)

    // Handle mounting to prevent hydration errors
    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Set assessment title for breadcrumb
    useEffect(() => {
        if (assessmentName) {
            setAssessmentTitle(assessmentName)
        }
    }, [assessmentName, setAssessmentTitle])

    // Fetch assessment review data - single API call
    useEffect(() => {
        if (!isMounted || !assessmentId) return

        const fetchAssessment = async () => {
            setIsLoading(true)
            setErrorMessage(null)

            try {
                console.log("Fetching review data for assessment:", assessmentId)
                const reviewData = await getAssessmentReview(assessmentId)
                console.log("Review data received:", reviewData)

                if (!reviewData || !reviewData.questions || reviewData.questions.length === 0) {
                    throw new Error("No questions found in assessment review")
                }

                setAssessment(reviewData)
                console.log("Review data loaded successfully. Questions count:", reviewData.questions.length)

            } catch (error: any) {
                console.error("Error fetching assessment review:", error)

                // Handle specific error cases
                if (error.message.includes("422")) {
                    setErrorMessage("This assessment has not been submitted yet or has no answers.")
                    toast.error("Assessment not submitted yet")
                } else if (error.message.includes("404")) {
                    setErrorMessage("Assessment not found.")
                    toast.error("Assessment not found")
                } else {
                    setErrorMessage("Failed to load assessment review.")
                    toast.error("Failed to load assessment review")
                }
            } finally {
                setIsLoading(false)
            }
        }

        fetchAssessment()
    }, [assessmentId, isMounted])

    // Handle opening clarification dialog
    const handleOpenClarificationDialog = (question: SavedAnswer) => {
        setSelectedQuestion(question)
        setClarificationText("")
        setClarificationDueDate("")
        setIsClarificationDialogOpen(true)
    }

    // Handle opening risk assignment dialog
    const handleOpenRiskDialog = (question: SavedAnswer) => {
        setSelectedQuestion(question)
        // Use assignedRiskRating if it exists, otherwise use the default riskRating
        setAssignedRisk(question.assignedRiskRating || question.riskRating || "")
        setIsRiskDialogOpen(true)
    }

    // Handle submitting clarification request
    const handleSubmitClarification = async () => {
        if (!selectedQuestion || !clarificationText.trim() || !clarificationDueDate) return

        setIsSubmittingClarification(true)
        try {
            await requestClarification({
                assessorVendorAssessmentId: assessmentId,
                questionId: selectedQuestion.questionId,
                clarificationRequested: clarificationText,
                dueDate: clarificationDueDate,
            })

            toast.success("Clarification request sent successfully")
            setIsClarificationDialogOpen(false)
        } catch (error) {
            console.error("Error submitting clarification request:", error)
            toast.error("Failed to send clarification request. Please try again.")
        } finally {
            setIsSubmittingClarification(false)
        }
    }

    // Handle submitting risk assignment
    const handleSubmitRisk = async () => {
        if (!selectedQuestion || !assignedRisk || !assessment) return

        try {
            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001'}/assessor-vendor-assessments/questions/${selectedQuestion.questionId}/risk-rating`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        assignedRiskRating: assignedRisk,
                    }),
                }
            )

            if (!response.ok) {
                throw new Error(`Failed to assign risk: ${response.statusText}`)
            }

            toast.success("Risk assigned successfully")

            // Update the local state to reflect the change
            setAssessment((prev) => {
                if (!prev) return prev
                return {
                    ...prev,
                    questions: prev.questions.map((q) =>
                        q.questionId === selectedQuestion.questionId
                            ? { ...q, assignedRiskRating: assignedRisk }
                            : q
                    ),
                }
            })

            setIsRiskDialogOpen(false)
        } catch (error) {
            console.error("Error assigning risk:", error)
            toast.error("Failed to assign risk. Please try again.")
        }
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

    // Get risk badge styling
    const getRiskBadge = (rating: string) => {
        switch (rating) {
            case "CRITICAL":
                return { label: "Critical", className: "bg-purple-100 text-purple-700 border-purple-200" }
            case "HIGH":
                return { label: "High", className: "bg-red-100 text-red-700 border-red-200" }
            case "MEDIUM":
                return { label: "Medium", className: "bg-orange-100 text-orange-700 border-orange-200" }
            case "LOW":
                return { label: "Low", className: "bg-green-100 text-green-700 border-green-200" }
            default:
                return { label: rating, className: "bg-gray-100 text-gray-700 border-gray-200" }
        }
    }

    if (!isMounted || isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!assessment) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="text-muted-foreground text-center max-w-md">
                    {errorMessage || "Assessment not found"}
                </p>
                <Button onClick={() => router.push("/assessor/assessments")}>
                    Back to Assessments
                </Button>
            </div>
        )
    }

    // Render the review page with questions and answers from review API
    return (
        <div className="flex flex-col min-h-screen bg-white">
            {/* Header */}
            <div className="border-b">
                <div className="max-w-5xl mx-auto px-6 py-6">
                    <div className="flex items-start gap-4">
                        <button
                            onClick={() => router.push("/assessor/assessments")}
                            className="mt-1 p-1 hover:bg-gray-100 rounded-md transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5 text-gray-600" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">
                                {assessmentName || "Assessment"} for {assessment.vendorName}
                            </h1>
                            <p className="text-sm text-gray-500 mt-1">
                                Review vendor answers and request clarifications
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="flex-1 py-8">
                <div className="max-w-5xl mx-auto px-6 space-y-6">
                    {assessment.questions.length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">
                            No questions found
                        </div>
                    ) : (
                        assessment.questions.map((question, index) => {
                            const riskBadge = getRiskBadge(question.riskRating)
                            const assignedRiskBadge = question.assignedRiskRating
                                ? getRiskBadge(question.assignedRiskRating)
                                : null

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
                                <div key={question.questionId} className="border border-gray-200 rounded-lg p-6">
                                    {/* Question Header */}
                                    <div className="flex items-start gap-3 mb-3">
                                        <span className="text-gray-500 font-medium">{index + 1}.</span>
                                        <div className="flex-1">
                                            <div className="flex items-start justify-between gap-4">
                                                <p className="font-medium text-gray-900">
                                                    {question.questionText}
                                                </p>
                                                <Info className="h-4 w-4 text-gray-400 flex-shrink-0 mt-1" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Risk Badges */}
                                    <div className="flex items-center gap-4 mb-4 ml-6">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Default risk:</span>
                                            <Badge variant="outline" className={riskBadge.className}>
                                                {riskBadge.label}
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-gray-500">Assigned risk:</span>
                                            {assignedRiskBadge ? (
                                                <Badge variant="outline" className={assignedRiskBadge.className}>
                                                    {assignedRiskBadge.label}
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className={'bg-gray-100 text-gray-700 border-gray-200'}>
                                                    {'Not Assigned'}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>

                                    {/* Vendor Answer Box */}
                                    <div className="bg-gray-50 rounded-lg p-4 ml-6">
                                        <div className="mb-1">
                                            <span className="text-sm text-gray-500">Vendor Answer:</span>
                                        </div>
                                        <p className="text-gray-900">
                                            {getAnswerDisplay()}
                                        </p>

                                        {/* Explanation if available */}
                                        {question.explanation && (
                                            <div className="mt-4 pt-4 border-t border-gray-200">
                                                <div className="mb-1">
                                                    <span className="text-sm text-gray-500">Explanation:</span>
                                                </div>
                                                <p className="text-gray-900">
                                                    {question.explanation}
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Answer File if available */}
                                    {question.answerFile && (
                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-3 ml-6 border border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-700">
                                                    {question.answerFile.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => question.answerFile?.s3_key && handleFileDownload(question.answerFile.s3_key, question.answerFile.name)}
                                                disabled={downloadingFileKey === question.answerFile?.s3_key}
                                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

                                    {/* Supporting File if available */}
                                    {question.supportingFile && (
                                        <div className="flex items-center justify-between bg-gray-50 rounded-lg p-3 mt-3 ml-6 border border-gray-200">
                                            <div className="flex items-center gap-2">
                                                <Paperclip className="h-4 w-4 text-gray-400" />
                                                <span className="text-sm text-gray-700">
                                                    {question.supportingFile.name}
                                                </span>
                                            </div>
                                            <button
                                                onClick={() => question.supportingFile?.s3_key && handleFileDownload(question.supportingFile.s3_key, question.supportingFile.name)}
                                                disabled={downloadingFileKey === question.supportingFile?.s3_key}
                                                className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {downloadingFileKey === question.supportingFile?.s3_key ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : (
                                                    <Download className="h-4 w-4" />
                                                )}
                                                Download
                                            </button>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-3 justify-end mt-4">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-orange-500 border-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                            onClick={() => handleOpenClarificationDialog(question)}
                                        >
                                            <MessageSquare className="mr-2 h-4 w-4" />
                                            Request Clarification
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="text-orange-500 border-orange-500 hover:bg-orange-50 hover:text-orange-600"
                                            onClick={() => handleOpenRiskDialog(question)}
                                        >
                                            <Shield className="mr-2 h-4 w-4" />
                                            Assign Risk
                                        </Button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* Request Clarification Dialog */}
            <Dialog open={isClarificationDialogOpen} onOpenChange={setIsClarificationDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Request Clarification</DialogTitle>
                        <DialogDescription>
                            Ask the vendor to provide additional information or clarification.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedQuestion && (
                        <div className="space-y-4">
                            {/* Question */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {selectedQuestion.questionText}
                                </div>
                            </div>

                            {/* Vendor's Answer */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Vendor's Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!selectedQuestion.answer) return "No answer provided"
                                        if ((selectedQuestion.questionType === 'SINGLE_CHOICE' || selectedQuestion.questionType === 'MULTIPLE_CHOICE') && selectedQuestion.options) {
                                            const selectedIds = selectedQuestion.answer.split(',').map(id => id.trim())
                                            return selectedIds
                                                .map(id => {
                                                    const option = selectedQuestion.options?.find(opt => String(opt.id) === id)
                                                    return option?.option || id
                                                })
                                                .join(', ')
                                        }
                                        return selectedQuestion.answer
                                    })()}
                                </div>
                            </div>

                            {/* Clarification Request */}
                            <div className="space-y-2">
                                <Label htmlFor="clarification" className="text-sm font-medium">
                                    What clarification do you need? <span className="text-destructive">*</span>
                                </Label>
                                <Textarea
                                    id="clarification"
                                    placeholder="Please provide more details about..."
                                    value={clarificationText}
                                    onChange={(e) => setClarificationText(e.target.value)}
                                    rows={4}
                                    className="resize-none focus-visible:ring-orange-500"
                                />
                            </div>

                            {/* Due Date */}
                            <div className="space-y-2">
                                <Label htmlFor="dueDate" className="text-sm font-medium">
                                    Due Date <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="dueDate"
                                    type="date"
                                    value={clarificationDueDate}
                                    onChange={(e) => setClarificationDueDate(e.target.value)}
                                    min={new Date().toISOString().split('T')[0]}
                                    className="focus-visible:ring-orange-500"
                                />
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsClarificationDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitClarification}
                            disabled={!clarificationText.trim() || !clarificationDueDate || isSubmittingClarification}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isSubmittingClarification ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                </>
                            ) : (
                                'Send Request'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Assign Risk Dialog */}
            <Dialog open={isRiskDialogOpen} onOpenChange={setIsRiskDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Assign Risk Rating</DialogTitle>
                        <DialogDescription>
                            Override the default risk rating based on the vendor's answer.
                        </DialogDescription>
                    </DialogHeader>
                    {selectedQuestion && (
                        <div className="space-y-4">
                            {/* Question */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Question</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {selectedQuestion.questionText}
                                </div>
                            </div>

                            {/* Default Risk */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Default Risk Rating</Label>
                                <div>
                                    <Badge
                                        variant="outline"
                                        className={getRiskBadge(selectedQuestion.riskRating).className}
                                    >
                                        {getRiskBadge(selectedQuestion.riskRating).label}
                                    </Badge>
                                </div>
                            </div>

                            {/* Show current assigned risk if exists */}
                            {selectedQuestion.assignedRiskRating && (
                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">Currently Assigned Risk</Label>
                                    <div>
                                        <Badge
                                            variant="outline"
                                            className={getRiskBadge(selectedQuestion.assignedRiskRating).className}
                                        >
                                            {getRiskBadge(selectedQuestion.assignedRiskRating).label}
                                        </Badge>
                                    </div>
                                </div>
                            )}

                            {/* Vendor's Answer */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Vendor's Answer</Label>
                                <div className="rounded-md bg-muted p-3 text-sm">
                                    {(() => {
                                        if (!selectedQuestion.answer) return "No answer provided"
                                        if ((selectedQuestion.questionType === 'SINGLE_CHOICE' || selectedQuestion.questionType === 'MULTIPLE_CHOICE') && selectedQuestion.options) {
                                            const selectedIds = selectedQuestion.answer.split(',').map(id => id.trim())
                                            return selectedIds
                                                .map(id => {
                                                    const option = selectedQuestion.options?.find(opt => String(opt.id) === id)
                                                    return option?.option || id
                                                })
                                                .join(', ')
                                        }
                                        return selectedQuestion.answer
                                    })()}
                                </div>
                            </div>

                            {/* Assign Risk */}
                            <div className="space-y-2">
                                <Label htmlFor="risk-rating" className="text-sm font-medium">
                                    Assign Risk Rating <span className="text-destructive">*</span>
                                </Label>
                                <Select value={assignedRisk} onValueChange={setAssignedRisk}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select risk rating" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CRITICAL">Critical</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="LOW">Low</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    )}
                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsRiskDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitRisk}
                            disabled={!assignedRisk}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            Assign Risk
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
