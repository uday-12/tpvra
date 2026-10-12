"use client"

import { useState, useEffect } from "react"
import { useRouter, useParams, useSearchParams } from "next/navigation"
import { ArrowLeft, Upload, X, Loader2, Info, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { useAssessmentContext } from "@/contexts/assessment-context"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    getAssessmentQuestions,
    uploadFile,
    deleteFile,
    saveAssessmentDraft,
    getAssessmentReview,
    type VendorAssessmentDetails,
    type AssessmentQuestion,
    type AnswerInput,
} from "@/apis/vendorAssessments"

// Answer state type
interface Answer {
    questionId: string
    questionType: string
    answer: string
    answerExplanation: string
    fileId: string
    supportingFileId: string
    selectedOptions: string[]
    uploadedFile?: File
    supportingFile?: File
    uploadedFileName?: string
    supportingFileName?: string
    existingFileKey?: string // For deleting existing files loaded from API
    existingSupportingFileKey?: string // For deleting existing supporting files loaded from API
}

export default function AssessmentSubmissionPage() {
    const router = useRouter()
    const params = useParams()
    const searchParams = useSearchParams()
    const assessmentId = params.id as string
    const parentAssessmentId = searchParams.get('parentAssessmentId')
    const submittedAssessmentId = searchParams.get('submittedAssessmentId')
    const assessmentName = searchParams.get('name')
    const { setAssessmentTitle } = useAssessmentContext()

    const [assessment, setAssessment] = useState<VendorAssessmentDetails | null>(null)
    const [answers, setAnswers] = useState<Record<string, Answer>>({})
    const [isLoading, setIsLoading] = useState(true)
    const [isSaving, setIsSaving] = useState(false)
    const [isMounted, setIsMounted] = useState(false)

    // Delete file dialog state
    const [isDeleteFileDialogOpen, setIsDeleteFileDialogOpen] = useState(false)
    const [isDeletingFile, setIsDeletingFile] = useState(false)
    const [fileToDelete, setFileToDelete] = useState<{
        questionId: string
        fieldType: "fileId" | "supportingFileId"
        fileName: string
    } | null>(null)

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

    // Debug effect to monitor answers state
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            console.log("📊 ANSWERS STATE UPDATED:", answers)
            // Check which answers have values
            Object.entries(answers).forEach(([qId, ans]) => {
                if (ans.answer || ans.answerExplanation) {
                    console.log(`✓ Question ${qId} has answer: "${ans.answer}", explanation: "${ans.answerExplanation}"`)
                }
            })
        }
    }, [answers])

    // Fetch assessment details
    useEffect(() => {
        if (!isMounted || (!parentAssessmentId && !submittedAssessmentId)) return

        const fetchAssessment = async () => {
            setIsLoading(true)
            try {
                let assessmentData: any
                let savedAnswers: any = null

                // If submittedAssessmentId exists, use review API to get both questions and answers
                if (submittedAssessmentId) {
                    console.log("Fetching from review API with assessmentId:", assessmentId)
                    const reviewData = await getAssessmentReview(assessmentId)

                    // Map review API response to assessment format
                    assessmentData = {
                        id: submittedAssessmentId,
                        title: reviewData.vendorName,
                        questions: reviewData.questions.map((q: any) => ({
                            id: q.questionId,
                            questionText: q.questionText,
                            questionType: q.questionType,
                            riskRating: q.riskRating,
                            options: q.options || [], // Use options from review response
                            categoryId: '', // Not available in review response
                            category: {
                                id: '',
                                name: ''
                            },
                            createdAt: q.createdAt || '',
                            updatedAt: q.updatedAt || ''
                        }))
                    }

                    // Store the review data to populate answers later
                    savedAnswers = reviewData
                } else if (parentAssessmentId) {
                    console.log("Fetching from questions API with parentAssessmentId:", parentAssessmentId)
                    // Fetch the assessment questions directly using parentAssessmentId
                    assessmentData = await getAssessmentQuestions(parentAssessmentId)
                }

                // Validate assessment data
                if (!assessmentData || !assessmentData.questions) {
                    throw new Error("Invalid assessment data received from server")
                }

                // Create minimal assessment structure for display
                const combinedData: VendorAssessmentDetails = {
                    id: assessmentId,
                    assessorId: '',
                    vendorId: '',
                    parentAssessmentId: submittedAssessmentId || parentAssessmentId || '',
                    status: 'ASSIGNED',
                    createdAt: '',
                    updatedAt: '',
                    dueDate: '',
                    daysLeft: 0,
                    assignedDate: '',
                    assessor: {
                        id: '',
                        name: assessmentData.assessorName || 'Assessor',
                        email: '',
                    },
                    vendor: {
                        id: '',
                        name: '',
                        email: '',
                    },
                    parentAssessment: {
                        id: submittedAssessmentId || parentAssessmentId || '',
                        title: assessmentData.title || 'Assessment',
                        questions: assessmentData.questions || [],
                    }
                }

                setAssessment(combinedData)

                // Initialize answers
                const initialAnswers: Record<string, Answer> = {}
                if (assessmentData.questions && Array.isArray(assessmentData.questions)) {
                    assessmentData.questions.forEach((question: any) => {
                        initialAnswers[question.id] = {
                            questionId: question.id,
                            questionType: question.questionType,
                            answer: "",
                            answerExplanation: "",
                            fileId: "",
                            supportingFileId: "",
                            selectedOptions: [],
                        }
                    })
                }


                // Process saved answers if available
                console.log("=== SAVED ANSWERS DEBUG ===")
                console.log("Saved answers:", JSON.stringify(savedAnswers, null, 2))
                console.log("Initial answers keys:", Object.keys(initialAnswers))
                console.log("Number of saved questions:", savedAnswers?.questions?.length || 0)

                if (savedAnswers && savedAnswers.questions && savedAnswers.questions.length > 0) {
                    console.log("Processing", savedAnswers.questions.length, "saved answers...")

                    savedAnswers.questions.forEach((savedAnswer: any) => {
                        console.log("\n--- Processing saved answer ---")
                        console.log("questionId:", savedAnswer.questionId)
                        console.log("questionText:", savedAnswer.questionText)
                        console.log("answer:", savedAnswer.answer)
                        console.log("explanation:", savedAnswer.explanation)

                        // Try to match by question ID first
                        let matchedQuestionId = savedAnswer.questionId

                        if (!initialAnswers[matchedQuestionId]) {
                            // If not found by ID, try to match by question text
                            console.log("⚠️ Question ID not found, attempting to match by questionText...")
                            const matchByText = Object.keys(initialAnswers).find(qId => {
                                const question = assessmentData.questions.find((q: any) => q.id === qId)
                                return question && question.questionText === savedAnswer.questionText
                            })

                            if (matchByText) {
                                matchedQuestionId = matchByText
                                console.log("✓ Matched by questionText! New questionId:", matchedQuestionId)
                            } else {
                                console.warn("⚠️ Could not match question by ID or text:", savedAnswer.questionText)
                                console.warn("Available question IDs:", Object.keys(initialAnswers))
                                return // Skip this saved answer
                            }
                        }

                        // Apply the saved answer to the matched question
                        if (initialAnswers[matchedQuestionId]) {
                            console.log("Setting saved data for question:", matchedQuestionId)
                            // Create a new object to ensure React detects the change
                            initialAnswers[matchedQuestionId] = {
                                ...initialAnswers[matchedQuestionId],
                                answer: savedAnswer.answer || "",
                                answerExplanation: savedAnswer.explanation || "",
                            }

                            // Handle file IDs and names for display
                            // Use the id from API response for existing files
                            if (savedAnswer.answerFile) {
                                // Use id from API response for draft API calls
                                initialAnswers[matchedQuestionId].fileId = "" // Keep empty - only set for new uploads
                                initialAnswers[matchedQuestionId].uploadedFileName = savedAnswer.answerFile.name || ""
                                initialAnswers[matchedQuestionId].existingFileKey = savedAnswer.answerFile.id || "" // Use id for API calls
                            }
                            if (savedAnswer.supportingFile) {
                                // Use id from API response for draft API calls
                                initialAnswers[matchedQuestionId].supportingFileId = "" // Keep empty - only set for new uploads
                                initialAnswers[matchedQuestionId].supportingFileName = savedAnswer.supportingFile.name || ""
                                initialAnswers[matchedQuestionId].existingSupportingFileKey = savedAnswer.supportingFile.id || "" // Use id for API calls
                            }

                            // Handle selected options for SINGLE_CHOICE and MULTIPLE_CHOICE
                            // The selected options are stored in the answer field (e.g., "1" or "1,2")
                            if (savedAnswer.answer && (savedAnswer.questionType === 'SINGLE_CHOICE' || savedAnswer.questionType === 'MULTIPLE_CHOICE')) {
                                const selectedIds = savedAnswer.answer.split(',').map((id: string) => id.trim()).filter((id: string) => id)
                                initialAnswers[matchedQuestionId].selectedOptions = selectedIds
                                console.log(`Parsed selectedOptions for question ${matchedQuestionId}:`, selectedIds)
                            }

                            console.log("✓ Updated answer object:", initialAnswers[matchedQuestionId])
                        }
                    })

                    console.log("\n=== FINAL STATE ===")
                    console.log("Final initialAnswers:", JSON.stringify(initialAnswers, null, 2))
                    toast.success(`Loaded ${savedAnswers.questions.length} saved answers`)
                } else {
                    console.log("No saved answers to populate")
                }

                console.log("Setting answers state with:", Object.keys(initialAnswers).length, "questions")
                // Create a deep copy to ensure React detects all changes
                const finalAnswers: Record<string, Answer> = {}
                Object.keys(initialAnswers).forEach(key => {
                    finalAnswers[key] = { ...initialAnswers[key] }
                })
                console.log("Final answers being set:", finalAnswers)
                setAnswers(finalAnswers)
            } catch (error) {
                console.error("Error fetching assessment:", error)
                toast.error("Failed to load assessment. Please try again.")
                setAssessment(null)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAssessment()
    }, [parentAssessmentId, submittedAssessmentId, isMounted, assessmentId])

    // Update answer field
    const updateAnswer = (questionId: string, field: keyof Answer, value: any) => {
        setAnswers((prev) => ({
            ...prev,
            [questionId]: {
                ...prev[questionId],
                [field]: value,
            },
        }))
    }

    // Handle file selection (no upload yet)
    const handleFileUpload = (
        questionId: string,
        file: File,
        fieldType: "fileId" | "supportingFileId"
    ) => {
        if (fieldType === "fileId") {
            updateAnswer(questionId, "uploadedFile", file)
        } else {
            updateAnswer(questionId, "supportingFile", file)
        }
    }

    // Remove uploaded file (local only - for newly selected files)
    const removeFile = (questionId: string, fieldType: "fileId" | "supportingFileId") => {
        updateAnswer(questionId, fieldType, "")
        if (fieldType === "fileId") {
            updateAnswer(questionId, "uploadedFile", undefined)
            updateAnswer(questionId, "uploadedFileName", undefined)
        } else {
            updateAnswer(questionId, "supportingFile", undefined)
            updateAnswer(questionId, "supportingFileName", undefined)
        }
    }

    // Open delete file confirmation dialog
    const openDeleteFileDialog = (questionId: string, fieldType: "fileId" | "supportingFileId") => {
        const answer = answers[questionId]
        const fileName = fieldType === "fileId" ? answer?.uploadedFileName : answer?.supportingFileName
        const fileKey = fieldType === "fileId" ? answer?.fileId : answer?.supportingFileId

        if (!fileKey && !fileName) return

        setFileToDelete({
            questionId,
            fieldType,
            fileName: fileName || fileKey || ""
        })
        setIsDeleteFileDialogOpen(true)
    }

    // Delete uploaded file from server
    const handleDeleteFile = async () => {
        if (!fileToDelete) return

        const { questionId, fieldType } = fileToDelete
        const answer = answers[questionId]

        // Get the file key for deletion
        // For existing files (loaded from API), use existingFileKey/existingSupportingFileKey
        // For newly uploaded files, use fileId/supportingFileId
        let keyToDelete: string | undefined
        if (fieldType === "fileId") {
            keyToDelete = answer?.existingFileKey || answer?.fileId || answer?.uploadedFileName
        } else {
            keyToDelete = answer?.existingSupportingFileKey || answer?.supportingFileId || answer?.supportingFileName
        }

        setIsDeletingFile(true)

        try {
            if (keyToDelete) {
                await deleteFile(keyToDelete)
            }
            toast.success("File deleted successfully")

            // Clear the file from state
            updateAnswer(questionId, fieldType, "")
            if (fieldType === "fileId") {
                updateAnswer(questionId, "uploadedFile", undefined)
                updateAnswer(questionId, "uploadedFileName", undefined)
                updateAnswer(questionId, "existingFileKey" as keyof Answer, undefined)
            } else {
                updateAnswer(questionId, "supportingFile", undefined)
                updateAnswer(questionId, "supportingFileName", undefined)
                updateAnswer(questionId, "existingSupportingFileKey" as keyof Answer, undefined)
            }

            setIsDeleteFileDialogOpen(false)
            setFileToDelete(null)
        } catch (error) {
            console.error("Error deleting file:", error)
            toast.error("Failed to delete file")
        } finally {
            setIsDeletingFile(false)
        }
    }

    // Check if file is already uploaded to server (has a filename but no pending File object)
    const isFileUploaded = (questionId: string, fieldType: "fileId" | "supportingFileId"): boolean => {
        const answer = answers[questionId]
        if (!answer) return false

        if (fieldType === "fileId") {
            // File is uploaded if we have a filename/fileId/existingFileKey but no pending File object to upload
            return !!(answer.fileId || answer.uploadedFileName || answer.existingFileKey) && !(answer.uploadedFile instanceof File)
        } else {
            // Supporting file is uploaded if we have a filename/fileId/existingSupportingFileKey but no pending File object to upload
            return !!(answer.supportingFileId || answer.supportingFileName || answer.existingSupportingFileKey) && !(answer.supportingFile instanceof File)
        }
    }

    // Handle checkbox change for multi-select
    const handleCheckboxChange = (questionId: string, optionId: string, checked: boolean) => {
        const currentOptions = answers[questionId]?.selectedOptions || []
        const newOptions = checked
            ? [...currentOptions, optionId]
            : currentOptions.filter((id) => id !== optionId)
        updateAnswer(questionId, "selectedOptions", newOptions)
    }

    // Check if all required questions are answered
    const hasAnsweredRequiredQuestions = (): boolean => {
        if (!assessment?.parentAssessment?.questions) return false

        const questions = assessment.parentAssessment.questions

        for (const question of questions) {
            // FILE_UPLOAD is not required
            if (question.questionType === "FILE_UPLOAD") continue

            const answer = answers[question.id]
            if (!answer) return false

            // Check based on question type
            switch (question.questionType) {
                case "TEXT":
                case "NUMBER":
                case "BOOLEAN":
                case "SINGLE_CHOICE":
                    if (!answer.answer || answer.answer.trim() === "") return false
                    break
                case "MULTIPLE_CHOICE":
                    if (!answer.selectedOptions || answer.selectedOptions.length === 0) return false
                    break
                default:
                    if (!answer.answer || answer.answer.trim() === "") return false
            }
        }

        return true
    }

    // Check if any question has data entered
    const hasAnyAnswerData = (): boolean => {
        for (const questionId in answers) {
            const answer = answers[questionId]
            if (answer.answer && answer.answer.trim() !== "") return true
            if (answer.selectedOptions && answer.selectedOptions.length > 0) return true
            if (answer.uploadedFile) return true
            if (answer.fileId && answer.fileId.trim() !== "") return true
            if (answer.existingFileKey && answer.existingFileKey.trim() !== "") return true
        }
        return false
    }

    // Save draft
    const handleSaveDraft = async (submit: boolean = false) => {
        setIsSaving(true)

        try {
            // First, upload all pending files in parallel
            const updatedAnswers = { ...answers }

            // Collect all file upload tasks
            const uploadTasks: Promise<{ questionId: string; fieldType: 'fileId' | 'supportingFileId'; uploadedFileId: string }>[] = []

            for (const questionId in updatedAnswers) {
                const answer = updatedAnswers[questionId]

                // Upload main file if present (File object means it's a new file to upload)
                if (answer.uploadedFile instanceof File) {
                    const file = answer.uploadedFile
                    uploadTasks.push(
                        uploadFile(file, "uploads", "header")
                            .then((response) => ({
                                questionId,
                                fieldType: 'fileId' as const,
                                uploadedFileId: response.data.uploadedFileId,
                            }))
                            .catch((error) => {
                                console.error("Error uploading file:", error)
                                toast.error(`Failed to upload file for question`)
                                throw error
                            })
                    )
                }

                // Upload supporting file if present (File object means it's a new file to upload)
                if (answer.supportingFile instanceof File) {
                    const file = answer.supportingFile
                    uploadTasks.push(
                        uploadFile(file, "uploads", "header")
                            .then((response) => ({
                                questionId,
                                fieldType: 'supportingFileId' as const,
                                uploadedFileId: response.data.uploadedFileId,
                            }))
                            .catch((error) => {
                                console.error("Error uploading supporting file:", error)
                                toast.error(`Failed to upload supporting file`)
                                throw error
                            })
                    )
                }
            }

            // Execute all uploads in parallel
            if (uploadTasks.length > 0) {
                const uploadResults = await Promise.all(uploadTasks)

                // Assign uploaded file IDs to respective question objects
                for (const result of uploadResults) {
                    updatedAnswers[result.questionId][result.fieldType] = result.uploadedFileId
                }
            }

            // Update state with file IDs
            setAnswers(updatedAnswers)

            // Prepare answers for API
            const answersData: AnswerInput[] = Object.values(updatedAnswers).map((answer) => {
                // Use fileId if set (new upload), otherwise use existingFileKey (previously uploaded)
                const finalFileId = answer.fileId || answer.existingFileKey || ""
                const finalSupportingFileId = answer.supportingFileId || answer.existingSupportingFileKey || ""

                // For BOOLEAN type, pass the answer as selectedOptions with Yes/No
                if (answer.questionType === "BOOLEAN" && answer.answer) {
                    return {
                        questionId: answer.questionId,
                        questionType: answer.questionType as any,
                        answer: answer.answer,
                        answerExplanation: answer.answerExplanation || "",
                        fileId: finalFileId,
                        supportingFileId: finalSupportingFileId,
                        selectedOptions: [answer.answer], // Pass "Yes" or "No" as selectedOptions
                    }
                }

                // For other types, handle normally
                return {
                    questionId: answer.questionId,
                    questionType: answer.questionType as any,
                    answer: answer.answer,
                    answerExplanation: answer.answerExplanation || "",
                    fileId: finalFileId,
                    supportingFileId: finalSupportingFileId,
                    selectedOptions: answer.selectedOptions.length > 0 ? answer.selectedOptions : [],
                }
            })

            await saveAssessmentDraft(assessmentId, {
                answers: answersData,
                submit,
            })

            toast.success(submit ? "Assessment submitted successfully" : "Progress saved successfully")

            if (submit) {
                router.push(`/vendor/assessments/${assessmentId}/payment`)
            }
        } catch (error) {
            console.error("Error saving draft:", error)
            toast.error("Failed to save progress")
        } finally {
            setIsSaving(false)
        }
    }

    // Render question based on type
    const renderQuestion = (question: AssessmentQuestion, index: number) => {
        const answer = answers[question.id]
        if (!answer) return null

        return (
            <div key={question.id} className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm">
                {/* Question Header */}
                <div className="mb-4">
                    <div className="flex items-start gap-2">
                        <span className="font-semibold text-gray-900">{index + 1}.</span>
                        <div className="flex-1">
                            <div className="flex items-start gap-2">
                                <p className="font-medium text-gray-900">{question.questionText}</p>
                                {question.questionType !== "FILE_UPLOAD" && (
                                    <span className="text-red-500 font-medium">*</span>
                                )}
                                <Info className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Question Type Specific Input */}
                    {question.questionType === "TEXT" && (
                        <div className="space-y-2">
                            <Textarea
                                placeholder="Enter your response..."
                                value={answer.answer}
                                onChange={(e) => updateAnswer(question.id, "answer", e.target.value)}
                                className="min-h-[100px] resize-none border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                            />
                        </div>
                    )}

                    {question.questionType === "NUMBER" && (
                        <div className="space-y-2">
                            <Input
                                type="number"
                                placeholder="Enter a number..."
                                value={answer.answer}
                                onChange={(e) => updateAnswer(question.id, "answer", e.target.value)}
                                className="border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                            />
                        </div>
                    )}

                    {question.questionType === "BOOLEAN" && (
                        <div className="space-y-2">
                            <RadioGroup
                                value={answer.answer}
                                onValueChange={(value) => updateAnswer(question.id, "answer", value)}
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="Yes" id={`${question.id}-yes`} />
                                    <Label htmlFor={`${question.id}-yes`}>Yes</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="No" id={`${question.id}-no`} />
                                    <Label htmlFor={`${question.id}-no`}>No</Label>
                                </div>
                            </RadioGroup>
                        </div>
                    )}

                    {question.questionType === "SINGLE_CHOICE" && (
                        <div className="space-y-2">
                            <Select
                                value={answer.answer}
                                onValueChange={(value) => updateAnswer(question.id, "answer", value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select an option..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {question.options
                                        .sort((a, b) => a.sequence - b.sequence)
                                        .map((option) => (
                                            <SelectItem key={option.id} value={option.id.toString()}>
                                                {option.option}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    {question.questionType === "MULTIPLE_CHOICE" && (
                        <div className="space-y-2">
                            {question.options
                                .sort((a, b) => a.sequence - b.sequence)
                                .map((option) => (
                                    <div key={option.id} className="flex items-center space-x-2">
                                        <Checkbox
                                            id={`${question.id}-${option.id}`}
                                            checked={answer.selectedOptions.includes(option.id.toString())}
                                            onCheckedChange={(checked) =>
                                                handleCheckboxChange(question.id, option.id.toString(), !!checked)
                                            }
                                        />
                                        <Label htmlFor={`${question.id}-${option.id}`}>
                                            {option.option}
                                        </Label>
                                    </div>
                                ))}
                        </div>
                    )}

                    {question.questionType === "FILE_UPLOAD" && (
                        <div className="space-y-2">
                            {(answer.uploadedFile || answer.uploadedFileName) ? (
                                <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                                    <span className="flex-1 text-sm text-gray-700">
                                        {answer.uploadedFile ? answer.uploadedFile.name : answer.uploadedFileName}
                                    </span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            isFileUploaded(question.id, "fileId")
                                                ? openDeleteFileDialog(question.id, "fileId")
                                                : removeFile(question.id, "fileId")
                                        }
                                        className={`h-8 w-8 p-0 ${isFileUploaded(question.id, "fileId") ? "text-gray-500 hover:bg-red-500 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                                    >
                                        {isFileUploaded(question.id, "fileId") ? (
                                            <Trash2 className="h-4 w-4" />
                                        ) : (
                                            <X className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                                    <Upload className="mx-auto h-8 w-8 text-gray-400 mb-3" />
                                    <p className="text-sm text-gray-600 mb-3">
                                        Click to upload or drag and drop
                                    </p>
                                    <p className="text-xs text-gray-400 mb-3">
                                        Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
                                    </p>
                                    <input
                                        type="file"
                                        className="hidden"
                                        id={`file-${question.id}`}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(question.id, file, "fileId")
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() => document.getElementById(`file-${question.id}`)?.click()}
                                        className="border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                    >
                                        Choose File
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Explanation Field (optional for all types) */}
                    <div className="space-y-2">
                        <Label className="text-sm text-gray-600 font-normal">Explanation (optional)</Label>
                        <Textarea
                            placeholder="Add any additional explanation or context..."
                            value={answer.answerExplanation}
                            onChange={(e) =>
                                updateAnswer(question.id, "answerExplanation", e.target.value)
                            }
                            className="min-h-[80px] resize-none border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        />
                    </div>

                    {/* Supporting File (optional for all types) */}
                    <div className="space-y-2">
                        <Label className="text-sm text-gray-600 font-normal">Any supporting file (optional)</Label>
                        {(answer.supportingFile || answer.supportingFileName) ? (
                            <div className="flex items-center gap-2 p-3 border border-gray-200 rounded-md bg-gray-50">
                                <span className="flex-1 text-sm text-gray-700">
                                    {answer.supportingFile ? answer.supportingFile.name : answer.supportingFileName}
                                </span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                        isFileUploaded(question.id, "supportingFileId")
                                            ? openDeleteFileDialog(question.id, "supportingFileId")
                                            : removeFile(question.id, "supportingFileId")
                                    }
                                    className={`h-8 w-8 p-0 ${isFileUploaded(question.id, "supportingFileId") ? "text-gray-500 hover:bg-red-500 hover:text-white" : "text-gray-500 hover:text-gray-700"}`}
                                >
                                    {isFileUploaded(question.id, "supportingFileId") ? (
                                        <Trash2 className="h-4 w-4" />
                                    ) : (
                                        <X className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        className="hidden"
                                        id={`supporting-${question.id}`}
                                        accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
                                        onChange={(e) => {
                                            const file = e.target.files?.[0]
                                            if (file) {
                                                handleFileUpload(question.id, file, "supportingFileId")
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            document.getElementById(`supporting-${question.id}`)?.click()
                                        }
                                        className="border-gray-300 hover:bg-gray-100 hover:text-gray-700"
                                    >
                                        <Upload className="mr-2 h-4 w-4" />
                                        Attach file
                                    </Button>
                                </div>
                                <p className="text-xs text-gray-400">
                                    Accepted formats: PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, JPEG
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    // Show loading state if not mounted or still loading
    if (!isMounted || isLoading || !assessment) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    // Verify all required data is present
    if (!assessment.parentAssessment || !assessment.assessor) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Assessment data incomplete</p>
                <Button onClick={() => router.push("/vendor/assessments")}>
                    Back to Assessments
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/vendor/assessments")}
                        className="mb-3 -ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        {assessment.parentAssessment.title} Assessment for {assessment.assessor.name}
                    </h1>

                    {/* Steps Indicator */}
                    <div className="flex items-center gap-4">
                        {/* Step 1 - Active */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Step 1</p>
                                <p className="text-xs text-gray-500">Questions</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-8 bg-gray-300"></div>

                        {/* Step 2 - Inactive */}
                        <div className="flex items-center gap-3 opacity-40">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-200 text-gray-600">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                                    <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-600">Step 2</p>
                                <p className="text-xs text-gray-500">Payment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Questions */}
            <div className="flex-1 py-6">
                <div className="max-w-6xl mx-auto px-6 space-y-5">
                    {[...assessment.parentAssessment.questions]
                        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
                        .map((question, index) =>
                            renderQuestion(question, index)
                        )}
                </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-white border-t sticky bottom-0 shadow-lg">
                <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Button
                        variant="outline"
                        onClick={() => router.push("/vendor/assessments")}
                        className="border-gray-300"
                    >
                        Cancel
                    </Button>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={() => handleSaveDraft(false)}
                            disabled={isSaving || !hasAnyAnswerData()}
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Upload className="mr-2 h-4 w-4" />
                                    Save Progress
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={() => handleSaveDraft(true)}
                            disabled={isSaving || !hasAnsweredRequiredQuestions()}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Continue to Payment
                            <ArrowLeft className="ml-2 h-4 w-4 rotate-180" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Delete File Confirmation Dialog */}
            <Dialog open={isDeleteFileDialogOpen} onOpenChange={setIsDeleteFileDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete File</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete &quot;{fileToDelete?.fileName}&quot;? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteFileDialogOpen(false)
                                setFileToDelete(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteFile} disabled={isDeletingFile}>
                            {isDeletingFile ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
