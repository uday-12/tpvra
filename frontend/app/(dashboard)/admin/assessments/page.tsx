"use client"

import { useState, useEffect, useRef } from "react"
import { Eye, Pencil, Plus, Search, Trash2, X, Loader2, Info, Upload } from "lucide-react"
import { Pagination } from "@/components/ui/pagination"
import { toast } from "sonner"
import { useDebouncedCallback } from "@tanstack/react-pacer"
import Papa from "papaparse"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { InfiniteScrollSelect } from "@/components/ui/infinite-scroll-select"
import { MultiSelectFilter } from "@/components/ui/multi-select-filter"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip"

// API imports
import {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    type Category as ApiCategory,
} from "@/apis/categories"
import {
    getQuestions,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    bulkDeleteQuestions,
    bulkUploadQuestions,
    type Question as ApiQuestion,
    type QuestionType as ApiQuestionType,
    type RiskRating as ApiRiskRating,
} from "@/apis/questions"
import {
    getAssessments as fetchAssessments,
    createAssessment,
    updateAssessment,
    deleteAssessment,
    getAssessmentById,
    type Assessment as ApiAssessment,
    type AssessmentDetails as ApiAssessmentDetails,
} from "@/apis/assessments"
import {
    getMappings,
    createMapping,
    updateMapping,
    deleteMapping,
    type AssessmentMapping,
} from "@/apis/mappings"
import { getAssessors, getVendors, getAssessorsPaginated, getVendorsPaginated, type AssessorLookup, type VendorLookup } from "@/apis/commonLookups"

// Types
type Assessment = {
    id: string
    name: string
    questions: number
    created: string
}

type Question = {
    id: string
    question: string
    type: "yes_no" | "single_select" | "multi_select" | "free_text" | "file_upload" | "number"
    riskRating: "low" | "medium" | "high"
    category: string
    options?: { id: number; option: string; sequence: number }[]
    rtv?: string
    recommendation?: string
}

type Category = {
    id: string
    name: string
    questionsCount?: number
}

export default function AdminAssessmentsPage() {
    const [activeTab, setActiveTab] = useState<"mappings" | "assessments" | "questions" | "categories">("mappings")
    const [searchQuery, setSearchQuery] = useState("")
    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<string[]>([])
    const [riskRatingFilter, setRiskRatingFilter] = useState<string[]>([])
    const [categoryFilter, setCategoryFilter] = useState<string[]>([])

    // Debounced search handler for API calls
    const handleDebouncedSearch = useDebouncedCallback((value: string) => {
        setDebouncedSearchQuery(value)
    }, { wait: 500 })

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        handleDebouncedSearch(value)
    }

    // Mapping filters
    const [mappingAssessorFilter, setMappingAssessorFilter] = useState<string[]>([])
    const [mappingVendorFilter, setMappingVendorFilter] = useState<string[]>([])
    const [mappingAssessmentFilter, setMappingAssessmentFilter] = useState<string[]>([])
    const [mappingStatusFilter, setMappingStatusFilter] = useState<string[]>([])

    // Sort state
    const [sortColumn, setSortColumn] = useState<string>("")
    const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
    const [isAddCategoryDialogOpen, setIsAddCategoryDialogOpen] = useState(false)
    const [isEditCategoryDialogOpen, setIsEditCategoryDialogOpen] = useState(false)
    const [isDeleteCategoryDialogOpen, setIsDeleteCategoryDialogOpen] = useState(false)
    const [categoryName, setCategoryName] = useState("")
    const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

    // Categories API state
    const [categories, setCategories] = useState<Category[]>([])
    const [isLoadingCategories, setIsLoadingCategories] = useState(false)
    const [isAddingCategory, setIsAddingCategory] = useState(false)
    const [isEditingCategory, setIsEditingCategory] = useState(false)
    const [isDeletingCategory, setIsDeletingCategory] = useState(false)

    // Questions API state
    const [questions, setQuestions] = useState<Question[]>([])
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(false)
    const [isAddingQuestion, setIsAddingQuestion] = useState(false)
    const [isEditingQuestion, setIsEditingQuestion] = useState(false)
    const [isDeletingQuestion, setIsDeletingQuestion] = useState(false)

    // Assessments API state
    const [assessments, setAssessments] = useState<Assessment[]>([])
    const [isLoadingAssessments, setIsLoadingAssessments] = useState(false)
    const [isCreatingAssessment, setIsCreatingAssessment] = useState(false)
    const [isUpdatingAssessment, setIsUpdatingAssessment] = useState(false)
    const [isDeletingAssessment, setIsDeletingAssessment] = useState(false)

    // Ref to track initial mount
    const isInitialMount = useRef(true)

    // Track which data has been loaded to avoid duplicate fetches
    const [hasFetchedMappings, setHasFetchedMappings] = useState(false)
    const [hasFetchedAssessments, setHasFetchedAssessments] = useState(false)
    const [hasFetchedQuestions, setHasFetchedQuestions] = useState(false)
    const [hasFetchedCategories, setHasFetchedCategories] = useState(false)

    // Pagination state for each tab
    const [categoriesPage, setCategoriesPage] = useState(1)
    const [categoriesTotalPages, setCategoriesTotalPages] = useState(1)
    const [categoriesHasNextPage, setCategoriesHasNextPage] = useState(false)
    const [categoriesHasPrevPage, setCategoriesHasPrevPage] = useState(false)

    const [questionsPage, setQuestionsPage] = useState(1)
    const [questionsTotalPages, setQuestionsTotalPages] = useState(1)
    const [questionsHasNextPage, setQuestionsHasNextPage] = useState(false)
    const [questionsHasPrevPage, setQuestionsHasPrevPage] = useState(false)

    const [assessmentsPage, setAssessmentsPage] = useState(1)
    const [assessmentsTotalPages, setAssessmentsTotalPages] = useState(1)
    const [assessmentsHasNextPage, setAssessmentsHasNextPage] = useState(false)
    const [assessmentsHasPrevPage, setAssessmentsHasPrevPage] = useState(false)

    const [mappingsPage, setMappingsPage] = useState(1)
    const [mappingsTotalPages, setMappingsTotalPages] = useState(1)
    const [mappingsHasNextPage, setMappingsHasNextPage] = useState(false)
    const [mappingsHasPrevPage, setMappingsHasPrevPage] = useState(false)

    const ITEMS_PER_PAGE = 10

    // Question dialogs
    const [isAddQuestionDialogOpen, setIsAddQuestionDialogOpen] = useState(false)
    const [isEditQuestionDialogOpen, setIsEditQuestionDialogOpen] = useState(false)
    const [isDeleteQuestionDialogOpen, setIsDeleteQuestionDialogOpen] = useState(false)
    const [questionText, setQuestionText] = useState("")
    const [questionType, setQuestionType] = useState("")
    const [questionRiskRating, setQuestionRiskRating] = useState("")
    const [questionCategory, setQuestionCategory] = useState("")
    const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)

    // Bulk delete questions state
    const [bulkDeleteIds, setBulkDeleteIds] = useState<Set<string>>(new Set())
    const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false)
    const [isBulkDeleting, setIsBulkDeleting] = useState(false)

    // Bulk upload questions state
    const [isBulkUploadQuestionsDialogOpen, setIsBulkUploadQuestionsDialogOpen] = useState(false)
    const [bulkUploadQuestionsProgress, setBulkUploadQuestionsProgress] = useState({ current: 0, total: 0 })
    const [isBulkUploadingQuestions, setIsBulkUploadingQuestions] = useState(false)

    // Options state for single/multi select questions
    const [questionOptions, setQuestionOptions] = useState<string[]>([""])

    // RTV and Recommendation state
    const [questionRtv, setQuestionRtv] = useState("")
    const [questionRecommendation, setQuestionRecommendation] = useState("")

    // Helper to check if question type needs options
    const questionTypeNeedsOptions = (type: string) => {
        return type === "single_select" || type === "multi_select"
    }

    // Options management functions
    const handleAddOption = () => {
        setQuestionOptions([...questionOptions, ""])
    }

    const handleRemoveOption = (index: number) => {
        if (questionOptions.length > 1) {
            setQuestionOptions(questionOptions.filter((_, i) => i !== index))
        }
    }

    const handleUpdateOption = (index: number, value: string) => {
        const newOptions = [...questionOptions]
        newOptions[index] = value
        setQuestionOptions(newOptions)
    }

    // Convert options array to API format
    const convertOptionsToAPIFormat = (options: string[]) => {
        return options
            .filter(opt => opt.trim() !== "")
            .map((option, index) => ({
                id: index + 1,
                option: option.trim(),
                sequence: index + 1,
            }))
    }

    // Create Assessment dialog
    const [isCreateAssessmentDialogOpen, setIsCreateAssessmentDialogOpen] = useState(false)
    const [assessmentName, setAssessmentName] = useState("")
    const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])
    const [assessmentQuestionSearch, setAssessmentQuestionSearch] = useState("")
    const [assessmentCategoryFilter, setAssessmentCategoryFilter] = useState("all")

    // View/Edit/Delete Assessment dialogs
    const [isViewAssessmentDialogOpen, setIsViewAssessmentDialogOpen] = useState(false)
    const [isEditAssessmentDialogOpen, setIsEditAssessmentDialogOpen] = useState(false)
    const [isDeleteAssessmentDialogOpen, setIsDeleteAssessmentDialogOpen] = useState(false)
    const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null)
    const [assessmentDetailsLoading, setAssessmentDetailsLoading] = useState(false)
    const [viewAssessmentQuestions, setViewAssessmentQuestions] = useState<Question[]>([])
    const [loadingAssessmentId, setLoadingAssessmentId] = useState<string | null>(null)
    const [loadingAction, setLoadingAction] = useState<'view' | 'edit' | null>(null)

    // Popup questions state (for Create/Edit Assessment dialog)
    const [popupQuestions, setPopupQuestions] = useState<Question[]>([])
    const [isLoadingPopupQuestions, setIsLoadingPopupQuestions] = useState(false)
    const [popupQuestionsPage, setPopupQuestionsPage] = useState(1)
    const [popupQuestionsTotalPages, setPopupQuestionsTotalPages] = useState(1)
    const [popupQuestionsHasNextPage, setPopupQuestionsHasNextPage] = useState(false)
    const [popupQuestionsHasPrevPage, setPopupQuestionsHasPrevPage] = useState(false)
    const [popupSearchQuery, setPopupSearchQuery] = useState("")
    const [popupCategoryFilter, setPopupCategoryFilter] = useState("all")

    // Popup categories state (for Create/Edit Question dialog - infinite scroll)
    const [popupCategories, setPopupCategories] = useState<Category[]>([])
    const [isLoadingPopupCategories, setIsLoadingPopupCategories] = useState(false)
    const [popupCategoriesPage, setPopupCategoriesPage] = useState(1)
    const [popupCategoriesHasNextPage, setPopupCategoriesHasNextPage] = useState(false)
    const [popupCategorySearchQuery, setPopupCategorySearchQuery] = useState("")
    const POPUP_CATEGORIES_LIMIT = 10

    // Mappings state
    const [mappings, setMappings] = useState<AssessmentMapping[]>([])
    const [assessors, setAssessors] = useState<AssessorLookup[]>([])
    const [vendors, setVendors] = useState<VendorLookup[]>([])
    const [isLoadingMappings, setIsLoadingMappings] = useState(false)
    const [isDeletingMapping, setIsDeletingMapping] = useState(false)
    const [isDeleteMappingDialogOpen, setIsDeleteMappingDialogOpen] = useState(false)
    const [isCreateMappingDialogOpen, setIsCreateMappingDialogOpen] = useState(false)
    const [mappingCurrentStep, setMappingCurrentStep] = useState(1)
    const [selectedAssessorId, setSelectedAssessorId] = useState("")
    const [selectedVendorId, setSelectedVendorId] = useState("")
    const [selectedAssessmentIdForMapping, setSelectedAssessmentIdForMapping] = useState("")
    const [mappingDueDate, setMappingDueDate] = useState("")
    const [mappingAmount, setMappingAmount] = useState("")
    const [isCreatingMapping, setIsCreatingMapping] = useState(false)
    const [isEditMappingDialogOpen, setIsEditMappingDialogOpen] = useState(false)
    const [isUpdatingMapping, setIsUpdatingMapping] = useState(false)
    const [selectedMapping, setSelectedMapping] = useState<AssessmentMapping | null>(null)

    // Popup state for mapping dropdowns (infinite scroll)
    const [popupAssessors, setPopupAssessors] = useState<AssessorLookup[]>([])
    const [isLoadingPopupAssessors, setIsLoadingPopupAssessors] = useState(false)
    const [popupAssessorsPage, setPopupAssessorsPage] = useState(1)
    const [popupAssessorsHasNextPage, setPopupAssessorsHasNextPage] = useState(false)
    const [popupAssessorSearchQuery, setPopupAssessorSearchQuery] = useState("")

    const [popupVendors, setPopupVendors] = useState<VendorLookup[]>([])
    const [isLoadingPopupVendors, setIsLoadingPopupVendors] = useState(false)
    const [popupVendorsPage, setPopupVendorsPage] = useState(1)
    const [popupVendorsHasNextPage, setPopupVendorsHasNextPage] = useState(false)
    const [popupVendorSearchQuery, setPopupVendorSearchQuery] = useState("")

    const [popupAssessmentsForMapping, setPopupAssessmentsForMapping] = useState<Assessment[]>([])
    const [isLoadingPopupAssessments, setIsLoadingPopupAssessments] = useState(false)
    const [popupAssessmentsPage, setPopupAssessmentsPage] = useState(1)
    const [popupAssessmentsHasNextPage, setPopupAssessmentsHasNextPage] = useState(false)
    const [popupAssessmentSearchQuery, setPopupAssessmentSearchQuery] = useState("")

    const POPUP_MAPPING_LIMIT = 10

    // Helper functions to convert between UI and API formats
    const mapApiQuestionTypeToUI = (apiType: ApiQuestionType): string => {
        const mapping: Record<ApiQuestionType, string> = {
            'TEXT': 'free_text',
            'BOOLEAN': 'yes_no',
            'SINGLE_CHOICE': 'single_select',
            'MULTIPLE_CHOICE': 'multi_select',
            'FILE_UPLOAD': 'file_upload',
            'NUMBER': 'number',
        }
        return mapping[apiType] || 'free_text'
    }

    const mapUIQuestionTypeToAPI = (uiType: string): ApiQuestionType => {
        const mapping: Record<string, ApiQuestionType> = {
            'free_text': 'TEXT',
            'yes_no': 'BOOLEAN',
            'single_select': 'SINGLE_CHOICE',
            'multi_select': 'MULTIPLE_CHOICE',
            'file_upload': 'FILE_UPLOAD',
            'number': 'NUMBER',
        }
        return mapping[uiType] || 'TEXT'
    }

    const mapApiRiskRatingToUI = (apiRating: ApiRiskRating): string => {
        return apiRating.toLowerCase()
    }

    const mapUIRiskRatingToAPI = (uiRating: string): ApiRiskRating => {
        return uiRating.toUpperCase() as ApiRiskRating
    }

    // Convert API question to UI question format
    const convertApiQuestionToUI = (apiQuestion: ApiQuestion): Question => {
        return {
            id: apiQuestion.id,
            question: apiQuestion.questionText,
            type: mapApiQuestionTypeToUI(apiQuestion.questionType) as Question["type"],
            riskRating: mapApiRiskRatingToUI(apiQuestion.riskRating) as Question["riskRating"],
            category: apiQuestion.category.name,
            options: apiQuestion.options, // Include options from API response
            rtv: apiQuestion.rtv || "",
            recommendation: apiQuestion.recommendation || "",
        }
    }

    // Fetch data based on active tab - only load what's needed
    useEffect(() => {
        let isMounted = true

        const loadDataForTab = async () => {
            if (!isMounted) return

            switch (activeTab) {
                case "mappings":
                    // Mappings tab needs: mappings, assessors, vendors, assessments (for create dropdown)
                    if (!hasFetchedMappings) {
                        await fetchMappingsData()
                        setHasFetchedMappings(true)
                    }
                    if (!hasFetchedAssessments) {
                        await fetchAssessmentsData()
                        setHasFetchedAssessments(true)
                    }
                    break
                case "assessments":
                    // Assessments tab needs: assessments, categories (all) for filters
                    if (!hasFetchedAssessments) {
                        await fetchAssessmentsData()
                        setHasFetchedAssessments(true)
                    }
                    if (!hasFetchedCategories) {
                        await fetchAllCategories()
                        setHasFetchedCategories(true)
                    }
                    break
                case "questions":
                    // Questions tab needs: questions, categories (all categories for dropdown)
                    if (!hasFetchedQuestions) {
                        await fetchQuestions()
                        setHasFetchedQuestions(true)
                    }
                    if (!hasFetchedCategories) {
                        await fetchAllCategories()
                        setHasFetchedCategories(true)
                    }
                    break
                case "categories":
                    // Categories tab only needs categories (with pagination)
                    if (!hasFetchedCategories) {
                        await fetchCategories()
                        setHasFetchedCategories(true)
                    }
                    break
            }

            // Mark that initial mount is complete
            isInitialMount.current = false
        }

        loadDataForTab()

        return () => {
            isMounted = false
        }
    }, [activeTab, hasFetchedMappings, hasFetchedAssessments, hasFetchedQuestions, hasFetchedCategories])

    // Refetch questions when filters or search change (only if already loaded)
    useEffect(() => {
        if (activeTab === "questions" && hasFetchedQuestions) {
            setQuestionsPage(1)
            fetchQuestions(1)
        }
    }, [typeFilter, riskRatingFilter, categoryFilter, debouncedSearchQuery])

    // Refetch categories when search changes (only if already loaded and on categories tab)
    useEffect(() => {
        if (activeTab === "categories" && hasFetchedCategories) {
            setCategoriesPage(1)
            fetchCategories(debouncedSearchQuery, 1)
        }
    }, [debouncedSearchQuery])

    // Refetch assessments when search changes (only if already loaded and on assessments tab)
    useEffect(() => {
        if (activeTab === "assessments" && hasFetchedAssessments) {
            setAssessmentsPage(1)
            fetchAssessmentsData(1, debouncedSearchQuery)
        }
    }, [debouncedSearchQuery])

    // Refetch mappings when search changes (only if already loaded and on mappings tab)
    useEffect(() => {
        if (activeTab === "mappings" && hasFetchedMappings) {
            setMappingsPage(1)
            fetchMappingsData(1, debouncedSearchQuery)
        }
    }, [debouncedSearchQuery])

    // Refetch mappings when filters change (only if already loaded and on mappings tab)
    useEffect(() => {
        if (activeTab === "mappings" && hasFetchedMappings) {
            setMappingsPage(1)
            fetchMappingsData(1, debouncedSearchQuery, {
                assessorIds: mappingAssessorFilter,
                vendorIds: mappingVendorFilter,
                assessmentIds: mappingAssessmentFilter,
                statuses: mappingStatusFilter,
            })
        }
    }, [mappingAssessorFilter, mappingVendorFilter, mappingAssessmentFilter, mappingStatusFilter])

    // Fetch all categories (no pagination) - for dropdowns in Questions/Assessments tabs
    const fetchAllCategories = async () => {
        setIsLoadingCategories(true)
        try {
            const response = await getCategories({})
            setCategories(response.categories)
            setCategoriesTotalPages(response.totalPages)
            setCategoriesHasNextPage(response.hasNextPage)
            setCategoriesHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching categories:", error)
            toast.error("Failed to fetch categories")
        } finally {
            setIsLoadingCategories(false)
        }
    }

    // Fetch categories function with pagination - for Categories tab
    const fetchCategories = async (searchQuery?: string, page: number = categoriesPage) => {
        setIsLoadingCategories(true)
        try {
            const response = await getCategories({
                searchQuery: searchQuery || "",
                page,
                limit: ITEMS_PER_PAGE
            })
            setCategories(response.categories)
            setCategoriesTotalPages(response.totalPages)
            setCategoriesHasNextPage(response.hasNextPage)
            setCategoriesHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching categories:", error)
            toast.error("Failed to fetch categories")
        } finally {
            setIsLoadingCategories(false)
        }
    }

    // Handle categories page change
    const handleCategoriesPageChange = (page: number) => {
        setCategoriesPage(page)
        fetchCategories(debouncedSearchQuery, page)
    }

    // Fetch popup categories with infinite scroll support - for Create/Edit Question dialog
    const fetchPopupCategories = async (searchQuery: string = "", page: number = 1, append: boolean = false) => {
        setIsLoadingPopupCategories(true)
        try {
            const response = await getCategories({
                searchQuery,
                page,
                limit: POPUP_CATEGORIES_LIMIT
            })
            const newCategories = response.categories.map(c => ({
                id: c.id,
                name: c.name,
                questionsCount: c.questionsCount
            }))

            if (append) {
                setPopupCategories(prev => [...prev, ...newCategories])
            } else {
                setPopupCategories(newCategories)
            }
            setPopupCategoriesPage(page)
            setPopupCategoriesHasNextPage(response.hasNextPage)
        } catch (error) {
            console.error("Error fetching popup categories:", error)
            toast.error("Failed to fetch categories")
        } finally {
            setIsLoadingPopupCategories(false)
        }
    }

    // Handle loading more categories for infinite scroll
    const handleLoadMorePopupCategories = () => {
        if (popupCategoriesHasNextPage && !isLoadingPopupCategories) {
            fetchPopupCategories(popupCategorySearchQuery, popupCategoriesPage + 1, true)
        }
    }

    // Debounced fetch for popup category search
    const debouncedPopupCategorySearch = useDebouncedCallback((query: string) => {
        fetchPopupCategories(query, 1, false)
    }, { wait: 300 })

    // Handle search change for popup categories
    const handlePopupCategorySearch = (query: string) => {
        setPopupCategorySearchQuery(query)
        setPopupCategoriesPage(1)
        debouncedPopupCategorySearch(query)
    }

    // Handle when popup category dropdown opens - fetch initial data
    const handlePopupCategoryDropdownOpen = () => {
        fetchPopupCategories("", 1, false)
    }

    // ===== Popup Assessors for Mapping Dialogs =====
    const fetchPopupAssessors = async (searchQuery: string = "", page: number = 1, append: boolean = false) => {
        setIsLoadingPopupAssessors(true)
        try {
            const response = await getAssessorsPaginated({
                searchQuery,
                page,
                limit: POPUP_MAPPING_LIMIT
            })
            if (append) {
                setPopupAssessors(prev => [...prev, ...response.data])
            } else {
                setPopupAssessors(response.data)
            }
            setPopupAssessorsPage(page)
            setPopupAssessorsHasNextPage(response.hasNextPage)
        } catch (error) {
            console.error("Error fetching popup assessors:", error)
            toast.error("Failed to fetch assessors")
        } finally {
            setIsLoadingPopupAssessors(false)
        }
    }

    const handleLoadMorePopupAssessors = () => {
        if (popupAssessorsHasNextPage && !isLoadingPopupAssessors) {
            fetchPopupAssessors(popupAssessorSearchQuery, popupAssessorsPage + 1, true)
        }
    }

    const debouncedPopupAssessorSearch = useDebouncedCallback((query: string) => {
        fetchPopupAssessors(query, 1, false)
    }, { wait: 300 })

    const handlePopupAssessorSearch = (query: string) => {
        setPopupAssessorSearchQuery(query)
        setPopupAssessorsPage(1)
        debouncedPopupAssessorSearch(query)
    }

    const handlePopupAssessorDropdownOpen = () => {
        fetchPopupAssessors("", 1, false)
    }

    // ===== Popup Vendors for Mapping Dialogs =====
    const fetchPopupVendors = async (searchQuery: string = "", page: number = 1, append: boolean = false) => {
        setIsLoadingPopupVendors(true)
        try {
            const response = await getVendorsPaginated({
                searchQuery,
                page,
                limit: POPUP_MAPPING_LIMIT
            })
            if (append) {
                setPopupVendors(prev => [...prev, ...response.data])
            } else {
                setPopupVendors(response.data)
            }
            setPopupVendorsPage(page)
            setPopupVendorsHasNextPage(response.hasNextPage)
        } catch (error) {
            console.error("Error fetching popup vendors:", error)
            toast.error("Failed to fetch vendors")
        } finally {
            setIsLoadingPopupVendors(false)
        }
    }

    const handleLoadMorePopupVendors = () => {
        if (popupVendorsHasNextPage && !isLoadingPopupVendors) {
            fetchPopupVendors(popupVendorSearchQuery, popupVendorsPage + 1, true)
        }
    }

    const debouncedPopupVendorSearch = useDebouncedCallback((query: string) => {
        fetchPopupVendors(query, 1, false)
    }, { wait: 300 })

    const handlePopupVendorSearch = (query: string) => {
        setPopupVendorSearchQuery(query)
        setPopupVendorsPage(1)
        debouncedPopupVendorSearch(query)
    }

    const handlePopupVendorDropdownOpen = () => {
        fetchPopupVendors("", 1, false)
    }

    // ===== Popup Assessments for Mapping Dialogs =====
    const fetchPopupAssessmentsForMapping = async (searchQuery: string = "", page: number = 1, append: boolean = false) => {
        setIsLoadingPopupAssessments(true)
        try {
            const response = await fetchAssessments({
                searchQuery,
                page,
                limit: POPUP_MAPPING_LIMIT
            })
            const mappedAssessments = response.assessments.map(a => ({
                id: a.id,
                name: a.title,
                questions: a.questionsCount,
                created: a.createdAt
            }))
            if (append) {
                setPopupAssessmentsForMapping(prev => [...prev, ...mappedAssessments])
            } else {
                setPopupAssessmentsForMapping(mappedAssessments)
            }
            setPopupAssessmentsPage(page)
            setPopupAssessmentsHasNextPage(response.hasNextPage)
        } catch (error) {
            console.error("Error fetching popup assessments:", error)
            toast.error("Failed to fetch assessments")
        } finally {
            setIsLoadingPopupAssessments(false)
        }
    }

    const handleLoadMorePopupAssessments = () => {
        if (popupAssessmentsHasNextPage && !isLoadingPopupAssessments) {
            fetchPopupAssessmentsForMapping(popupAssessmentSearchQuery, popupAssessmentsPage + 1, true)
        }
    }

    const debouncedPopupAssessmentSearch = useDebouncedCallback((query: string) => {
        fetchPopupAssessmentsForMapping(query, 1, false)
    }, { wait: 300 })

    const handlePopupAssessmentSearch = (query: string) => {
        setPopupAssessmentSearchQuery(query)
        setPopupAssessmentsPage(1)
        debouncedPopupAssessmentSearch(query)
    }

    const handlePopupAssessmentDropdownOpen = () => {
        fetchPopupAssessmentsForMapping("", 1, false)
    }

    // Fetch all questions (no pagination) - for Assessment create/edit popup
    const fetchAllQuestions = async () => {
        setIsLoadingQuestions(true)
        try {
            const response = await getQuestions({})
            // Convert API questions to UI format
            const uiQuestions = response.questions.map(convertApiQuestionToUI)
            setQuestions(uiQuestions)
            setQuestionsTotalPages(response.totalPages)
            setQuestionsHasNextPage(response.hasNextPage)
            setQuestionsHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching questions:", error)
            toast.error("Failed to fetch questions")
        } finally {
            setIsLoadingQuestions(false)
        }
    }

    // Fetch questions function with pagination - for Questions tab
    const fetchQuestions = async (page: number = questionsPage) => {
        setIsLoadingQuestions(true)
        try {
            const response = await getQuestions({
                searchQuery: debouncedSearchQuery,
                categoryId: categoryFilter.length > 0 ? categoryFilter.join(',') : undefined,
                questionType: typeFilter.length > 0 ? typeFilter.map(mapUIQuestionTypeToAPI).join(',') as any : undefined,
                riskRating: riskRatingFilter.length > 0 ? riskRatingFilter.map(mapUIRiskRatingToAPI).join(',') as any : undefined,
                page,
                limit: ITEMS_PER_PAGE,
            })
            // Convert API questions to UI format
            const uiQuestions = response.questions.map(convertApiQuestionToUI)
            setQuestions(uiQuestions)
            setQuestionsTotalPages(response.totalPages)
            setQuestionsHasNextPage(response.hasNextPage)
            setQuestionsHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching questions:", error)
            toast.error("Failed to fetch questions")
        } finally {
            setIsLoadingQuestions(false)
        }
    }

    // Handle questions page change
    const handleQuestionsPageChange = (page: number) => {
        setQuestionsPage(page)
        fetchQuestions(page)
    }

    // Fetch questions for popup (Create/Edit Assessment dialog) with pagination and search
    const fetchPopupQuestions = async (page: number = 1, search: string = "", categoryId: string = "") => {
        setIsLoadingPopupQuestions(true)
        try {
            const response = await getQuestions({
                searchQuery: search,
                categoryId: categoryId && categoryId !== "all" ? categoryId : undefined,
                page,
                limit: ITEMS_PER_PAGE,
            })
            // Convert API questions to UI format
            const uiQuestions = response.questions.map(convertApiQuestionToUI)
            setPopupQuestions(uiQuestions)
            setPopupQuestionsTotalPages(response.totalPages)
            setPopupQuestionsHasNextPage(response.hasNextPage)
            setPopupQuestionsHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching popup questions:", error)
            toast.error("Failed to fetch questions")
        } finally {
            setIsLoadingPopupQuestions(false)
        }
    }

    // Handle popup questions page change
    const handlePopupQuestionsPageChange = (page: number) => {
        setPopupQuestionsPage(page)
        fetchPopupQuestions(page, popupSearchQuery, popupCategoryFilter)
    }

    // Fetch assessments function with pagination and search
    const fetchAssessmentsData = async (page: number = assessmentsPage, search: string = debouncedSearchQuery) => {
        setIsLoadingAssessments(true)
        try {
            const response = await fetchAssessments({
                searchQuery: search,
                page,
                limit: ITEMS_PER_PAGE
            })
            // Convert API assessments to UI format
            const uiAssessments = response.assessments.map((assessment: ApiAssessment) => ({
                id: assessment.id,
                name: assessment.title,
                questions: assessment.questionsCount,
                created: new Date(assessment.createdAt).toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "2-digit",
                }),
            }))
            setAssessments(uiAssessments)
            setAssessmentsTotalPages(response.totalPages)
            setAssessmentsHasNextPage(response.hasNextPage)
            setAssessmentsHasPrevPage(response.hasPrevPage)
        } catch (error) {
            console.error("Error fetching assessments:", error)
            toast.error("Failed to fetch assessments")
        } finally {
            setIsLoadingAssessments(false)
        }
    }

    // Handle assessments page change
    const handleAssessmentsPageChange = (page: number) => {
        setAssessmentsPage(page)
        fetchAssessmentsData(page)
    }

    // Sorting helper function
    const handleSort = (column: string) => {
        if (sortColumn === column) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortColumn(column)
            setSortDirection("asc")
        }
    }

    // Generic sort function
    const sortData = <T,>(data: T[], column: string, direction: "asc" | "desc", getValue: (item: T) => any): T[] => {
        if (!column) return data

        return [...data].sort((a, b) => {
            const aValue = getValue(a)
            const bValue = getValue(b)

            if (aValue === bValue) return 0

            const comparison = aValue < bValue ? -1 : 1
            return direction === "asc" ? comparison : -comparison
        })
    }

    // Sort questions (search is now handled by API)
    const filteredQuestions = (() => {
        return sortData(questions, sortColumn, sortDirection, (question) => {
            switch (sortColumn) {
                case "question": return question.question.toLowerCase()
                case "type": return question.type
                case "riskRating": return question.riskRating
                case "category": return question.category.toLowerCase()
                default: return ""
            }
        })
    })()

    // Sort assessments (search is now handled by API)
    const filteredAssessments = (() => {
        return sortData(assessments, sortColumn, sortDirection, (assessment) => {
            switch (sortColumn) {
                case "name": return assessment.name.toLowerCase()
                case "questions": return assessment.questions
                case "created": return assessment.created
                default: return ""
            }
        })
    })()

    // Sort categories (search is now handled by API)
    const filteredCategories = (() => {
        return sortData(categories, sortColumn, sortDirection, (category) => {
            switch (sortColumn) {
                case "name": return category.name.toLowerCase()
                default: return ""
            }
        })
    })()

    // Get type display
    const getTypeDisplay = (type: string) => {
        const typeMap: Record<string, string> = {
            yes_no: "Yes/No",
            single_select: "Single Select",
            multi_select: "Multi Select",
            free_text: "Free Text",
            file_upload: "File Upload",
            number: "Number",
        }
        return typeMap[type] || type
    }

    // Get risk rating variant
    const getRiskRatingVariant = (rating: string) => {
        switch (rating) {
            case "low":
                return "success"
            case "medium":
                return "secondary"
            case "high":
                return "destructive"
            default:
                return "secondary"
        }
    }

    // Get risk rating display
    const getRiskRatingDisplay = (rating: string) => {
        return rating.charAt(0).toUpperCase() + rating.slice(1)
    }

    // Handle add category
    const handleAddCategory = async () => {
        if (!categoryName.trim()) return

        try {
            setIsAddingCategory(true)
            const response = await createCategory({ name: categoryName })
            toast.success(response.message || "Category created successfully")

            setIsAddCategoryDialogOpen(false)
            setCategoryName("")

            // Fetch updated categories list to get real IDs
            await fetchCategories()
        } catch (error) {
            console.error("Error creating category:", error)
            toast.error("Failed to create category")
        } finally {
            setIsAddingCategory(false)
        }
    }

    // Handle edit category dialog open
    const handleOpenEditCategory = (category: Category) => {
        setSelectedCategory(category)
        setCategoryName(category.name)
        setIsEditCategoryDialogOpen(true)
    }

    // Handle edit category
    const handleEditCategory = async () => {
        if (!categoryName.trim() || !selectedCategory) return

        try {
            setIsEditingCategory(true)
            const response = await updateCategory(selectedCategory.id, { name: categoryName })
            toast.success(response.message || "Category updated successfully")

            // Optimistically update local state instead of refetching
            setCategories(categories.map(cat =>
                cat.id === selectedCategory.id
                    ? { ...cat, name: categoryName }
                    : cat
            ))

            setIsEditCategoryDialogOpen(false)
            setCategoryName("")
            setSelectedCategory(null)
        } catch (error) {
            console.error("Error updating category:", error)
            toast.error("Failed to update category")
        } finally {
            setIsEditingCategory(false)
        }
    }

    // Handle open delete category dialog
    const handleOpenDeleteCategory = (category: Category) => {
        setSelectedCategory(category)
        setIsDeleteCategoryDialogOpen(true)
    }

    // Handle delete category
    const handleDeleteCategory = async () => {
        if (!selectedCategory) return

        try {
            setIsDeletingCategory(true)
            const response = await deleteCategory(selectedCategory.id)
            toast.success(response.message || "Category deleted successfully")

            // Optimistically update local state instead of refetching
            setCategories(categories.filter(cat => cat.id !== selectedCategory.id))

            setIsDeleteCategoryDialogOpen(false)
            setSelectedCategory(null)
        } catch (error) {
            console.error("Error deleting category:", error)
            toast.error("Failed to delete category")
        } finally {
            setIsDeletingCategory(false)
        }
    }

    // Handle open add question dialog
    const handleOpenAddQuestion = () => {
        setQuestionText("")
        setQuestionType("")
        setQuestionRiskRating("")
        setQuestionCategory("")
        setQuestionOptions([""])
        setQuestionRtv("")
        setQuestionRecommendation("")
        // Reset popup categories state (will be fetched when dropdown opens)
        setPopupCategories([])
        setPopupCategoriesPage(1)
        setPopupCategorySearchQuery("")
        setIsAddQuestionDialogOpen(true)
    }

    // Handle open edit question dialog
    const handleOpenEditQuestion = (question: Question) => {
        setSelectedQuestion(question)
        setQuestionText(question.question)
        setQuestionType(question.type)
        setQuestionRiskRating(question.riskRating)
        // Find the category ID from the category name
        const category = categories.find(c => c.name === question.category)
        setQuestionCategory(category?.id || "")

        // Load options if it's a single/multi select question
        if (questionTypeNeedsOptions(question.type) && question.options && question.options.length > 0) {
            // Extract option text from the question
            const optionTexts = question.options.map(opt => opt.option)
            setQuestionOptions(optionTexts)
        } else {
            setQuestionOptions([""])
        }

        // Load RTV and Recommendation
        setQuestionRtv(question.rtv || "")
        setQuestionRecommendation(question.recommendation || "")

        // Reset popup categories state (will be fetched when dropdown opens)
        setPopupCategories([])
        setPopupCategoriesPage(1)
        setPopupCategorySearchQuery("")

        setIsEditQuestionDialogOpen(true)
    }

    // Handle open delete question dialog
    const handleOpenDeleteQuestion = (question: Question) => {
        setSelectedQuestion(question)
        setIsDeleteQuestionDialogOpen(true)
    }

    // Handle add question
    const handleAddQuestion = async () => {
        if (!questionText.trim() || !questionType || !questionRiskRating || !questionCategory) {
            return
        }

        // Validate options if question type requires them
        if (questionTypeNeedsOptions(questionType)) {
            const validOptions = questionOptions.filter(opt => opt.trim() !== "")
            if (validOptions.length < 2) {
                toast.error("Please provide at least 2 options for this question type")
                return
            }
        }

        try {
            setIsAddingQuestion(true)
            const apiQuestionType = mapUIQuestionTypeToAPI(questionType)
            const questionData: any = {
                questionText,
                questionType: apiQuestionType,
                riskRating: mapUIRiskRatingToAPI(questionRiskRating),
                categoryId: questionCategory,
                rtv: questionRtv,
                recommendation: questionRecommendation,
            }

            // Add options if question type requires them
            if (questionTypeNeedsOptions(questionType)) {
                questionData.options = convertOptionsToAPIFormat(questionOptions)
            }

            const response = await createQuestion(questionData)
            toast.success(response.message || "Question created successfully")

            setIsAddQuestionDialogOpen(false)
            setQuestionText("")
            setQuestionType("")
            setQuestionRiskRating("")
            setQuestionCategory("")
            setQuestionOptions([""])
            setQuestionRtv("")
            setQuestionRecommendation("")

            // Fetch updated questions list to get real IDs
            await fetchQuestions()
        } catch (error) {
            console.error("Error creating question:", error)
            toast.error("Failed to create question")
        } finally {
            setIsAddingQuestion(false)
        }
    }

    // Handle edit question
    const handleEditQuestion = async () => {
        if (!questionText.trim() || !questionType || !questionRiskRating || !questionCategory || !selectedQuestion) {
            return
        }

        // Validate options if question type requires them
        if (questionTypeNeedsOptions(questionType)) {
            const validOptions = questionOptions.filter(opt => opt.trim() !== "")
            if (validOptions.length < 2) {
                toast.error("Please provide at least 2 options for this question type")
                return
            }
        }

        try {
            setIsEditingQuestion(true)
            const questionData: any = {
                questionText,
                questionType: mapUIQuestionTypeToAPI(questionType),
                riskRating: mapUIRiskRatingToAPI(questionRiskRating),
                categoryId: questionCategory,
                rtv: questionRtv,
                recommendation: questionRecommendation,
            }

            // Add options if question type requires them
            if (questionTypeNeedsOptions(questionType)) {
                questionData.options = convertOptionsToAPIFormat(questionOptions)
            }

            const response = await updateQuestion(selectedQuestion.id, questionData)
            toast.success(response.message || "Question updated successfully")

            // Optimistically update local state instead of refetching
            const categoryObj = categories.find(c => c.id === questionCategory)
            setQuestions(questions.map(q =>
                q.id === selectedQuestion.id
                    ? {
                        ...q,
                        question: questionText,
                        type: questionType as Question["type"],
                        riskRating: questionRiskRating as Question["riskRating"],
                        category: categoryObj?.name || "",
                        options: questionTypeNeedsOptions(questionType) ? convertOptionsToAPIFormat(questionOptions) : undefined,
                    }
                    : q
            ))

            setIsEditQuestionDialogOpen(false)
            setQuestionText("")
            setQuestionType("")
            setQuestionRiskRating("")
            setQuestionCategory("")
            setQuestionOptions([""])
            setQuestionRtv("")
            setQuestionRecommendation("")
            setSelectedQuestion(null)
        } catch (error) {
            console.error("Error updating question:", error)
            toast.error("Failed to update question")
        } finally {
            setIsEditingQuestion(false)
        }
    }

    // Handle delete question
    const handleDeleteQuestion = async () => {
        if (!selectedQuestion) return

        try {
            setIsDeletingQuestion(true)
            const response = await deleteQuestion(selectedQuestion.id)
            toast.success(response.message || "Question deleted successfully")

            // Optimistically update local state instead of refetching
            setQuestions(questions.filter(q => q.id !== selectedQuestion.id))

            setIsDeleteQuestionDialogOpen(false)
            setSelectedQuestion(null)
        } catch (error) {
            console.error("Error deleting question:", error)
            toast.error("Failed to delete question")
        } finally {
            setIsDeletingQuestion(false)
        }
    }

    // Bulk delete questions handler
    const handleBulkDeleteQuestions = async () => {
        if (bulkDeleteIds.size === 0) return

        try {
            setIsBulkDeleting(true)
            const ids = Array.from(bulkDeleteIds)
            const response = await bulkDeleteQuestions(ids)
            toast.success(response.message || `${ids.length} question(s) deleted successfully`)

            // Optimistically update local state
            setQuestions(questions.filter(q => !bulkDeleteIds.has(q.id)))
            setBulkDeleteIds(new Set())
            setIsBulkDeleteDialogOpen(false)
        } catch (error) {
            console.error("Error bulk deleting questions:", error)
            toast.error("Failed to delete questions")
        } finally {
            setIsBulkDeleting(false)
        }
    }

    const toggleQuestionSelection = (id: string) => {
        setBulkDeleteIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleAllQuestions = () => {
        if (bulkDeleteIds.size === filteredQuestions.length) {
            setBulkDeleteIds(new Set())
        } else {
            setBulkDeleteIds(new Set(filteredQuestions.map(q => q.id)))
        }
    }

    // Download CSV template for bulk upload questions
    const downloadQuestionsTemplate = () => {
        const csvContent = "Question Text,Question Type,Risk Rating,Category Name,RTV,Recommendation,Options\n" +
            "Example question text?,TEXT,LOW,Security,,Recommendation text here,\n" +
            "Is the system secure?,BOOLEAN,HIGH,Security,Risk to vendor text,Recommendation text,\n" +
            "Select all applicable options,MULTIPLE_CHOICE,MEDIUM,Compliance,RTV text,Recommendation,\"Option1|Option2|Option3\"\n" +
            "Select one option,SINGLE_CHOICE,LOW,Operations,,Description here,\"Option A|Option B\""
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", "questions_template.csv")
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Handle bulk upload questions
    const handleBulkUploadQuestions = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.name.endsWith(".csv")) {
            toast.error("Please upload a CSV file")
            return
        }

        setIsBulkUploadingQuestions(true)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    // Validate CSV structure
                    const requiredColumns = ["Question Text", "Question Type", "Risk Rating", "Category Name"]
                    const headers = results.meta.fields || []

                    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
                    if (missingColumns.length > 0) {
                        toast.error(`Missing required columns: ${missingColumns.join(", ")}`)
                        setIsBulkUploadingQuestions(false)
                        return
                    }

                    // Validate data
                    const csvRows = results.data as Array<{
                        "Question Text": string
                        "Question Type": string
                        "Risk Rating": string
                        "Category Name": string
                        "RTV"?: string
                        "Recommendation"?: string
                        "Options"?: string
                    }>

                    if (csvRows.length === 0) {
                        toast.error("CSV file is empty")
                        setIsBulkUploadingQuestions(false)
                        return
                    }

                    // Valid question types and risk ratings
                    const validQuestionTypes = ["TEXT", "BOOLEAN", "SINGLE_CHOICE", "MULTIPLE_CHOICE", "FILE_UPLOAD", "NUMBER"]
                    const validRiskRatings = ["LOW", "MEDIUM", "HIGH"]

                    // Fetch all categories if not already fetched
                    if (categories.length === 0) {
                        await fetchAllCategories()
                    }

                    // Create a map of category names to IDs
                    const categoryMap = new Map(categories.map(c => [c.name.toLowerCase(), c.id]))

                    // Validate each row
                    const errors: string[] = []
                    const questionsToUpload: Array<{
                        questionText: string
                        questionType: ApiQuestionType
                        riskRating: ApiRiskRating
                        categoryId: string
                        options?: Array<{ id: number; option: string; sequence: number }>
                        rtv?: string
                        recommendation?: string
                    }> = []

                    csvRows.forEach((row, index) => {
                        const rowNum = index + 2 // +2 because index starts at 0 and row 1 is header

                        if (!row["Question Text"]?.trim()) {
                            errors.push(`Row ${rowNum}: Question Text is required`)
                        }

                        const questionType = row["Question Type"]?.trim().toUpperCase()
                        if (!questionType) {
                            errors.push(`Row ${rowNum}: Question Type is required`)
                        } else if (!validQuestionTypes.includes(questionType)) {
                            errors.push(`Row ${rowNum}: Invalid Question Type. Must be one of: ${validQuestionTypes.join(", ")}`)
                        }

                        const riskRating = row["Risk Rating"]?.trim().toUpperCase()
                        if (!riskRating) {
                            errors.push(`Row ${rowNum}: Risk Rating is required`)
                        } else if (!validRiskRatings.includes(riskRating)) {
                            errors.push(`Row ${rowNum}: Invalid Risk Rating. Must be one of: ${validRiskRatings.join(", ")}`)
                        }

                        const categoryName = row["Category Name"]?.trim()
                        if (!categoryName) {
                            errors.push(`Row ${rowNum}: Category Name is required`)
                        } else {
                            const categoryId = categoryMap.get(categoryName.toLowerCase())
                            if (!categoryId) {
                                errors.push(`Row ${rowNum}: Category "${categoryName}" not found`)
                            }
                        }

                        // Validate options for SINGLE_CHOICE and MULTIPLE_CHOICE
                        if ((questionType === "SINGLE_CHOICE" || questionType === "MULTIPLE_CHOICE") && !row["Options"]?.trim()) {
                            errors.push(`Row ${rowNum}: Options are required for ${questionType} questions (use pipe | separator)`)
                        }

                        // If no errors for this row, prepare the question data
                        if (errors.filter(e => e.startsWith(`Row ${rowNum}`)).length === 0) {
                            const categoryId = categoryMap.get(categoryName.toLowerCase())!
                            const questionData: typeof questionsToUpload[0] = {
                                questionText: row["Question Text"].trim(),
                                questionType: questionType as ApiQuestionType,
                                riskRating: riskRating as ApiRiskRating,
                                categoryId,
                                rtv: row["RTV"]?.trim() || "",
                                recommendation: row["Recommendation"]?.trim() || "",
                            }

                            // Parse options if provided
                            if (row["Options"]?.trim()) {
                                const optionTexts = row["Options"].split("|").map(opt => opt.trim()).filter(opt => opt)
                                questionData.options = optionTexts.map((opt, idx) => ({
                                    id: idx + 1,
                                    option: opt,
                                    sequence: idx + 1,
                                }))
                            }

                            // Add Yes/No options for BOOLEAN type
                            if (questionType === "BOOLEAN") {
                                questionData.options = [
                                    { id: 1, option: "Yes", sequence: 1 },
                                    { id: 2, option: "No", sequence: 2 },
                                ]
                            }

                            questionsToUpload.push(questionData)
                        }
                    })

                    if (errors.length > 0) {
                        toast.error(`Validation failed:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ""}`)
                        setIsBulkUploadingQuestions(false)
                        return
                    }

                    // Upload questions using bulk API
                    setBulkUploadQuestionsProgress({ current: 0, total: questionsToUpload.length })

                    try {
                        const response = await bulkUploadQuestions({ questions: questionsToUpload })
                        setBulkUploadQuestionsProgress({ current: questionsToUpload.length, total: questionsToUpload.length })

                        toast.success(response.message || `Successfully uploaded ${questionsToUpload.length} questions`)

                        // Refresh questions list
                        await fetchQuestions()
                        setIsBulkUploadQuestionsDialogOpen(false)
                    } catch (error) {
                        console.error("Error bulk uploading questions:", error)
                        toast.error("Failed to upload questions")
                    }
                } catch (error) {
                    console.error("Error processing CSV:", error)
                    toast.error("Failed to process CSV file")
                } finally {
                    setIsBulkUploadingQuestions(false)
                    setBulkUploadQuestionsProgress({ current: 0, total: 0 })
                    // Reset file input
                    event.target.value = ""
                }
            },
            error: (error) => {
                console.error("CSV parsing error:", error)
                toast.error("Failed to parse CSV file")
                setIsBulkUploadingQuestions(false)
            },
        })
    }

    // Handle toggle question selection
    const handleToggleQuestion = (questionId: string) => {
        setSelectedQuestionIds(prev =>
            prev.includes(questionId)
                ? prev.filter(id => id !== questionId)
                : [...prev, questionId]
        )
    }

    // Handle popup search change (with debounce)
    const handlePopupSearchChange = (value: string) => {
        setPopupSearchQuery(value)
        setPopupQuestionsPage(1)
        fetchPopupQuestions(1, value, popupCategoryFilter)
    }

    // Handle popup category filter change
    const handlePopupCategoryFilterChange = (value: string) => {
        setPopupCategoryFilter(value)
        setPopupQuestionsPage(1)
        fetchPopupQuestions(1, popupSearchQuery, value)
    }

    // Handle create assessment
    const handleCreateAssessment = async () => {
        if (!assessmentName.trim() || selectedQuestionIds.length === 0) {
            toast.error("Please provide assessment name and select at least one question")
            return
        }

        try {
            setIsCreatingAssessment(true)
            await createAssessment({
                title: assessmentName,
                questionIds: selectedQuestionIds,
            })
            toast.success("Assessment created successfully")

            setIsCreateAssessmentDialogOpen(false)
            setAssessmentName("")
            setSelectedQuestionIds([])
            setAssessmentQuestionSearch("")
            setAssessmentCategoryFilter("all")

            // Fetch updated assessments list to get real IDs
            await fetchAssessmentsData()
        } catch (error) {
            console.error("Error creating assessment:", error)
            toast.error("Failed to create assessment")
        } finally {
            setIsCreatingAssessment(false)
        }
    }

    // Handle open create assessment dialog
    const handleOpenCreateAssessment = () => {
        setAssessmentName("")
        setSelectedQuestionIds([])
        setAssessmentQuestionSearch("")
        setAssessmentCategoryFilter("all")
        setPopupSearchQuery("")
        setPopupCategoryFilter("all")
        setPopupQuestionsPage(1)
        setIsCreateAssessmentDialogOpen(true)
        // Fetch questions for popup
        fetchPopupQuestions(1, "", "")
    }

    // Handle open view assessment dialog
    const handleOpenViewAssessment = async (assessment: Assessment) => {
        setSelectedAssessment(assessment)
        setAssessmentDetailsLoading(true)
        setLoadingAssessmentId(assessment.id)
        setLoadingAction('view')

        try {
            const assessmentDetails = await getAssessmentById(assessment.id)
            // Convert API questions to UI format
            const uiQuestions = assessmentDetails.questions.map(convertApiQuestionToUI)
            setViewAssessmentQuestions(uiQuestions)
            // Only open the dialog after successful API call
            setIsViewAssessmentDialogOpen(true)
        } catch (error) {
            console.error("Error fetching assessment details:", error)
            toast.error("Failed to fetch assessment details")
        } finally {
            setAssessmentDetailsLoading(false)
            setLoadingAssessmentId(null)
            setLoadingAction(null)
        }
    }

    // Handle open edit assessment dialog
    const handleOpenEditAssessment = async (assessment: Assessment) => {
        setSelectedAssessment(assessment)
        setAssessmentName(assessment.name)
        setAssessmentQuestionSearch("")
        setAssessmentCategoryFilter("all")
        setPopupSearchQuery("")
        setPopupCategoryFilter("all")
        setPopupQuestionsPage(1)
        setAssessmentDetailsLoading(true)
        setLoadingAssessmentId(assessment.id)
        setLoadingAction('edit')

        try {
            const assessmentDetails = await getAssessmentById(assessment.id)
            // Extract question IDs from the assessment details
            const questionIds = assessmentDetails.questions.map(q => q.id)
            setSelectedQuestionIds(questionIds)
            // Fetch questions for popup
            await fetchPopupQuestions(1, "", "")
            // Only open the dialog after successful API call
            setIsEditAssessmentDialogOpen(true)
        } catch (error) {
            console.error("Error fetching assessment details:", error)
            toast.error("Failed to fetch assessment details")
            setSelectedQuestionIds([])
        } finally {
            setAssessmentDetailsLoading(false)
            setLoadingAssessmentId(null)
            setLoadingAction(null)
        }
    }

    // Handle open delete assessment dialog
    const handleOpenDeleteAssessment = (assessment: Assessment) => {
        setSelectedAssessment(assessment)
        setIsDeleteAssessmentDialogOpen(true)
    }

    // Handle edit assessment
    const handleEditAssessment = async () => {
        if (!assessmentName.trim() || selectedQuestionIds.length === 0 || !selectedAssessment) {
            toast.error("Please provide assessment name and select at least one question")
            return
        }

        try {
            setIsUpdatingAssessment(true)
            const updatedAssessment = await updateAssessment(selectedAssessment.id, {
                title: assessmentName,
                questionIds: selectedQuestionIds,
            })
            toast.success("Assessment updated successfully")

            // Optimistically update local state instead of refetching
            setAssessments(assessments.map(a =>
                a.id === selectedAssessment.id
                    ? {
                        ...a,
                        name: updatedAssessment.title,
                        questions: updatedAssessment.questionsCount,
                    }
                    : a
            ))

            setIsEditAssessmentDialogOpen(false)
            setAssessmentName("")
            setSelectedQuestionIds([])
            setAssessmentQuestionSearch("")
            setAssessmentCategoryFilter("all")
            setSelectedAssessment(null)
        } catch (error) {
            console.error("Error updating assessment:", error)
            toast.error("Failed to update assessment")
        } finally {
            setIsUpdatingAssessment(false)
        }
    }

    // Handle delete assessment
    const handleDeleteAssessment = async () => {
        if (!selectedAssessment) return

        try {
            setIsDeletingAssessment(true)
            const response = await deleteAssessment(selectedAssessment.id)
            toast.success(response.message || "Assessment deleted successfully")

            // Optimistically update local state instead of refetching
            setAssessments(assessments.filter(a => a.id !== selectedAssessment.id))

            setIsDeleteAssessmentDialogOpen(false)
            setSelectedAssessment(null)
        } catch (error) {
            console.error("Error deleting assessment:", error)
            toast.error("Failed to delete assessment")
        } finally {
            setIsDeletingAssessment(false)
        }
    }

    // Fetch mappings data with pagination, search, and filters
    const fetchMappingsData = async (
        page: number = mappingsPage,
        search: string = debouncedSearchQuery,
        filters?: {
            assessorIds?: string[];
            vendorIds?: string[];
            assessmentIds?: string[];
            statuses?: string[];
        }
    ) => {
        setIsLoadingMappings(true)
        try {
            const filterParams = filters || {
                assessorIds: mappingAssessorFilter,
                vendorIds: mappingVendorFilter,
                assessmentIds: mappingAssessmentFilter,
                statuses: mappingStatusFilter,
            }

            const [mappingsData, assessorsData, vendorsData] = await Promise.all([
                getMappings({
                    page,
                    limit: ITEMS_PER_PAGE,
                    searchQuery: search,
                    assessorIds: filterParams.assessorIds?.join(',') || '',
                    vendorIds: filterParams.vendorIds?.join(',') || '',
                    assessmentIds: filterParams.assessmentIds?.join(',') || '',
                    statuses: filterParams.statuses?.join(',') || '',
                }),
                getAssessors(),
                getVendors(),
            ])
            setMappings(mappingsData.assignments)
            setMappingsTotalPages(mappingsData.totalPages)
            setMappingsHasNextPage(mappingsData.hasNextPage)
            setMappingsHasPrevPage(mappingsData.hasPrevPage)
            setAssessors(assessorsData)
            setVendors(vendorsData)
        } catch (error) {
            console.error("Error fetching mappings:", error)
            toast.error("Failed to fetch mappings")
        } finally {
            setIsLoadingMappings(false)
        }
    }

    // Handle mappings page change
    const handleMappingsPageChange = (page: number) => {
        setMappingsPage(page)
        fetchMappingsData(page)
    }

    // Sort mappings (search and filters are now handled by API)
    const filteredMappings = (() => {
        return sortData(mappings, sortColumn, sortDirection, (mapping) => {
            switch (sortColumn) {
                case "assessor": return mapping.assessor.name.toLowerCase()
                case "vendor": return mapping.vendor.name.toLowerCase()
                case "assessment": return mapping.parentAssessment.title.toLowerCase()
                case "status": return mapping.status
                case "amount": return (mapping as any).amount || 0
                case "createdAt": return new Date(mapping.createdAt).getTime()
                case "dueDate": return (mapping as any).dueDate ? new Date((mapping as any).dueDate).getTime() : 0
                default: return ""
            }
        })
    })()

    // Handle next step in mapping creation
    const handleMappingNext = () => {
        if (!selectedAssessorId || !selectedVendorId) {
            toast.error("Please select both assessor and vendor")
            return
        }
        setMappingCurrentStep(2)
    }

    // Handle back step in mapping creation
    const handleMappingBack = () => {
        setMappingCurrentStep(1)
    }

    // Handle create mapping
    const handleCreateMapping = async () => {
        if (!selectedAssessmentIdForMapping) {
            toast.error("Please select an assessment")
            return
        }

        if (!mappingDueDate) {
            toast.error("Please select a due date")
            return
        }

        if (!mappingAmount || parseFloat(mappingAmount) <= 0) {
            toast.error("Please enter a valid amount")
            return
        }

        try {
            setIsCreatingMapping(true)
            await createMapping({
                assessorId: selectedAssessorId,
                vendorId: selectedVendorId,
                assessmentId: selectedAssessmentIdForMapping,
                dueDate: mappingDueDate,
                amount: parseFloat(mappingAmount),
            })
            toast.success("Mapping created successfully")

            setIsCreateMappingDialogOpen(false)
            resetMappingDialog()

            // Fetch updated mappings list to get real IDs
            await fetchMappingsData()
        } catch (error) {
            console.error("Error creating mapping:", error)
            toast.error("Failed to create mapping")
        } finally {
            setIsCreatingMapping(false)
        }
    }

    // Reset mapping dialog
    const resetMappingDialog = () => {
        setMappingCurrentStep(1)
        setSelectedAssessorId("")
        setSelectedVendorId("")
        setSelectedAssessmentIdForMapping("")
        setMappingDueDate("")
        setMappingAmount("")
        // Reset popup states for mapping dropdowns
        setPopupAssessors([])
        setPopupAssessorsPage(1)
        setPopupAssessorSearchQuery("")
        setPopupVendors([])
        setPopupVendorsPage(1)
        setPopupVendorSearchQuery("")
        setPopupAssessmentsForMapping([])
        setPopupAssessmentsPage(1)
        setPopupAssessmentSearchQuery("")
    }

    // Handle open delete mapping dialog
    const handleOpenDeleteMapping = (mapping: AssessmentMapping) => {
        setSelectedMapping(mapping)
        setIsDeleteMappingDialogOpen(true)
    }

    // Handle delete mapping
    const handleDeleteMapping = async () => {
        if (!selectedMapping) return

        try {
            setIsDeletingMapping(true)
            await deleteMapping(selectedMapping.id)
            toast.success("Mapping removed successfully")

            // Optimistically update local state instead of refetching
            setMappings(mappings.filter(m => m.id !== selectedMapping.id))

            setIsDeleteMappingDialogOpen(false)
            setSelectedMapping(null)
        } catch (error) {
            console.error("Error deleting mapping:", error)
            toast.error("Failed to delete mapping")
        } finally {
            setIsDeletingMapping(false)
        }
    }

    // Handle open edit mapping
    const handleOpenEditMapping = (mapping: AssessmentMapping) => {
        setSelectedMapping(mapping)
        setSelectedAssessorId(mapping.assessorId)
        setSelectedVendorId(mapping.vendorId)
        setSelectedAssessmentIdForMapping(mapping.parentAssessmentId)
        // Ensure date is formatted for input type="datetime-local" if needed, or just date
        // mapping.dueDate is string ISO
        const dueDate = (mapping as any).dueDate ? new Date((mapping as any).dueDate).toISOString().split('T')[0] : ""
        setMappingDueDate(dueDate)
        setMappingAmount((mapping as any).amount?.toString() || "")
        // Reset popup states (will be fetched when dropdown opens)
        setPopupAssessors([])
        setPopupAssessorsPage(1)
        setPopupAssessorSearchQuery("")
        setPopupVendors([])
        setPopupVendorsPage(1)
        setPopupVendorSearchQuery("")
        setPopupAssessmentsForMapping([])
        setPopupAssessmentsPage(1)
        setPopupAssessmentSearchQuery("")
        setIsEditMappingDialogOpen(true)
    }

    // Handle update mapping
    const handleUpdateMapping = async () => {
        if (!selectedMapping) return

        if (!selectedAssessorId || !selectedVendorId || !selectedAssessmentIdForMapping) {
            toast.error("Please fill in all required fields")
            return
        }

        try {
            setIsUpdatingMapping(true)
            await updateMapping(selectedMapping.id, {
                assessorId: selectedAssessorId,
                vendorId: selectedVendorId,
                assessmentId: selectedAssessmentIdForMapping,
                dueDate: mappingDueDate,
                amount: parseFloat(mappingAmount || "0"),
            })
            toast.success("Mapping updated successfully")

            setIsEditMappingDialogOpen(false)
            resetMappingDialog()
            setSelectedMapping(null)

            await fetchMappingsData()
        } catch (error) {
            console.error("Error updating mapping:", error)
            toast.error("Failed to update mapping")
        } finally {
            setIsUpdatingMapping(false)
        }
    }

    // Get status variant
    const getStatusVariant = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return "success"
            case "IN_PROGRESS":
                return "secondary"
            case "PENDING":
                return "secondary"
            default:
                return "secondary"
        }
    }

    // Get status display
    const getStatusDisplay = (status: string) => {
        switch (status) {
            case "SUBMITTED":
                return "Submitted"
            case "IN_PROGRESS":
                return "In-progress"
            case "PENDING":
                return "Assigned"
            default:
                return status
        }
    }

    // Column header component (sorting removed)
    const SortableHeader = ({ column, children }: { column: string; children: React.ReactNode }) => (
        <TableHead>{children}</TableHead>
    )

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Assessments</h1>
            </div>

            {/* Tabs */}
            <div className="inline-flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
                <Button
                    variant="ghost"
                    className={activeTab === "mappings"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => {
                        setActiveTab("mappings")
                        setSearchQuery(""); setDebouncedSearchQuery("")
                    }}
                >
                    Mappings
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "assessments"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => {
                        setActiveTab("assessments")
                        setSearchQuery(""); setDebouncedSearchQuery("")
                    }}
                >
                    Assessments
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "questions"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => {
                        setActiveTab("questions")
                        setSearchQuery(""); setDebouncedSearchQuery("")
                    }}
                >
                    Questions
                </Button>
                <Button
                    variant="ghost"
                    className={activeTab === "categories"
                        ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground text-white rounded-md"
                        : "text-slate-600 dark:text-slate-400 hover:bg-transparent hover:text-slate-900 dark:hover:text-white"}
                    onClick={() => {
                        setActiveTab("categories")
                        setSearchQuery(""); setDebouncedSearchQuery("")
                    }}
                >
                    Categories
                </Button>
            </div>

            {/* Mappings Tab */}
            {activeTab === "mappings" && (
                <>
                    {/* Search Filters and Create Button */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between gap-4">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search by assessor, vendor, or assessment..."
                                    value={searchQuery}
                                    onChange={onSearchChange}
                                    className="pl-9"
                                />
                            </div>
                            <Button className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" onClick={() => setIsCreateMappingDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Mapping
                            </Button>
                        </div>

                        {/* Filter Dropdowns */}
                        <div className="flex items-center gap-4">
                            <MultiSelectFilter
                                options={assessors.map((assessor) => ({ value: assessor.id, label: assessor.name }))}
                                selectedValues={mappingAssessorFilter}
                                onSelectionChange={setMappingAssessorFilter}
                                placeholder="Filter by Assessor"
                                allLabel="All Assessors"
                                triggerClassName="w-48"
                            />

                            <MultiSelectFilter
                                options={vendors.map((vendor) => ({ value: vendor.id, label: vendor.name }))}
                                selectedValues={mappingVendorFilter}
                                onSelectionChange={setMappingVendorFilter}
                                placeholder="Filter by Vendor"
                                allLabel="All Vendors"
                                triggerClassName="w-48"
                            />

                            <MultiSelectFilter
                                options={assessments.map((assessment) => ({ value: assessment.id, label: assessment.name }))}
                                selectedValues={mappingAssessmentFilter}
                                onSelectionChange={setMappingAssessmentFilter}
                                placeholder="Filter by Assessment"
                                allLabel="All Assessments"
                                triggerClassName="w-48"
                            />

                            <MultiSelectFilter
                                options={[
                                    { value: "PENDING", label: "Assigned" },
                                    { value: "IN_PROGRESS", label: "In Progress" },
                                    { value: "SUBMITTED", label: "Submitted" },
                                ]}
                                selectedValues={mappingStatusFilter}
                                onSelectionChange={setMappingStatusFilter}
                                placeholder="Filter by Status"
                                allLabel="All Statuses"
                                triggerClassName="w-48"
                            />
                        </div>
                    </div>

                    {/* Mappings Table */}
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader column="assessor">Assessor</SortableHeader>
                                    <SortableHeader column="vendor">Vendor</SortableHeader>
                                    <SortableHeader column="assessment">Assessment</SortableHeader>
                                    <SortableHeader column="status">Status</SortableHeader>
                                    <SortableHeader column="amount">Amount</SortableHeader>
                                    <SortableHeader column="createdAt">Created At</SortableHeader>
                                    <SortableHeader column="dueDate">Due Date</SortableHeader>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingMappings ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                        </TableCell>
                                    </TableRow>
                                ) : filteredMappings.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center">
                                            No mappings found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredMappings.map((mapping) => (
                                        <TableRow key={mapping.id}>
                                            <TableCell className="font-medium">{mapping.assessor.name}</TableCell>
                                            <TableCell>{mapping.vendor.name}</TableCell>
                                            <TableCell>{mapping.parentAssessment.title}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getStatusVariant(mapping.status)}
                                                    className={
                                                        mapping.status === "SUBMITTED"
                                                            ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                            : mapping.status === "IN_PROGRESS"
                                                                ? "bg-blue-100 text-blue-800 hover:bg-blue-100"
                                                                : ""
                                                    }
                                                >
                                                    {getStatusDisplay(mapping.status)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {(mapping as any).amount ? `$${parseFloat((mapping as any).amount).toFixed(2)}` : "-"}
                                            </TableCell>
                                            <TableCell>
                                                {new Date(mapping.createdAt).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "2-digit",
                                                })}
                                            </TableCell>
                                            <TableCell>
                                                {(mapping as any).dueDate ? new Date((mapping as any).dueDate).toLocaleDateString("en-GB", {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "2-digit",
                                                }) : "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDeleteMapping(mapping)}
                                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenEditMapping(mapping)}
                                                    disabled={mapping.status === "SUBMITTED"}
                                                    className="h-8 w-8"
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mappings Pagination */}
                    <Pagination
                        currentPage={mappingsPage}
                        totalPages={mappingsTotalPages}
                        hasNextPage={mappingsHasNextPage}
                        hasPrevPage={mappingsHasPrevPage}
                        onPageChange={handleMappingsPageChange}
                        isLoading={isLoadingMappings}
                    />
                </>
            )}

            {/* Assessments Tab */}
            {activeTab === "assessments" && (
                <>
                    {/* Search and Create Button */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search assessments..."
                                value={searchQuery}
                                onChange={onSearchChange}
                                className="pl-9"
                            />
                        </div>
                        <Button className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" onClick={handleOpenCreateAssessment}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Assessment
                        </Button>
                    </div>

                    {/* Assessments Table */}
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader column="name">Assessment Name</SortableHeader>
                                    <SortableHeader column="questions">Questions</SortableHeader>
                                    <SortableHeader column="created">Created</SortableHeader>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingAssessments ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            Loading assessments...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredAssessments.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-24 text-center">
                                            No assessments found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredAssessments.map((assessment) => (
                                        <TableRow key={assessment.id}>
                                            <TableCell className="font-medium">{assessment.name}</TableCell>
                                            <TableCell>{assessment.questions} questions</TableCell>
                                            <TableCell>{assessment.created}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenViewAssessment(assessment)}
                                                        disabled={loadingAssessmentId === assessment.id}
                                                    >
                                                        {loadingAssessmentId === assessment.id && loadingAction === 'view' ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Eye className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenEditAssessment(assessment)}
                                                        disabled={loadingAssessmentId === assessment.id}
                                                    >
                                                        {loadingAssessmentId === assessment.id && loadingAction === 'edit' ? (
                                                            <Loader2 className="h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <Pencil className="h-4 w-4" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleOpenDeleteAssessment(assessment)}
                                                        disabled={loadingAssessmentId === assessment.id}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Assessments Pagination */}
                    <Pagination
                        currentPage={assessmentsPage}
                        totalPages={assessmentsTotalPages}
                        hasNextPage={assessmentsHasNextPage}
                        hasPrevPage={assessmentsHasPrevPage}
                        onPageChange={handleAssessmentsPageChange}
                        isLoading={isLoadingAssessments}
                    />
                </>
            )}

            {/* Questions Tab */}
            {activeTab === "questions" && (
                <>
                    {/* Search, Filters, and Action Button */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1 max-w-md">
                                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    placeholder="Search questions..."
                                    value={searchQuery}
                                    onChange={onSearchChange}
                                    className="pl-9"
                                />
                            </div>

                            <MultiSelectFilter
                                options={[
                                    { value: "yes_no", label: "Yes/No" },
                                    { value: "single_select", label: "Single Select" },
                                    { value: "multi_select", label: "Multi Select" },
                                    { value: "free_text", label: "Free Text" },
                                    { value: "file_upload", label: "File Upload" },
                                    { value: "number", label: "Number" },
                                ]}
                                selectedValues={typeFilter}
                                onSelectionChange={setTypeFilter}
                                placeholder="Type"
                                allLabel="All Types"
                                triggerClassName="w-[150px]"
                            />

                            <MultiSelectFilter
                                options={[
                                    { value: "low", label: "Low" },
                                    { value: "medium", label: "Medium" },
                                    { value: "high", label: "High" },
                                ]}
                                selectedValues={riskRatingFilter}
                                onSelectionChange={setRiskRatingFilter}
                                placeholder="Risk Rating"
                                allLabel="All Risk Ratings"
                                triggerClassName="w-[150px]"
                            />

                            <MultiSelectFilter
                                options={categories.map((category) => ({ value: category.id, label: category.name }))}
                                selectedValues={categoryFilter}
                                onSelectionChange={setCategoryFilter}
                                placeholder="Category"
                                allLabel="All Categories"
                                triggerClassName="w-[150px]"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {bulkDeleteIds.size > 0 && (
                                <Button
                                    variant="destructive"
                                    onClick={() => setIsBulkDeleteDialogOpen(true)}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete ({bulkDeleteIds.size})
                                </Button>
                            )}
                            <Button variant="outline" onClick={() => setIsBulkUploadQuestionsDialogOpen(true)}>
                                <Upload className="mr-2 h-4 w-4" />
                                Bulk Upload
                            </Button>
                            <Button className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" onClick={handleOpenAddQuestion}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Question
                            </Button>
                        </div>
                    </div>

                    {/* Questions Table */}
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-12">
                                        <Checkbox
                                            checked={filteredQuestions.length > 0 && bulkDeleteIds.size === filteredQuestions.length}
                                            onCheckedChange={toggleAllQuestions}
                                        />
                                    </TableHead>
                                    <SortableHeader column="question">Question</SortableHeader>
                                    <SortableHeader column="type">Type</SortableHeader>
                                    <SortableHeader column="riskRating">Risk Rating</SortableHeader>
                                    <SortableHeader column="category">Category</SortableHeader>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingQuestions ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            Loading questions...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredQuestions.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="h-24 text-center">
                                            No questions found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuestions.map((question) => (
                                        <TableRow key={question.id}>
                                            <TableCell>
                                                <Checkbox
                                                    checked={bulkDeleteIds.has(question.id)}
                                                    onCheckedChange={() => toggleQuestionSelection(question.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="max-w-md">{question.question}</TableCell>
                                            <TableCell>{getTypeDisplay(question.type)}</TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={getRiskRatingVariant(question.riskRating)}
                                                    className={
                                                        question.riskRating === "medium"
                                                            ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                                            : question.riskRating === "low"
                                                                ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                                : ""
                                                    }
                                                >
                                                    {getRiskRatingDisplay(question.riskRating)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{question.category}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenEditQuestion(question)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleOpenDeleteQuestion(question)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Questions Pagination */}
                    <Pagination
                        currentPage={questionsPage}
                        totalPages={questionsTotalPages}
                        hasNextPage={questionsHasNextPage}
                        hasPrevPage={questionsHasPrevPage}
                        onPageChange={handleQuestionsPageChange}
                        isLoading={isLoadingQuestions}
                    />
                </>
            )}

            {/* Categories Tab */}
            {activeTab === "categories" && (
                <>
                    {/* Search and Add Category Button */}
                    <div className="flex items-center justify-between gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                placeholder="Search categories..."
                                value={searchQuery}
                                onChange={onSearchChange}
                                className="pl-9"
                            />
                        </div>
                        <Button
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                            onClick={() => setIsAddCategoryDialogOpen(true)}
                        >
                            <Plus className="mr-2 h-4 w-4" />
                            Add Category
                        </Button>
                    </div>

                    {/* Categories Table */}
                    <div className="rounded-lg border bg-card">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <SortableHeader column="name">Category Name</SortableHeader>
                                    <TableHead>Questions Count</TableHead>
                                    <TableHead>Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoadingCategories ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            Loading categories...
                                        </TableCell>
                                    </TableRow>
                                ) : filteredCategories.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="h-24 text-center">
                                            No categories found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredCategories.map((category) => (
                                        <TableRow key={category.id}>
                                            <TableCell className="font-medium">{category.name}</TableCell>
                                            <TableCell>{category.questionsCount ?? 0}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8"
                                                        onClick={() => handleOpenEditCategory(category)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive"
                                                        onClick={() => handleOpenDeleteCategory(category)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Categories Pagination */}
                    <Pagination
                        currentPage={categoriesPage}
                        totalPages={categoriesTotalPages}
                        hasNextPage={categoriesHasNextPage}
                        hasPrevPage={categoriesHasPrevPage}
                        onPageChange={handleCategoriesPageChange}
                        isLoading={isLoadingCategories}
                    />
                </>
            )}

            {/* Add Category Dialog */}
            <Dialog open={isAddCategoryDialogOpen} onOpenChange={setIsAddCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="category-name">
                                Category Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="category-name"
                                placeholder="Enter category name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => setIsAddCategoryDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCategory}
                            disabled={!categoryName.trim() || isAddingCategory}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isAddingCategory ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={isEditCategoryDialogOpen} onOpenChange={setIsEditCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Category</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-category-name">
                                Category Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-category-name"
                                placeholder="Enter category name"
                                value={categoryName}
                                onChange={(e) => setCategoryName(e.target.value)}
                                className="focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => {
                                setIsEditCategoryDialogOpen(false)
                                setCategoryName("")
                                setSelectedCategory(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditCategory}
                            disabled={!categoryName.trim() || isEditingCategory}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isEditingCategory ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Category"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Category Confirmation Dialog */}
            <Dialog open={isDeleteCategoryDialogOpen} onOpenChange={setIsDeleteCategoryDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Category</DialogTitle>
                        <DialogDescription>
                            {selectedCategory?.questionsCount && selectedCategory.questionsCount > 0 ? (
                                <span className="text-destructive">
                                    Cannot delete category because it has active questions attached to it.
                                </span>
                            ) : (
                                "Are you sure you want to delete this category? This action cannot be undone."
                            )}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteCategoryDialogOpen(false)
                                setSelectedCategory(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteCategory}
                            disabled={isDeletingCategory || !!(selectedCategory?.questionsCount && selectedCategory.questionsCount > 0)}
                        >
                            {isDeletingCategory ? (
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

            {/* Add Question Dialog */}
            <Dialog open={isAddQuestionDialogOpen} onOpenChange={setIsAddQuestionDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create New Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-y-auto flex-1 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="question-text">
                                Question <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="question-text"
                                placeholder="Enter question text"
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                rows={4}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="question-type">
                                    Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={questionType} onValueChange={setQuestionType}>
                                    <SelectTrigger id="question-type" className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes_no">Yes/No</SelectItem>
                                        <SelectItem value="single_select">Single Select</SelectItem>
                                        <SelectItem value="multi_select">Multi Select</SelectItem>
                                        <SelectItem value="free_text">Free Text</SelectItem>
                                        <SelectItem value="file_upload">File Upload</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="question-risk">
                                    Risk Rating <span className="text-destructive">*</span>
                                </Label>
                                <Select value={questionRiskRating} onValueChange={setQuestionRiskRating}>
                                    <SelectTrigger id="question-risk" className="w-full">
                                        <SelectValue placeholder="Select risk" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="question-category">
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <InfiniteScrollSelect
                                value={questionCategory}
                                onValueChange={setQuestionCategory}
                                options={popupCategories.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="Select category"
                                searchPlaceholder="Search categories..."
                                emptyText="No categories found."
                                isLoading={isLoadingPopupCategories}
                                hasMore={popupCategoriesHasNextPage}
                                onLoadMore={handleLoadMorePopupCategories}
                                onSearch={handlePopupCategorySearch}
                                onOpen={handlePopupCategoryDropdownOpen}
                            />
                        </div>

                        {/* Options section - only show for single_select and multi_select */}
                        {questionTypeNeedsOptions(questionType) && (
                            <div className="space-y-2">
                                <Label>
                                    Options <span className="text-destructive">*</span>
                                    <span className="text-xs text-muted-foreground ml-2">(Minimum 2 options)</span>
                                </Label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {questionOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(e) => handleUpdateOption(index, e.target.value)}
                                                className="flex-1"
                                            />
                                            {questionOptions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddOption}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="question-rtv" className="flex items-center gap-1">
                                RTV (Risk, Threat and Vulnerability)
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enter risk, threat, and vulnerability information</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Textarea
                                id="question-rtv"
                                placeholder="Enter risk, threat, and vulnerability information"
                                value={questionRtv}
                                onChange={(e) => setQuestionRtv(e.target.value)}
                                rows={2}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="question-recommendation" className="flex items-center gap-1">
                                Recommendation
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enter recommendation for this question</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Textarea
                                id="question-recommendation"
                                placeholder="Enter recommendation"
                                value={questionRecommendation}
                                onChange={(e) => setQuestionRecommendation(e.target.value)}
                                rows={2}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => setIsAddQuestionDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddQuestion}
                            disabled={!questionText.trim() || !questionType || !questionRiskRating || !questionCategory || isAddingQuestion}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isAddingQuestion ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Adding...
                                </>
                            ) : (
                                "Add Question"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Question Dialog */}
            <Dialog open={isEditQuestionDialogOpen} onOpenChange={setIsEditQuestionDialogOpen}>
                <DialogContent className="max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Question</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 overflow-y-auto flex-1 px-1">
                        <div className="space-y-2">
                            <Label htmlFor="edit-question-text">
                                Question <span className="text-destructive">*</span>
                            </Label>
                            <Textarea
                                id="edit-question-text"
                                placeholder="Enter question text"
                                value={questionText}
                                onChange={(e) => setQuestionText(e.target.value)}
                                rows={4}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="edit-question-type">
                                    Type <span className="text-destructive">*</span>
                                </Label>
                                <Select value={questionType} onValueChange={setQuestionType}>
                                    <SelectTrigger id="edit-question-type" className="w-full">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="yes_no">Yes/No</SelectItem>
                                        <SelectItem value="single_select">Single Select</SelectItem>
                                        <SelectItem value="multi_select">Multi Select</SelectItem>
                                        <SelectItem value="free_text">Free Text</SelectItem>
                                        <SelectItem value="file_upload">File Upload</SelectItem>
                                        <SelectItem value="number">Number</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="edit-question-risk">
                                    Risk Rating <span className="text-destructive">*</span>
                                </Label>
                                <Select value={questionRiskRating} onValueChange={setQuestionRiskRating}>
                                    <SelectTrigger id="edit-question-risk" className="w-full">
                                        <SelectValue placeholder="Select risk" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-question-category">
                                Category <span className="text-destructive">*</span>
                            </Label>
                            <InfiniteScrollSelect
                                value={questionCategory}
                                onValueChange={setQuestionCategory}
                                options={popupCategories.map(c => ({ value: c.id, label: c.name }))}
                                placeholder="Select category"
                                searchPlaceholder="Search categories..."
                                emptyText="No categories found."
                                isLoading={isLoadingPopupCategories}
                                hasMore={popupCategoriesHasNextPage}
                                onLoadMore={handleLoadMorePopupCategories}
                                onSearch={handlePopupCategorySearch}
                                onOpen={handlePopupCategoryDropdownOpen}
                                selectedLabel={selectedQuestion?.category}
                            />
                        </div>

                        {/* Options section - only show for single_select and multi_select */}
                        {questionTypeNeedsOptions(questionType) && (
                            <div className="space-y-2">
                                <Label>
                                    Options <span className="text-destructive">*</span>
                                    <span className="text-xs text-muted-foreground ml-2">(Minimum 2 options)</span>
                                </Label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {questionOptions.map((option, index) => (
                                        <div key={index} className="flex gap-2">
                                            <Input
                                                placeholder={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(e) => handleUpdateOption(index, e.target.value)}
                                                className="flex-1"
                                            />
                                            {questionOptions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveOption(index)}
                                                    className="text-destructive"
                                                >
                                                    <X className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddOption}
                                    className="w-full"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add Option
                                </Button>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="edit-question-rtv" className="flex items-center gap-1">
                                RTV (Risk, Threat and Vulnerability)
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enter risk, threat, and vulnerability information</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Textarea
                                id="edit-question-rtv"
                                placeholder="Enter risk, threat, and vulnerability information"
                                value={questionRtv}
                                onChange={(e) => setQuestionRtv(e.target.value)}
                                rows={2}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-question-recommendation" className="flex items-center gap-1">
                                Recommendation
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>Enter recommendation for this question</p>
                                    </TooltipContent>
                                </Tooltip>
                            </Label>
                            <Textarea
                                id="edit-question-recommendation"
                                placeholder="Enter recommendation"
                                value={questionRecommendation}
                                onChange={(e) => setQuestionRecommendation(e.target.value)}
                                rows={2}
                                className="resize-none focus-visible:ring-orange-500"
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => {
                                setIsEditQuestionDialogOpen(false)
                                setSelectedQuestion(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditQuestion}
                            disabled={!questionText.trim() || !questionType || !questionRiskRating || !questionCategory || isEditingQuestion}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isEditingQuestion ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Question"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Question Confirmation Dialog */}
            <Dialog open={isDeleteQuestionDialogOpen} onOpenChange={setIsDeleteQuestionDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Question</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this question? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteQuestionDialogOpen(false)
                                setSelectedQuestion(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteQuestion} disabled={isDeletingQuestion}>
                            {isDeletingQuestion ? (
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

            {/* Bulk Delete Questions Confirmation Dialog */}
            <Dialog open={isBulkDeleteDialogOpen} onOpenChange={setIsBulkDeleteDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Questions</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete {bulkDeleteIds.size} question(s)? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkDeleteDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleBulkDeleteQuestions} disabled={isBulkDeleting}>
                            {isBulkDeleting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                `Delete ${bulkDeleteIds.size} Question(s)`
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Upload Questions Dialog */}
            <Dialog open={isBulkUploadQuestionsDialogOpen} onOpenChange={setIsBulkUploadQuestionsDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bulk Upload Questions</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file containing questions. Download the template to see the required format.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>CSV File</Label>
                            <Input
                                type="file"
                                accept=".csv"
                                onChange={handleBulkUploadQuestions}
                                disabled={isBulkUploadingQuestions}
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            <button
                                type="button"
                                onClick={downloadQuestionsTemplate}
                                className="text-primary hover:underline"
                            >
                                Download CSV Template
                            </button>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                            <p><strong>Required columns:</strong> Question Text, Question Type, Risk Rating, Category Name</p>
                            <p><strong>Optional columns:</strong> RTV, Recommendation, Options</p>
                            <p><strong>Question Types:</strong> TEXT, BOOLEAN, SINGLE_CHOICE, MULTIPLE_CHOICE, FILE_UPLOAD, NUMBER</p>
                            <p><strong>Risk Ratings:</strong> LOW, MEDIUM, HIGH</p>
                            <p><strong>Options format:</strong> Option1|Option2|Option3 (pipe separated)</p>
                        </div>
                        {isBulkUploadingQuestions && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">
                                        Uploading questions...
                                        {bulkUploadQuestionsProgress.total > 0 && (
                                            <span className="ml-1">
                                                ({bulkUploadQuestionsProgress.current}/{bulkUploadQuestionsProgress.total})
                                            </span>
                                        )}
                                    </span>
                                </div>
                                {bulkUploadQuestionsProgress.total > 0 && (
                                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary transition-all duration-300"
                                            style={{
                                                width: `${(bulkUploadQuestionsProgress.current / bulkUploadQuestionsProgress.total) * 100}%`
                                            }}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkUploadQuestionsDialogOpen(false)}
                            disabled={isBulkUploadingQuestions}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Create Assessment Dialog */}
            <Dialog open={isCreateAssessmentDialogOpen} onOpenChange={setIsCreateAssessmentDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Create New Assessment</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        {/* Assessment Name */}
                        <div className="space-y-2">
                            <Label htmlFor="assessment-name">
                                Assessment Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="assessment-name"
                                placeholder="Enter assessment name"
                                value={assessmentName}
                                onChange={(e) => setAssessmentName(e.target.value)}
                                className="focus-visible:ring-orange-500"
                            />
                        </div>

                        {/* Select Questions Section */}
                        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                            <Label>
                                Select Questions <span className="text-destructive">*</span> ({selectedQuestionIds.length} selected)
                            </Label>

                            {/* Search and Filter */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search questions..."
                                        value={popupSearchQuery}
                                        onChange={(e) => handlePopupSearchChange(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={popupCategoryFilter} onValueChange={handlePopupCategoryFilterChange}>
                                    <SelectTrigger className="w-[200px] border-sidebar-accent-foreground text-sidebar-accent-foreground focus:ring-sidebar-accent-foreground">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Questions List */}
                            <div className="flex-1 overflow-y-auto border rounded-lg">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead className="w-32">Category</TableHead>
                                            <TableHead className="w-24">Risk</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingPopupQuestions ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : popupQuestions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No questions found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            popupQuestions.map((question) => (
                                                <TableRow key={question.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedQuestionIds.includes(question.id)}
                                                            onCheckedChange={() => handleToggleQuestion(question.id)}
                                                            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="max-w-md">{question.question}</TableCell>
                                                    <TableCell>{question.category}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={getRiskRatingVariant(question.riskRating)}
                                                            className={
                                                                question.riskRating === "medium"
                                                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                                                    : question.riskRating === "low"
                                                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                                        : "bg-red-100 text-red-800 hover:bg-red-100"
                                                            }
                                                        >
                                                            {getRiskRatingDisplay(question.riskRating)}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={popupQuestionsPage}
                                totalPages={popupQuestionsTotalPages}
                                hasNextPage={popupQuestionsHasNextPage}
                                hasPrevPage={popupQuestionsHasPrevPage}
                                onPageChange={handlePopupQuestionsPageChange}
                                isLoading={isLoadingPopupQuestions}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => setIsCreateAssessmentDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateAssessment}
                            disabled={!assessmentName.trim() || selectedQuestionIds.length === 0 || isCreatingAssessment}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isCreatingAssessment ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Assessment"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* View Assessment Dialog */}
            <Dialog open={isViewAssessmentDialogOpen} onOpenChange={setIsViewAssessmentDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[80vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="text-xl">{selectedAssessment?.name}</DialogTitle>
                        <div className="text-sm text-muted-foreground">
                            Created: {selectedAssessment?.created}
                        </div>
                    </DialogHeader>
                    {selectedAssessment && (
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                            <Table>
                                <TableHeader className="sticky top-0 bg-background z-10">
                                    <TableRow>
                                        <TableHead>Question</TableHead>
                                        <TableHead className="w-32">Category</TableHead>
                                        <TableHead className="w-32">Type</TableHead>
                                        <TableHead className="w-24">Risk</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {assessmentDetailsLoading ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                Loading questions...
                                            </TableCell>
                                        </TableRow>
                                    ) : viewAssessmentQuestions.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="h-24 text-center">
                                                No questions found.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        viewAssessmentQuestions.map((question) => (
                                            <TableRow key={question.id}>
                                                <TableCell>{question.question}</TableCell>
                                                <TableCell>{question.category}</TableCell>
                                                <TableCell>{getTypeDisplay(question.type)}</TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={getRiskRatingVariant(question.riskRating)}
                                                        className={
                                                            question.riskRating === "medium"
                                                                ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                                                : question.riskRating === "low"
                                                                    ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                                    : "bg-red-100 text-red-800 hover:bg-red-100"
                                                        }
                                                    >
                                                        {getRiskRatingDisplay(question.riskRating)}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Edit Assessment Dialog */}
            <Dialog open={isEditAssessmentDialogOpen} onOpenChange={setIsEditAssessmentDialogOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader>
                        <DialogTitle>Edit Assessment</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
                        {/* Assessment Name */}
                        <div className="space-y-2">
                            <Label htmlFor="edit-assessment-name">
                                Assessment Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-assessment-name"
                                placeholder="Enter assessment name"
                                value={assessmentName}
                                onChange={(e) => setAssessmentName(e.target.value)}
                                className="focus-visible:ring-orange-500"
                            />
                        </div>

                        {/* Select Questions Section */}
                        <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                            <Label>
                                Select Questions <span className="text-destructive">*</span> ({selectedQuestionIds.length} selected)
                            </Label>

                            {/* Search and Filter */}
                            <div className="flex gap-3">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        placeholder="Search questions..."
                                        value={popupSearchQuery}
                                        onChange={(e) => handlePopupSearchChange(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select value={popupCategoryFilter} onValueChange={handlePopupCategoryFilterChange}>
                                    <SelectTrigger className="w-[200px] border-sidebar-accent-foreground text-sidebar-accent-foreground focus:ring-sidebar-accent-foreground">
                                        <SelectValue placeholder="All Categories" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Categories</SelectItem>
                                        {categories.map((category) => (
                                            <SelectItem key={category.id} value={category.id}>
                                                {category.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Questions List */}
                            <div className="flex-1 overflow-y-auto border rounded-lg">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-background z-10">
                                        <TableRow>
                                            <TableHead className="w-12"></TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead className="w-32">Category</TableHead>
                                            <TableHead className="w-24">Risk</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoadingPopupQuestions ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                                                </TableCell>
                                            </TableRow>
                                        ) : popupQuestions.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={4} className="h-24 text-center">
                                                    No questions found.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            popupQuestions.map((question) => (
                                                <TableRow key={question.id}>
                                                    <TableCell>
                                                        <Checkbox
                                                            checked={selectedQuestionIds.includes(question.id)}
                                                            onCheckedChange={() => handleToggleQuestion(question.id)}
                                                            className="data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                                                        />
                                                    </TableCell>
                                                    <TableCell className="max-w-md">{question.question}</TableCell>
                                                    <TableCell>{question.category}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={getRiskRatingVariant(question.riskRating)}
                                                            className={
                                                                question.riskRating === "medium"
                                                                    ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100"
                                                                    : question.riskRating === "low"
                                                                        ? "bg-green-100 text-green-800 hover:bg-green-100"
                                                                        : "bg-red-100 text-red-800 hover:bg-red-100"
                                                            }
                                                        >
                                                            {getRiskRatingDisplay(question.riskRating)}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={popupQuestionsPage}
                                totalPages={popupQuestionsTotalPages}
                                hasNextPage={popupQuestionsHasNextPage}
                                hasPrevPage={popupQuestionsHasPrevPage}
                                onPageChange={handlePopupQuestionsPageChange}
                                isLoading={isLoadingPopupQuestions}
                            />
                        </div>
                    </div>

                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                            onClick={() => setIsEditAssessmentDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditAssessment}
                            disabled={!assessmentName.trim() || selectedQuestionIds.length === 0 || isUpdatingAssessment}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isUpdatingAssessment ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Update Assessment"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Assessment Confirmation Dialog */}
            <Dialog open={isDeleteAssessmentDialogOpen} onOpenChange={setIsDeleteAssessmentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Assessment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this assessment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteAssessmentDialogOpen(false)
                                setSelectedAssessment(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteAssessment} disabled={isDeletingAssessment}>
                            {isDeletingAssessment ? (
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

            {/* Delete Mapping Confirmation Dialog */}
            <Dialog open={isDeleteMappingDialogOpen} onOpenChange={setIsDeleteMappingDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Mapping</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this mapping? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteMappingDialogOpen(false)
                                setSelectedMapping(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={handleDeleteMapping} disabled={isDeletingMapping}>
                            {isDeletingMapping ? (
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

            {/* Create Mapping Dialog */}
            <Dialog open={isCreateMappingDialogOpen} onOpenChange={(open) => {
                setIsCreateMappingDialogOpen(open)
                if (!open) resetMappingDialog()
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Create New Mapping</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-6 py-4">
                        {/* Step Indicators */}
                        <div className="flex items-center">
                            <div className="flex items-center gap-2">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${mappingCurrentStep === 1 ? 'bg-sidebar-accent-foreground text-white' : 'border-2 border-gray-300 text-gray-400'}`}>
                                    1
                                </div>
                                <span className={`text-sm ${mappingCurrentStep === 1 ? 'text-sidebar-accent-foreground font-medium' : 'text-gray-400'}`}>
                                    Assessor & Vendor
                                </span>
                            </div>
                            <div className="flex-1 mx-4 border-t-2 border-sidebar-accent-foreground" />
                            <div className="flex items-center gap-2">
                                <div className={`flex h-6 w-6 items-center justify-center rounded-full text-sm font-medium ${mappingCurrentStep === 2 ? 'bg-sidebar-accent-foreground text-white' : 'border-2 border-gray-300 text-gray-400'}`}>
                                    2
                                </div>
                                <span className={`text-sm ${mappingCurrentStep === 2 ? 'text-sidebar-accent-foreground font-medium' : 'text-gray-400'}`}>
                                    Assessment
                                </span>
                            </div>
                        </div>

                        {/* Step 1: Assessor & Vendor */}
                        {mappingCurrentStep === 1 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mapping-assessor">
                                        Assessor <span className="text-destructive">*</span>
                                    </Label>
                                    <InfiniteScrollSelect
                                        value={selectedAssessorId}
                                        onValueChange={setSelectedAssessorId}
                                        options={popupAssessors.map(a => ({ value: a.id, label: a.name }))}
                                        placeholder="Select an assessor"
                                        searchPlaceholder="Search assessors..."
                                        emptyText="No assessors found."
                                        isLoading={isLoadingPopupAssessors}
                                        hasMore={popupAssessorsHasNextPage}
                                        onLoadMore={handleLoadMorePopupAssessors}
                                        onSearch={handlePopupAssessorSearch}
                                        onOpen={handlePopupAssessorDropdownOpen}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mapping-vendor">
                                        Vendor <span className="text-destructive">*</span>
                                    </Label>
                                    <InfiniteScrollSelect
                                        value={selectedVendorId}
                                        onValueChange={setSelectedVendorId}
                                        options={popupVendors.map(v => ({ value: v.id, label: v.name }))}
                                        placeholder="Select a vendor"
                                        searchPlaceholder="Search vendors..."
                                        emptyText="No vendors found."
                                        isLoading={isLoadingPopupVendors}
                                        hasMore={popupVendorsHasNextPage}
                                        onLoadMore={handleLoadMorePopupVendors}
                                        onSearch={handlePopupVendorSearch}
                                        onOpen={handlePopupVendorDropdownOpen}
                                    />
                                </div>
                            </div>
                        )}

                        {/* Step 2: Assessment */}
                        {mappingCurrentStep === 2 && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="mapping-assessment">
                                        Assessment <span className="text-destructive">*</span>
                                    </Label>
                                    <InfiniteScrollSelect
                                        value={selectedAssessmentIdForMapping}
                                        onValueChange={setSelectedAssessmentIdForMapping}
                                        options={popupAssessmentsForMapping.map(a => ({ value: a.id, label: a.name }))}
                                        placeholder="Select an assessment"
                                        searchPlaceholder="Search assessments..."
                                        emptyText="No assessments found."
                                        isLoading={isLoadingPopupAssessments}
                                        hasMore={popupAssessmentsHasNextPage}
                                        onLoadMore={handleLoadMorePopupAssessments}
                                        onSearch={handlePopupAssessmentSearch}
                                        onOpen={handlePopupAssessmentDropdownOpen}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mapping-due-date">
                                        Due Date <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="mapping-due-date"
                                        type="date"
                                        value={mappingDueDate}
                                        min={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setMappingDueDate(e.target.value)}
                                        className="focus-visible:ring-orange-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="mapping-amount">
                                        Amount <span className="text-destructive">*</span>
                                    </Label>
                                    <Input
                                        id="mapping-amount"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Enter amount"
                                        value={mappingAmount}
                                        onChange={(e) => setMappingAmount(e.target.value)}
                                        className="focus-visible:ring-orange-500"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-3">
                        {mappingCurrentStep === 1 ? (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                    onClick={() => {
                                        setIsCreateMappingDialogOpen(false)
                                        resetMappingDialog()
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                                    onClick={handleMappingNext}
                                >
                                    Next
                                </Button>
                            </>
                        ) : (
                            <>
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                                    onClick={handleMappingBack}
                                >
                                    Back
                                </Button>
                                <Button
                                    type="button"
                                    className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                                    onClick={handleCreateMapping}
                                    disabled={isCreatingMapping}
                                >
                                    {isCreatingMapping ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating...
                                        </>
                                    ) : (
                                        "Create mapping"
                                    )}
                                </Button>
                            </>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Mapping Dialog */}
            <Dialog open={isEditMappingDialogOpen} onOpenChange={setIsEditMappingDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Mapping</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-mapping-assessor">
                                Assessor <span className="text-destructive">*</span>
                            </Label>
                            <InfiniteScrollSelect
                                value={selectedAssessorId}
                                onValueChange={setSelectedAssessorId}
                                options={popupAssessors.map(a => ({ value: a.id, label: a.name }))}
                                placeholder="Select Assessor"
                                searchPlaceholder="Search assessors..."
                                emptyText="No assessors found."
                                isLoading={isLoadingPopupAssessors}
                                hasMore={popupAssessorsHasNextPage}
                                onLoadMore={handleLoadMorePopupAssessors}
                                onSearch={handlePopupAssessorSearch}
                                onOpen={handlePopupAssessorDropdownOpen}
                                selectedLabel={selectedMapping?.assessor?.name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-mapping-vendor">
                                Vendor <span className="text-destructive">*</span>
                            </Label>
                            <InfiniteScrollSelect
                                value={selectedVendorId}
                                onValueChange={setSelectedVendorId}
                                options={popupVendors.map(v => ({ value: v.id, label: v.name }))}
                                placeholder="Select Vendor"
                                searchPlaceholder="Search vendors..."
                                emptyText="No vendors found."
                                isLoading={isLoadingPopupVendors}
                                hasMore={popupVendorsHasNextPage}
                                onLoadMore={handleLoadMorePopupVendors}
                                onSearch={handlePopupVendorSearch}
                                onOpen={handlePopupVendorDropdownOpen}
                                selectedLabel={selectedMapping?.vendor?.name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-mapping-assessment">
                                Assessment <span className="text-destructive">*</span>
                            </Label>
                            <InfiniteScrollSelect
                                value={selectedAssessmentIdForMapping}
                                onValueChange={setSelectedAssessmentIdForMapping}
                                options={popupAssessmentsForMapping.map(a => ({ value: a.id, label: a.name }))}
                                placeholder="Select Assessment"
                                searchPlaceholder="Search assessments..."
                                emptyText="No assessments found."
                                isLoading={isLoadingPopupAssessments}
                                hasMore={popupAssessmentsHasNextPage}
                                onLoadMore={handleLoadMorePopupAssessments}
                                onSearch={handlePopupAssessmentSearch}
                                onOpen={handlePopupAssessmentDropdownOpen}
                                selectedLabel={selectedMapping?.parentAssessment?.title}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-mapping-due-date">
                                Due Date <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-mapping-due-date"
                                type="date"
                                value={mappingDueDate}
                                onChange={(e) => setMappingDueDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-mapping-amount">
                                Amount <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-mapping-amount"
                                type="number"
                                step="0.01"
                                placeholder="Amount"
                                value={mappingAmount}
                                onChange={(e) => setMappingAmount(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter className="gap-3">
                        <Button
                            variant="outline"
                            onClick={() => setIsEditMappingDialogOpen(false)}
                            className="text-sidebar-accent-foreground border-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/10 hover:text-sidebar-accent-foreground"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateMapping}
                            disabled={isUpdatingMapping}
                            className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        >
                            {isUpdatingMapping ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Updating...
                                </>
                            ) : "Update Mapping"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
