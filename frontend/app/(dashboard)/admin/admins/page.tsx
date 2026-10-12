"use client"

import { useState } from "react"
import { Pencil, Plus, Search, Trash2 } from "lucide-react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
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
type Admin = {
    id: string
    adminId: string
    name: string
    email: string
    role: "super_admin" | "admin"
    status: "active" | "inactive"
    lastLogin: string
}

// Validation schema
const adminSchema = z.object({
    name: z.string().min(1, "Name is required"),
    email: z.string().email("Invalid email address"),
    role: z.enum(["super_admin", "admin"], {
        message: "Please select a role",
    }),
})

type AdminFormData = z.infer<typeof adminSchema>

export default function AdminsPage() {
    // Sample data - replace with actual API call
    const [admins, setAdmins] = useState<Admin[]>([
        {
            id: "1",
            adminId: "ADM001",
            name: "John Smith",
            email: "testflair.admin@gmail.com",
            role: "super_admin",
            status: "active",
            lastLogin: "2024-12-10",
        },
        {
            id: "2",
            adminId: "ADM002",
            name: "Sarah Johnson",
            email: "sarah.admin@tpvra.com",
            role: "admin",
            status: "active",
            lastLogin: "2024-12-09",
        },
        {
            id: "3",
            adminId: "ADM003",
            name: "Mike Wilson",
            email: "mike.admin@tpvra.com",
            role: "admin",
            status: "inactive",
            lastLogin: "2024-11-28",
        },
    ])

    const [searchQuery, setSearchQuery] = useState("")
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [selectedAdmin, setSelectedAdmin] = useState<Admin | null>(null)

    // Add form
    const addForm = useForm<AdminFormData>({
        resolver: zodResolver(adminSchema),
        defaultValues: {
            name: "",
            email: "",
            role: undefined,
        },
    })

    // Edit form
    const editForm = useForm<AdminFormData>({
        resolver: zodResolver(adminSchema),
    })

    // Filter admins based on search query
    const filteredAdmins = admins.filter((admin) =>
        Object.values(admin).some((value) =>
            value.toString().toLowerCase().includes(searchQuery.toLowerCase())
        )
    )

    // Generate admin ID
    const generateAdminId = () => {
        const maxId = admins.reduce((max, admin) => {
            const num = parseInt(admin.adminId.replace("ADM", ""))
            return num > max ? num : max
        }, 0)
        return `ADM${String(maxId + 1).padStart(3, "0")}`
    }

    // Handle add admin
    const handleAddAdmin = (data: AdminFormData) => {
        const newAdmin: Admin = {
            id: Date.now().toString(),
            adminId: generateAdminId(),
            ...data,
            status: "active",
            lastLogin: new Date().toISOString().split("T")[0],
        }
        setAdmins([...admins, newAdmin])
        setIsAddDialogOpen(false)
        addForm.reset()
        toast.success("Admin added successfully")
    }

    // Handle edit admin
    const handleEditAdmin = (data: AdminFormData) => {
        if (!selectedAdmin) return

        setAdmins(
            admins.map((admin) =>
                admin.id === selectedAdmin.id
                    ? { ...admin, ...data }
                    : admin
            )
        )
        setIsEditDialogOpen(false)
        setSelectedAdmin(null)
        editForm.reset()
        toast.success("Admin updated successfully")
    }

    // Handle delete admin
    const handleDeleteAdmin = () => {
        if (!selectedAdmin) return

        setAdmins(admins.filter((admin) => admin.id !== selectedAdmin.id))
        setIsDeleteDialogOpen(false)
        setSelectedAdmin(null)
        toast.success("Admin deleted successfully")
    }

    // Open edit dialog
    const openEditDialog = (admin: Admin) => {
        setSelectedAdmin(admin)
        editForm.reset({
            name: admin.name,
            email: admin.email,
            role: admin.role,
        })
        setIsEditDialogOpen(true)
    }

    // Open delete dialog
    const openDeleteDialog = (admin: Admin) => {
        setSelectedAdmin(admin)
        setIsDeleteDialogOpen(true)
    }

    // Get role display name
    const getRoleDisplay = (role: string) => {
        return role === "super_admin" ? "Super Admin" : "Admin"
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold tracking-tight">Admins</h1>
                    <p className="text-sm text-muted-foreground">
                        Manage administrator accounts
                    </p>
                </div>
                <Button onClick={() => setIsAddDialogOpen(true)} className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Admin
                </Button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder="Search admins..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                />
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Last Login</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredAdmins.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No admins found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredAdmins.map((admin) => (
                                <TableRow key={admin.id}>
                                    <TableCell className="font-medium">{admin.adminId}</TableCell>
                                    <TableCell>{admin.name}</TableCell>
                                    <TableCell>{admin.email}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={admin.role === "super_admin" ? "default" : "secondary"}
                                            className={admin.role === "super_admin" ? "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90" : ""}
                                        >
                                            {getRoleDisplay(admin.role)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                admin.status === "active" ? "success" : "inactive"
                                            }
                                        >
                                            {admin.status === "active" ? "Active" : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{admin.lastLogin}</TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openEditDialog(admin)}
                                            >
                                                <Pencil className="h-4 w-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => openDeleteDialog(admin)}
                                                className="text-destructive hover:text-destructive"
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

            {/* Add Admin Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add Admin</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={addForm.handleSubmit(handleAddAdmin)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="add-name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="add-name"
                                placeholder="Enter admin name"
                                {...addForm.register("name")}
                                aria-invalid={!!addForm.formState.errors.name}
                            />
                            {addForm.formState.errors.name && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="add-email"
                                type="email"
                                placeholder="Enter email address"
                                {...addForm.register("email")}
                                aria-invalid={!!addForm.formState.errors.email}
                            />
                            {addForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="add-role">
                                Role <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={addForm.watch("role")}
                                onValueChange={(value: "super_admin" | "admin") => addForm.setValue("role", value)}
                            >
                                <SelectTrigger
                                    id="add-role"
                                    aria-invalid={!!addForm.formState.errors.role}
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            {addForm.formState.errors.role && (
                                <p className="text-sm text-destructive">
                                    {addForm.formState.errors.role.message}
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
                            <Button type="submit" className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90">
                                Add Admin
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Edit Admin Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Admin</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={editForm.handleSubmit(handleEditAdmin)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">
                                Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-name"
                                placeholder="Enter admin name"
                                {...editForm.register("name")}
                                aria-invalid={!!editForm.formState.errors.name}
                            />
                            {editForm.formState.errors.name && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.name.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-email">
                                Email <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="edit-email"
                                type="email"
                                placeholder="Enter email address"
                                {...editForm.register("email")}
                                aria-invalid={!!editForm.formState.errors.email}
                            />
                            {editForm.formState.errors.email && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.email.message}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-role">
                                Role <span className="text-destructive">*</span>
                            </Label>
                            <Select
                                value={editForm.watch("role")}
                                onValueChange={(value: "super_admin" | "admin") => editForm.setValue("role", value)}
                            >
                                <SelectTrigger
                                    id="edit-role"
                                    aria-invalid={!!editForm.formState.errors.role}
                                >
                                    <SelectValue placeholder="Select a role" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                            </Select>
                            {editForm.formState.errors.role && (
                                <p className="text-sm text-destructive">
                                    {editForm.formState.errors.role.message}
                                </p>
                            )}
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsEditDialogOpen(false)
                                    setSelectedAdmin(null)
                                    editForm.reset()
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" className="bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90">
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete Admin</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete "{selectedAdmin?.name}"? This
                            action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsDeleteDialogOpen(false)
                                setSelectedAdmin(null)
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteAdmin}
                        >
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
