"use client"

import { useState } from "react"
import { Pencil, Plus, Search, Ban, Upload, Check, X, ShieldCheck } from "lucide-react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"
import { useAdminUsers } from "@/hooks/use-admin-users"
import { useEffect } from "react"
import { useDebouncedCallback } from "@tanstack/react-pacer"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { authClient } from "@/lib/auth-client"
import Papa from "papaparse"
import { useUserApproval } from "@/hooks/use-user-approval"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
type Vendor = {
    id: string
    name: string
    licenseNumber: string
    email: string
    companyName: string
    phone: string
    createdAt: string
    status: "active" | "inactive"
    isApproved?: "APPROVED" | "REJECTED" | "AWAITING_FOR_APPROVAL"
}

// Validation schema
const createVendorSchema = z.object({
    // name is derived from companyName
    name: z.string().optional(),
    licenseNumber: z.string().min(1, "License number is required"),
    email: z.string().email("Invalid email address"),
    companyName: z.string().min(1, "Company name is required"),
    phone: z.string().min(1, "Phone number is required"),
})

const editVendorSchema = z.object({
    // name is derived from companyName
    name: z.string().optional(),
    licenseNumber: z.string().min(1, "License number is required"),
    email: z.string().email("Invalid email address"),
    companyName: z.string().min(1, "Company name is required"),
    phone: z.string().min(1, "Phone number is required"),
})

type CreateVendorFormData = z.infer<typeof createVendorSchema>
type EditVendorFormData = z.infer<typeof editVendorSchema>

export default function VendorsPage() {

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
        role: "vendor",
        page,
        limit: 10,
        searchQuery: debouncedSearch,
        status: statusFilter === "all" ? undefined : statusFilter,
    })

    const vendors = data?.users || []
    const totalUsers = data?.total || 0
    const totalPages = Math.ceil(totalUsers / 10)

    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isBanDialogOpen, setIsBanDialogOpen] = useState(false)
    const [isBulkUploadDialogOpen, setIsBulkUploadDialogOpen] = useState(false)
    const [bulkUploadProgress, setBulkUploadProgress] = useState({ current: 0, total: 0 })
    const [isBulkUploading, setIsBulkUploading] = useState(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedVendor, setSelectedVendor] = useState<any | null>(null)
    const [approvalDialog, setApprovalDialog] = useState<{
        isOpen: boolean
        vendor: any | null
        action: "approve" | "reject" | null
    }>({
        isOpen: false,
        vendor: null,
        action: null,
    })

    const queryClient = useQueryClient()
    const { approveUser, rejectUser } = useUserApproval()

    // Add form
    const addForm = useForm<CreateVendorFormData>({
        resolver: zodResolver(createVendorSchema),
        defaultValues: {
            licenseNumber: "",
            email: "",
            companyName: "",
            phone: "",
        },
    })

    // Edit form
    const editForm = useForm<EditVendorFormData>({
        resolver: zodResolver(editVendorSchema),
    })

    const { mutate: createVendor, isPending: isCreating } = useMutation({
        mutationFn: async (data: CreateVendorFormData) => {
            const { error } = await authClient.admin.createUser({
                email: data.email,
                password: data.email, // Auto-set password to email
                name: data.companyName, // Set name to companyName
                data: {
                    licenseNumber: data.licenseNumber,
                    companyName: data.companyName,
                    phoneNumber: data.phone,
                    userType: "vendor",
                    isApproved: "APPROVED",
                },
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "vendor"] })
            toast.success("Vendor added successfully")
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
            toast.error(error.message || "Failed to create vendor")
        },
    })

    const { mutate: updateVendor, isPending: isUpdating } = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: EditVendorFormData }) => {
            const { error } = await authClient.admin.updateUser({
                userId: id,
                data: {
                    name: data.companyName, // Set name to companyName
                    licenseNumber: data.licenseNumber,
                    companyName: data.companyName,
                    phoneNumber: data.phone,
                    email: data.email,
                },
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "vendor"] })
            toast.success("Vendor updated successfully")
            setIsEditDialogOpen(false)
            setSelectedVendor(null)
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
            toast.error(error.message || "Failed to update vendor")
        },
    })

    // Handle add vendor
    const handleAddVendor = (data: CreateVendorFormData) => {
        createVendor(data)
    }

    // Handle edit vendor
    const handleEditVendor = (data: EditVendorFormData) => {
        if (!selectedVendor) return
        updateVendor({ id: selectedVendor.id, data })
    }

    // Ban vendor mutation
    const { mutate: banVendor, isPending: isBanning } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await authClient.admin.banUser({
                userId,
                banReason: "Banned by admin",
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "vendor"] })
            toast.success("Vendor banned successfully")
            setIsBanDialogOpen(false)
            setSelectedVendor(null)
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to ban vendor")
        },
    })

    // Unban vendor mutation
    const { mutate: unbanVendor, isPending: isUnbanning } = useMutation({
        mutationFn: async (userId: string) => {
            const { error } = await authClient.admin.unbanUser({
                userId,
            })
            if (error) throw error
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["admin-users", "vendor"] })
            toast.success("Vendor unbanned successfully")
            setSelectedVendor(null)
        },
        onError: (error: any) => {
            toast.error(error.message || "Failed to unban vendor")
        },
    })

    // Handle ban vendor
    const handleBanVendor = () => {
        if (!selectedVendor) return
        banVendor(selectedVendor.id)
    }

    // Handle unban vendor
    const handleUnbanVendor = (vendor: any) => {
        unbanVendor(vendor.id)
    }

    // Download CSV template
    const downloadTemplate = () => {
        const csvContent = "Company Name,License Number,Email,Phone Number\n"
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const link = document.createElement("a")
        const url = URL.createObjectURL(blob)
        link.setAttribute("href", url)
        link.setAttribute("download", "vendor_template.csv")
        link.style.visibility = "hidden"
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    // Handle bulk upload
    const handleBulkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Validate file type
        if (!file.name.endsWith(".csv")) {
            toast.error("Please upload a CSV file")
            return
        }

        setIsBulkUploading(true)

        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: async (results) => {
                try {
                    // Validate CSV structure
                    const requiredColumns = ["Company Name", "License Number", "Email", "Phone Number"]
                    const headers = results.meta.fields || []

                    const missingColumns = requiredColumns.filter(col => !headers.includes(col))
                    if (missingColumns.length > 0) {
                        toast.error(`Missing required columns: ${missingColumns.join(", ")}`)
                        setIsBulkUploading(false)
                        return
                    }

                    // Validate data
                    const vendors = results.data as Array<{
                        "Company Name": string
                        "License Number": string
                        "Email": string
                        "Phone Number": string
                    }>

                    if (vendors.length === 0) {
                        toast.error("CSV file is empty")
                        setIsBulkUploading(false)
                        return
                    }

                    // Validate each row
                    const errors: string[] = []
                    vendors.forEach((vendor, index) => {
                        const rowNum = index + 2 // +2 because index starts at 0 and row 1 is header

                        if (!vendor["Company Name"]?.trim()) {
                            errors.push(`Row ${rowNum}: Company Name is required`)
                        }
                        if (!vendor["License Number"]?.trim()) {
                            errors.push(`Row ${rowNum}: License Number is required`)
                        }
                        if (!vendor["Email"]?.trim()) {
                            errors.push(`Row ${rowNum}: Email is required`)
                        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor["Email"].trim())) {
                            errors.push(`Row ${rowNum}: Invalid email format`)
                        }
                        if (!vendor["Phone Number"]?.trim()) {
                            errors.push(`Row ${rowNum}: Phone Number is required`)
                        }
                    })

                    if (errors.length > 0) {
                        toast.error(`Validation failed:\n${errors.slice(0, 5).join("\n")}${errors.length > 5 ? `\n...and ${errors.length - 5} more errors` : ""}`)
                        setIsBulkUploading(false)
                        return
                    }

                    // Create vendors
                    setBulkUploadProgress({ current: 0, total: vendors.length })
                    let successCount = 0
                    let failCount = 0

                    for (let i = 0; i < vendors.length; i++) {
                        const vendor = vendors[i]
                        try {
                            const { error } = await authClient.admin.createUser({
                                email: vendor["Email"].trim(),
                                password: vendor["Email"].trim(),
                                name: vendor["Company Name"].trim(),
                                data: {
                                    licenseNumber: vendor["License Number"].trim(),
                                    companyName: vendor["Company Name"].trim(),
                                    phoneNumber: vendor["Phone Number"].trim(),
                                    userType: "vendor",
                                    isApproved: "APPROVED",
                                },
                            })

                            if (error) {
                                failCount++
                                console.error(`Failed to create vendor at row ${i + 2}:`, error)
                            } else {
                                successCount++
                            }
                        } catch (error) {
                            failCount++
                            console.error(`Error creating vendor at row ${i + 2}:`, error)
                        }
                        setBulkUploadProgress({ current: i + 1, total: vendors.length })
                    }

                    // Show results
                    queryClient.invalidateQueries({ queryKey: ["admin-users", "vendor"] })

                    if (failCount === 0) {
                        toast.success(`Successfully created ${successCount} vendors`)
                    } else if (successCount === 0) {
                        toast.error(`Failed to create all ${failCount} vendors`)
                    } else {
                        toast.warning(`Created ${successCount} vendors, ${failCount} failed`)
                    }

                    setIsBulkUploadDialogOpen(false)
                } catch (error) {
                    console.error("Error processing CSV:", error)
                    toast.error("Failed to process CSV file")
                } finally {
                    setIsBulkUploading(false)
                    setBulkUploadProgress({ current: 0, total: 0 })
                    // Reset file input
                    event.target.value = ""
                }
            },
            error: (error) => {
                console.error("CSV parsing error:", error)
                toast.error("Failed to parse CSV file")
                setIsBulkUploading(false)
            },
        })
    }

    // Open edit dialog
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const openEditDialog = (vendor: any) => {
        setSelectedVendor(vendor)
        editForm.reset({
            licenseNumber: vendor.licenseNumber,
            email: vendor.email,
            companyName: vendor.companyName,
            phone: vendor.phoneNumber || vendor.phone,
        })
        setIsEditDialogOpen(true)
    }

    const openBanDialog = (vendor: any) => {
        setSelectedVendor(vendor)
        setIsBanDialogOpen(true)
    }

    const openApprovalDialog = (vendor: any, action: "approve" | "reject") => {
        setApprovalDialog({
            isOpen: true,
            vendor,
            action,
        })
    }

    const handleConfirmApproval = async () => {
        if (!approvalDialog.vendor || !approvalDialog.action) return

        try {
            if (approvalDialog.action === "approve") {
                await approveUser.mutateAsync(approvalDialog.vendor.id)
            } else {
                await rejectUser.mutateAsync(approvalDialog.vendor.id)
            }
            setApprovalDialog({ isOpen: false, vendor: null, action: null })
        } catch (error) {
            // Error is handled by the hook
        }
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Vendors</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage vendor accounts
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        variant="outline"
                        onClick={() => setIsBulkUploadDialogOpen(true)}
                    >
                        <Upload className="mr-2 h-4 w-4" />
                        Bulk Upload
                    </Button>
                    <Button onClick={() => setIsAddDialogOpen(true)} className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Vendor
                    </Button>
                </div>
            </div>

            {/* Search and Filter */}
            <div className="flex items-center gap-4">
                <div className="relative max-w-md flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        placeholder="Search vendors..."
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
                            <TableHead>Company Name</TableHead>
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
                        ) : vendors.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No vendors found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                            vendors.map((vendor: any) => (
                                <TableRow key={vendor.id}>
                                    <TableCell className="font-medium">{vendor.companyName}</TableCell>
                                    <TableCell>{vendor.licenseNumber}</TableCell>
                                    <TableCell>{vendor.email}</TableCell>
                                    <TableCell>{vendor.phoneNumber || vendor.phone}</TableCell>
                                    <TableCell>{new Date(vendor.createdAt).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                vendor.isApproved === "APPROVED"
                                                    ? "success"
                                                    : vendor.isApproved === "REJECTED"
                                                        ? "destructive"
                                                        : "secondary"
                                            }
                                        >
                                            {vendor.isApproved === "AWAITING_FOR_APPROVAL"
                                                ? "Pending"
                                                : vendor.isApproved === "APPROVED"
                                                    ? "Approved"
                                                    : vendor.isApproved === "REJECTED"
                                                        ? "Rejected"
                                                        : "Unknown"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {vendor.isApproved === "AWAITING_FOR_APPROVAL" && (
                                                <>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openApprovalDialog(vendor, "approve")}
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        title="Approve"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon-sm"
                                                        onClick={() => openApprovalDialog(vendor, "reject")}
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
                                                onClick={() => openEditDialog(vendor)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            {vendor.banned ? (
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleUnbanVendor(vendor)}
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
                                                    onClick={() => openBanDialog(vendor)}
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

            {/* Add Vendor Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add Vendor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addForm.handleSubmit(handleAddVendor)} className="space-y-4">
                        {/* Name field removed, using Company Name */}

                        <div className="space-y-2">
                            <Label htmlFor="add-company">
                                Company Name <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={addForm.control}
                                name="companyName"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="add-company"
                                        placeholder="Enter company name"
                                        aria-invalid={!!addForm.formState.errors.companyName}
                                    />
                                )}
                            />
                            {addForm.formState.errors.companyName && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.companyName.message}
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
                                {isCreating ? "Adding..." : "Add Vendor"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Vendor Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Vendor</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(handleEditVendor)} className="space-y-4">
                        {/* Name field removed, using Company Name */}

                        <div className="space-y-2">
                            <Label htmlFor="edit-company">
                                Company Name <span className="text-destructive">*</span>
                            </Label>
                            <Controller
                                control={editForm.control}
                                name="companyName"
                                render={({ field }) => (
                                    <Input
                                        {...field}
                                        id="edit-company"
                                        placeholder="Enter company name"
                                        aria-invalid={!!editForm.formState.errors.companyName}
                                    />
                                )}
                            />
                            {editForm.formState.errors.companyName && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.companyName.message}
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
                                    setSelectedVendor(null)
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
                            Are you sure you want to {approvalDialog.action} "{approvalDialog.vendor?.companyName}"?
                            <br /><br />
                            This action will send an email notification to the user.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setApprovalDialog({ isOpen: false, vendor: null, action: null })}
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
                        <DialogTitle>Ban Vendor</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to ban "{selectedVendor?.companyName}"?
                            This will prevent them from signing in and revoke all active sessions.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsBanDialogOpen(false)
                                setSelectedVendor(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleBanVendor}
                            disabled={isBanning}
                        >
                            {isBanning ? "Banning..." : "Ban Vendor"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Bulk Upload Dialog */}
            <Dialog open={isBulkUploadDialogOpen} onOpenChange={setIsBulkUploadDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Bulk Upload Vendors</DialogTitle>
                        <DialogDescription>
                            Upload a CSV file containing vendor information
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label htmlFor="bulk-upload">
                                    Upload CSV File <span className="text-destructive">*</span>
                                </Label>
                                <Button
                                    type="button"
                                    variant="link"
                                    size="sm"
                                    onClick={downloadTemplate}
                                    className="h-auto p-0 text-orange-600 hover:text-orange-700"
                                >
                                    Download Template
                                </Button>
                            </div>
                            <Input
                                id="bulk-upload"
                                type="file"
                                accept=".csv"
                                onChange={handleBulkUpload}
                                disabled={isBulkUploading}
                            />
                            <p className="text-sm text-muted-foreground">
                                Required columns: Company Name, License Number, Email, Phone Number. If same user exist the system auto skips that user.
                            </p>
                        </div>

                        {isBulkUploading && bulkUploadProgress.total > 0 && (
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">
                                        Processing vendors...
                                    </span>
                                    <span className="font-medium">
                                        {bulkUploadProgress.current} / {bulkUploadProgress.total}
                                    </span>
                                </div>
                                <div className="w-full bg-slate-100 rounded-full h-2 dark:bg-slate-800">
                                    <div
                                        className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                                        style={{
                                            width: `${(bulkUploadProgress.current / bulkUploadProgress.total) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsBulkUploadDialogOpen(false)}
                            disabled={isBulkUploading}
                        >
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
