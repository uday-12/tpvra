import { useQuery } from "@tanstack/react-query"
import { fetchPayments, fetchPaymentFilters, type FetchPaymentsParams } from "@/apis/payments"

export function usePayments(params: FetchPaymentsParams = {}) {
    const { page = 1, limit = 10, vendorId, assessorId, assessmentId, paidDate, paymentMethod } = params

    return useQuery({
        queryKey: ["payments", page, limit, vendorId, assessorId, assessmentId, paidDate, paymentMethod],
        queryFn: () => fetchPayments({ page, limit, vendorId, assessorId, assessmentId, paidDate, paymentMethod }),
    })
}

export function usePaymentFilters() {
    return useQuery({
        queryKey: ["payment-filters"],
        queryFn: () => fetchPaymentFilters(),
    })
}
