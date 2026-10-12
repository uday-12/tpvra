import { useQuery } from "@tanstack/react-query"

export type VendorAssessmentFilters = {
    pendingCount: number
    submittedCount: number
    statusCounts: Array<{
        status: string
        count: number
    }>
    assessorCounts: Array<{
        id: string
        name: string
        count: number
    }>
    assessmentCounts: Array<{
        id: string
        name: string
        count: number
    }>
}

export type UseVendorAssessmentFiltersParams = {
    vendorId?: string
    assessmentName?: string
}

export function useVendorAssessmentFilters({
    vendorId = "",
    assessmentName = "",
}: UseVendorAssessmentFiltersParams = {}) {
    return useQuery<VendorAssessmentFilters>({
        queryKey: ["vendor-assessment-filters", vendorId, assessmentName],
        queryFn: async () => {
            const params = new URLSearchParams({
                vendorId,
                assessmentName,
            })

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/assessor-vendor-assessments/filters?${params.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                }
            )

            if (!response.ok) {
                throw new Error("Failed to fetch assessment filters")
            }

            return response.json()
        },
    })
}
