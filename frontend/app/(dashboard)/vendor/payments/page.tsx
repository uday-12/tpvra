"use client"

import { useState, useCallback } from "react"
import { Download, ChevronLeft, ChevronRight, X } from "lucide-react"

import { Button } from "@/components/ui/button"
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
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { usePayments, usePaymentFilters } from "@/hooks/use-payments"
import type { Payment } from "@/apis/payments"

export default function VendorPaymentsPage() {
    const [page, setPage] = useState(1)
    const limit = 10

    // Filters — NO vendor filter for vendor role
    const [assessorId, setAssessorId] = useState<string[]>([])
    const [assessmentId, setAssessmentId] = useState<string[]>([])
    const [paidDate, setPaidDate] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("")

    // Fetch filter options from the server (scoped to vendor's own payments)
    const { data: filters } = usePaymentFilters()

    // Fetch payments with server-side filtering
    const { data, isLoading } = usePayments({
        page,
        limit,
        assessorId: assessorId.length > 0 ? assessorId : undefined,
        assessmentId: assessmentId.length > 0 ? assessmentId : undefined,
        paidDate: paidDate || undefined,
        paymentMethod: paymentMethod || undefined,
    })

    const payments = data?.data ?? []
    const total = data?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    const resetPage = useCallback(() => setPage(1), [])

    const handleAssessorChange = (value: string) => {
        if (value === "all") {
            setAssessorId([])
        } else {
            setAssessorId((prev) =>
                prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]
            )
        }
        resetPage()
    }

    const handleAssessmentChange = (value: string) => {
        if (value === "all") {
            setAssessmentId([])
        } else {
            setAssessmentId((prev) =>
                prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]
            )
        }
        resetPage()
    }

    const clearFilters = () => {
        setAssessorId([])
        setAssessmentId([])
        setPaidDate("")
        setPaymentMethod("")
        resetPage()
    }

    const hasActiveFilters = assessorId.length > 0 || assessmentId.length > 0 || !!paidDate || !!paymentMethod

    const formatCurrency = (amount: number | string) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(Number(amount))
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "2-digit",
        })
    }

    const getStatusVariant = (status: string): "success" | "secondary" | "destructive" => {
        switch (status.toLowerCase()) {
            case "success":
            case "completed":
                return "success"
            case "pending":
            case "processing":
                return "secondary"
            case "failed":
                return "destructive"
            default:
                return "secondary"
        }
    }

    const getStatusDisplay = (status: string) => {
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    }

    // Helper to get display name for selected filter
    const getSelectedLabel = (ids: string[], options: { id: string; name: string }[] | undefined, label: string) => {
        if (ids.length === 0) return `All ${label}`
        if (ids.length === 1) {
            const option = options?.find((o) => o.id === ids[0])
            return option?.name ?? ids[0]
        }
        return `${ids.length} ${label}`
    }

    return (
        <div className="flex flex-col gap-6 p-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-semibold tracking-tight">Payment History</h1>
            </div>

            {/* Filters — No vendor filter for vendor role */}
            <div className="flex flex-wrap items-center gap-3">
                <Select value={assessorId.length === 1 ? assessorId[0] : "all"} onValueChange={handleAssessorChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assessor">
                            {getSelectedLabel(assessorId, filters?.assessors, "Assessors")}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Assessors</SelectItem>
                        {filters?.assessors.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={assessmentId.length === 1 ? assessmentId[0] : "all"} onValueChange={handleAssessmentChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Assessment">
                            {getSelectedLabel(assessmentId, filters?.assessments, "Assessments")}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Assessments</SelectItem>
                        {filters?.assessments.map((a) => (
                            <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Input
                    type="date"
                    placeholder="Paid Date"
                    value={paidDate}
                    onChange={(e) => { setPaidDate(e.target.value); resetPage(); }}
                    className="w-[150px]"
                />

                <Select value={paymentMethod || "all"} onValueChange={(value) => { setPaymentMethod(value === "all" ? "" : value); resetPage(); }}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Method">
                            {paymentMethod ? paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1) : "All Methods"}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Methods</SelectItem>
                        {filters?.paymentMethods.map((m) => (
                            <SelectItem key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {hasActiveFilters && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                        <X className="mr-1 h-4 w-4" />
                        Clear
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="rounded-lg border bg-card">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Assessment</TableHead>
                            <TableHead>Assessor</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Invoice</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    Loading payments...
                                </TableCell>
                            </TableRow>
                        ) : payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7} className="h-24 text-center">
                                    No payments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment: Payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{payment.assessmentName}</TableCell>
                                    <TableCell>{payment.assessorName}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>{payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : "—"}</TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={getStatusVariant(payment.status)}
                                            className={
                                                payment.status.toLowerCase() === "pending" || payment.status.toLowerCase() === "processing"
                                                    ? "bg-orange-100 text-orange-700 hover:bg-orange-100"
                                                    : payment.status.toLowerCase() === "failed"
                                                        ? "bg-red-100 text-red-600 hover:bg-red-100"
                                                        : ""
                                            }
                                        >
                                            {getStatusDisplay(payment.status)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>{formatDate(payment.date)}</TableCell>
                                    <TableCell>
                                        {payment.invoiceUrl ? (
                                            <a href={payment.invoiceUrl} target="_blank" rel="noopener noreferrer">
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <Download className="h-4 w-4" />
                                                </Button>
                                            </a>
                                        ) : (
                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                                                <Download className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            {totalPages > 0 && (
                <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                        >
                            <ChevronLeft className="mr-1 h-4 w-4" />
                            Previous
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                            disabled={page >= totalPages}
                        >
                            Next
                            <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    )
}
