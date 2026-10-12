"use client"

import { useState, useCallback } from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"

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
import { usePayments, usePaymentFilters } from "@/hooks/use-payments"
import type { Payment } from "@/apis/payments"

export default function PaymentsPage() {
    const [page, setPage] = useState(1)
    const limit = 10

    // Filters — store selected IDs (arrays for multi-select)
    const [vendorId, setVendorId] = useState<string[]>([])
    const [assessorId, setAssessorId] = useState<string[]>([])
    const [assessmentId, setAssessmentId] = useState<string[]>([])
    const [paidDate, setPaidDate] = useState("")
    const [paymentMethod, setPaymentMethod] = useState("")

    // Fetch filter options from the server
    const { data: filters } = usePaymentFilters()

    // Fetch payments with server-side filtering
    const { data, isLoading } = usePayments({
        page,
        limit,
        vendorId: vendorId.length > 0 ? vendorId : undefined,
        assessorId: assessorId.length > 0 ? assessorId : undefined,
        assessmentId: assessmentId.length > 0 ? assessmentId : undefined,
        paidDate: paidDate || undefined,
        paymentMethod: paymentMethod || undefined,
    })

    const payments = data?.data ?? []
    const total = data?.total ?? 0
    const totalPages = Math.ceil(total / limit)

    const resetPage = useCallback(() => setPage(1), [])

    const handleVendorChange = (value: string) => {
        if (value === "all") {
            setVendorId([])
        } else {
            setVendorId((prev) =>
                prev.includes(value) ? prev.filter((id) => id !== value) : [...prev, value]
            )
        }
        resetPage()
    }

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
        setVendorId([])
        setAssessorId([])
        setAssessmentId([])
        setPaidDate("")
        setPaymentMethod("")
        resetPage()
    }

    const hasActiveFilters = vendorId.length > 0 || assessorId.length > 0 || assessmentId.length > 0 || !!paidDate || !!paymentMethod

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
        }).format(amount)
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
        })
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
                <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
                <p className="text-sm text-muted-foreground">
                    View all payment transactions
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap items-center gap-3">
                <Select value={vendorId.length === 1 ? vendorId[0] : "all"} onValueChange={handleVendorChange}>
                    <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Vendor">
                            {getSelectedLabel(vendorId, filters?.vendors, "Vendors")}
                        </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Vendors</SelectItem>
                        {filters?.vendors.map((v) => (
                            <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>

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
                            <TableHead>Vendor</TableHead>
                            <TableHead>Assessor</TableHead>
                            <TableHead>Assessment</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Method</TableHead>
                            <TableHead>Date</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Loading payments...
                                </TableCell>
                            </TableRow>
                        ) : payments.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    No payments found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            payments.map((payment: Payment) => (
                                <TableRow key={payment.id}>
                                    <TableCell>{payment.vendorName}</TableCell>
                                    <TableCell>{payment.assessorName}</TableCell>
                                    <TableCell>{payment.assessmentName}</TableCell>
                                    <TableCell>{formatCurrency(payment.amount)}</TableCell>
                                    <TableCell>{payment.paymentMethod ? payment.paymentMethod.charAt(0).toUpperCase() + payment.paymentMethod.slice(1) : "—"}</TableCell>
                                    <TableCell>{formatDate(payment.date)}</TableCell>
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
