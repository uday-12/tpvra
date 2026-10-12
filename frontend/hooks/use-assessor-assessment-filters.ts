import { useQuery } from "@tanstack/react-query"

export type AssessorAssessmentFilters = {
    pendingCount: number
    submittedCount: number
    statusCounts: Array<{
        status: string
        count: number
    }>
    vendorCounts: Array<{
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

export type UseAssessorAssessmentFiltersParams = {
    assessmentName?: string
}

export function useAssessorAssessmentFilters({
    assessmentName = "",
}: UseAssessorAssessmentFiltersParams = {}) {
    return useQuery<AssessorAssessmentFilters>({
        queryKey: ["assessor-assessment-filters", assessmentName],
        queryFn: async () => {
            const params = new URLSearchParams({
                assessmentName,
            })

            const response = await fetch(
                `${process.env.NEXT_PUBLIC_BACKEND_URL}/assessor-vendor-assessments/assessor-filters-data?${params.toString()}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                }
            )

            if (!response.ok) {
                throw new Error("Failed to fetch assessor assessment filters")
            }

            return response.json()
        },
    })
}
