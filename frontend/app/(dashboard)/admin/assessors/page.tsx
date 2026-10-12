"use client"

import { useState } from "react"
import { Pencil, Plus, Search, Ban, Check, X, ShieldCheck } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useAdminUsers } from "@/hooks/use-admin-users"
import { useEffect } from "react"
import { useDebouncedCallback } from "@tanstack/react-pacer"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import { useUserApproval } from "@/hooks/use-user-approval"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PhoneInput } from "@/components/ui/phone-input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

// Types
type Assessor = {
    id: string
    name: string
    licenseNumber: string
    email: string
    assessorName: string
    phone: string
    createdAt: string
    status: "active" | "inactive"
    isApproved?: "APPROVED" | "REJECTED" | "AWAITING_FOR_APPROVAL"
}

// Validation schema
const createAssessorSchema = z.object({
    // name is derived from assessorName
    name: z.string().optional(),
    licenseNumber: z.string().min(1, "License number is required"),
    email: z.string().email("Invalid email address"),
    assessorName: z.string().min(1, "Assessor name is required"),
    phone: z.string().min(1, "Phone number is required"),
})

const editAssessorSchema = z.object({
    // name is derived from assessorName
    name: z.string().optional(),
    licenseNumber: z.string().min(1, "License number is required"),
    email: z.string().email("Invalid email address"),
    assessorName: z.string().min(1, "Assessor name is required"),
    phone: z.string().min(1, "Phone number is required"),
})

type CreateAssessorFormData = z.infer<typeof createAssessorSchema>
type EditAssessorFormData = z.infer<typeof editAssessorSchema>

export default function AssessorsPage() {

    const [page, setPage] = useState(1)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [debouncedSearch, setDebouncedSearch] = useState("")

    const handleSearch = useDebouncedCallback((value: string) => {
        setDebouncedSearch(value)
        setPage(1)
    }, { wait: 500 })

    const onSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value
        setSearchQuery(value)
        handleSearch(value)
    }

    const { data, isLoading } = useAdminUsers({
        role: "assessor",
        page,
        limit: 10,
        searchQuery: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter,
    })

    const assessors = data?.users || []
    const totalUsers = data?.total || 0
    const totalPages = Math.ceil(totalUsers / 10)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedAssessor, setSelectedAssessor] = useState<any | null>(null)
    const [approvalDialog, setApprovalDialog] = useState<{
        isOpen: boolean
        assessor: any | null
        action: "approve" | "reject" | null
    }>({
        isOpen: false,
        assessor: null,
        action: null,
    })

    const queryClient = useQueryClient()
    const { approveUser, rejectUser } = useUserApproval()

    // Add form
    const addForm = useForm<CreateAssessorFormData>({
        resolver: zodResolver(createAssessorSchema),
        defaultValues: {
            licenseNumber: "",
            email: "",
            assessorName: "",
            phone: "",
        },
    })

    // Edit form
    const editForm = useForm<EditAssessorFormData>({
        resolver: zodResolver(editAssessorSchema),
    })

    const { mutate: createAssessor, isPending: isCreating } = useMutation({
        mutationFn: async (data: CreateAssessorFormData) => {
            const { error } = await authClient.admin.createUser({
                email: data.email,
                password: data.email,
                name: data.assessorName, // Set name to assessorName
                data: {
                    licenseNumber: data.licenseNumber,
                    assessorName: data.assessorName,
                    phoneNumber: data.phone,
                    userType: "assessor",
                    isApproved: "APPROVED",
                },
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "assessor"] })
            toast.success("Assessor added successfully")
            setIsAddDialogOpen(false)
            addForm.reset()
        },
        onError: (error: any) => {
            if (error?.code === "FAILED_TO_CREATE_USER" && error?.details?.code === "P2002") {
                const target = error?.details?.meta?.target;
                if (Array.isArray(target) && target.includes("phoneNumber")) {
                    toast.error("This mobile number is already in use. Please try another one.");
                    return;
                }
            }
            toast.error(error.message || "Failed to create assessor")
        },
    })

    const { mutate: updateAssessor, isPending: isUpdating } = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: EditAssessorFormData }) => {
            const { error } = await authClient.admin.updateUser({
                userId: id,
                data: {
                    licenseNumber: data.licenseNumber,
                    assessorName: data.assessorName,
                    phoneNumber: data.phone,
                    email: data.email,
                },
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "assessor"] })
            toast.success("Assessor updated successfully")
            setIsEditDialogOpen(false)
            setSelectedAssessor(null)
            editForm.reset()
        },
        onError: (error: any) => {
            if (error?.code === "FAILED_TO_UPDATE_USER" && error?.details?.code === "P2002") {
                const target = error?.details?.meta?.target;
                if (Array.isArray(target) && target.includes("phoneNumber")) {
                    toast.error("This mobile number is already in use. Please try another one.");
                    return;
                }
            }
            toast.error(error.message || "Failed to update assessor")
        },
    })


    // Handle add assessor
    const handleAddAssessor = (data: CreateAssessorFormData) => {
        createAssessor(data)
    }

    // Handle edit assessor
    const handleEditAssessor = (data: EditAssessorFormData) => {
        if (!selectedAssessor) return
        updateAssessor({ id: selectedAssessor.id, data })
    }

    // Ban assessor mutation
    const { mutate: banAssessor, isPending: isBanning } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await authClient.admin.banUser({
                userId,
                banReason: "Banned by admin",
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "assessor"] })
            toast.success("Assessor banned successfully")
            setIsBanDialogOpen(false)
            setSelectedAssessor(null)
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to ban assessor")
        },
    })

    // Unban assessor mutation
    const { mutate: unbanAssessor, isPending: isUnbanning } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await authClient.admin.unbanUser({
                userId,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "assessor"] })
            toast.success("Assessor unbanned successfully")
            setSelectedAssessor(null)
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to unban assessor")
        },
    })

    // Handle ban assessor
    const handleBanAssessor = () => {
        if (!selectedAssessor) return
        banAssessor(selectedAssessor.id)
    }

    // Handle unban assessor
    const handleUnbanAssessor = (assessor: any) => {
        unbanAssessor(assessor.id)
    }

    // Open edit dialog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openEditDialog = (assessor: any) => {
        setSelectedAssessor(assessor)
        editForm.reset({
            licenseNumber: assessor.licenseNumber,
            email: assessor.email,
            assessorName: assessor.assessorName,
            phone: assessor.phoneNumber || assessor.phone,
        })
        setIsEditDialogOpen(true)
    }

    const openBanDialog = (assessor: any) => {
        setSelectedAssessor(assessor)
        setIsBanDialogOpen(true)
    }

    const openApprovalDialog = (assessor: any, action: "approve" | "reject") => {
        setApprovalDialog({
            isOpen: true,
            assessor,
            action,
        })
    }

    const handleConfirmApproval = async () => {
        if (!approvalDialog.assessor || !approvalDialog.action) return

        try {
            if (approvalDialog.action === "approve") {
                await approveUser.mutateAsync(approvalDialog.assessor.id)
            } else {
                await rejectUser.mutateAsync(approvalDialog.assessor.id)
            }
            setApprovalDialog({ isOpen: false, assessor: null, action: null })
        } catch (error) {
            // Error is handled by the hook
        }
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Assessors</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage assessor accounts
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Assessor
                </Button>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search assessors..."
                        value={searchQuery}
                        onChange={onSearchChange}
                        className="pl-9"
                    />
                </div>
                <Select value={statusFilter} onValueChange={(value) => {
                    setStatusFilter(value)
                    setPage(1)
                }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="AWAITING_FOR_APPROVAL">Pending</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assessor Name</TableHead>
                            <TableHead>License Number</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Created At</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading...
                                </TableCell>
                            </TableRow>
                        ) : assessors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No assessors found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            assessors.map((assessor: any) => (
                                <TableRow key={assessor.id}>
                                    <TableCell className="font-medium">{assessor.assessorName}</TableCell>
                                    <TableCell>{assessor.licenseNumber}</TableCell>
                                    <TableCell>{assessor.email}</TableCell>
                                    <TableCell>{assessor.phoneNumber || assessor.phone}</TableCell>
                                    <TableCell>{new Date(assessor.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                assessor.isApproved === "APPROVED"
                                                    ? "success"
                                                    : assessor.isApproved === "REJECTED"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {assessor.isApproved === "AWAITING_FOR_APPROVAL"
                                                ? "Pending"
                                                : assessor.isApproved === "APPROVED"
                                                    ? "Approved"
                                                    : assessor.isApproved === "REJECTED"
                                                        ? "Rejected"
                                                        : "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {assessor.isApproved === "AWAITING_FOR_APPROVAL" && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openApprovalDialog(assessor, "approve")}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Approve"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openApprovalDialog(assessor, "reject")}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        title="Reject"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </>
                                            )}
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openEditDialog(assessor)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {assessor.banned ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleUnbanAssessor(assessor)}
                                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                    title="Unban"
                                                    disabled={isUnbanning}
                                                >
                                                    <ShieldCheck className="h-4 w-4" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => openBanDialog(assessor)}
                                                    className="text-destructive hover:text-destructive"
                                                    title="Ban"
                                                >
                                                    <Ban className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination Controls */}
            <div className="flex items-center justify-end space-x-2 py-4">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1 || isLoading}
                >
                    Previous
                </Button>
                <div className="text-sm text-muted-foreground">
                    Page {page} of {totalPages || 1}
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isLoading}
                >
                    Next
                </Button>
            </div>

            {/* Add Assessor Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Assessor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addForm.handleSubmit(handleAddAssessor)} className="space-y-4">
                        {/* Name field removed, using Assessor Name */}

                        <div className="space-y-2">
                            <Label htmlFor="add-assessor-name">
                                Assessor Name <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={addForm.control}
                                name="assessorName"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="add-assessor-name"
                                        placeholder="Enter assessor name"
                                        aria-invalid={!!addForm.formState.errors.assessorName}
                                    />
                                )}
                            />
                            {addForm.formState.errors.assessorName && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.assessorName.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-license">
                                License Number <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={addForm.control}
                                name="licenseNumber"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="add-license"
                                        placeholder="Enter license number"
                                        aria-invalid={!!addForm.formState.errors.licenseNumber}
                                    />
                                )}
                            />
                            {addForm.formState.errors.licenseNumber && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.licenseNumber.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={addForm.control}
                                name="email"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="add-email"
                                        type="email"
                                        placeholder="Enter email address"
                                        aria-invalid={!!addForm.formState.errors.email}
                                    />
                                )}
                            />
                            {addForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-phone">
                                Phone Number <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={addForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <PhoneInput
                                        {...field}
                                        id="add-phone"
                                        placeholder="Enter phone number"
                                        defaultCountry="US"
                                    />
                                )}
                            />
                            {addForm.formState.errors.phone && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.phone.message}
                                </p>
                            )}
                        </div>



                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false)
                                    addForm.reset()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" disabled={isCreating}>
                                {isCreating ? "Adding..." : "Add Assessor"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Assessor Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Assessor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(handleEditAssessor)} className="space-y-4">
                        {/* Name field removed, using Assessor Name */}

                        <div className="space-y-2">
                            <Label htmlFor="edit-assessor-name">
                                Assessor Name <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={editForm.control}
                                name="assessorName"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="edit-assessor-name"
                                        placeholder="Enter assessor name"
                                        aria-invalid={!!editForm.formState.errors.assessorName}
                                    />
                                )}
                            />
                            {editForm.formState.errors.assessorName && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.assessorName.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-license">
                                License Number <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={editForm.control}
                                name="licenseNumber"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="edit-license"
                                        placeholder="Enter license number"
                                        aria-invalid={!!editForm.formState.errors.licenseNumber}
                                    />
                                )}
                            />
                            {editForm.formState.errors.licenseNumber && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.licenseNumber.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={editForm.control}
                                name="email"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="edit-email"
                                        type="email"
                                        placeholder="Enter email address"
                                        aria-invalid={!!editForm.formState.errors.email}
                                    />
                                )}
                            />
                            {editForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-phone">
                                Phone Number <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={editForm.control}
                                name="phone"
                                render={({ field }) => (
                                    <PhoneInput
                                        {...field}
                                        id="edit-phone"
                                        placeholder="Enter phone number"
                                        defaultCountry="US"
                                    />
                                )}
                            />
                            {editForm.formState.errors.phone && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.phone.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsEditDialogOpen(false)
                                    setSelectedAssessor(null)
                                    editForm.reset()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" disabled={isUpdating}>
                                {isUpdating ? "Saving..." : "Save Changes"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Approval Confirmation Dialog */}
            <Dialog
                open={approvalDialog.isOpen}
                onOpenChange={(open) => !open && setApprovalDialog(prev => ({ ...prev, isOpen: false }))}
            >
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Confirm {approvalDialog.action === "approve" ? "Approval" : "Rejection"}</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to {approvalDialog.action} "{approvalDialog.assessor?.assessorName}"?
                            <br /><br />
                            This action will send an email notification to the user.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setApprovalDialog({ isOpen: false, assessor: null, action: null })}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant={approvalDialog.action === "approve" ? "default" : "destructive"}
                            className={approvalDialog.action === "approve" ? "bg-green-600 hover:bg-green-700 text-white" : ""}
                            onClick={handleConfirmApproval}
                            disabled={approveUser.isPending || rejectUser.isPending}
                        >
                            {approveUser.isPending || rejectUser.isPending ? "Processing..." : (approvalDialog.action === "approve" ? "Approve" : "Reject")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Ban Confirmation Dialog */}
            <Dialog open={isBanDialogOpen} onOpenChange={setIsBanDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Ban Assessor</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to ban "{selectedAssessor?.assessorName}"?
                            This will prevent them from signing in and revoke all active sessions.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsBanDialogOpen(false)
                                setSelectedAssessor(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBanAssessor}
                            disabled={isBanning}
                        >
                            {isBanning ? "Banning..." : "Ban Assessor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
