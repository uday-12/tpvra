
import { useQuery } from "@tanstack/react-query"

export type UseAdminUsersParams = {
    role?: string
    page?: number
    limit?: number
    searchQuery?: string
    status?: string // Added status filter
}

export function useAdminUsers({
    role,
    page = 1,
    limit = 10,
    searchQuery = "",
    status,
}: UseAdminUsersParams) {
    return useQuery({
        queryKey: ["admin-users", role, page, limit, searchQuery, status],
        queryFn: async () => {
            const params = new URLSearchParams()
            params.append("page", page.toString())
            params.append("limit", limit.toString())

            if (role) params.append("role", role)
            if (searchQuery) params.append("search", searchQuery)
            if (status) params.append("status", status)

            const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/users?${params.toString()}`, {
                headers: {
                    "Content-Type": "application/json",
                },
                credentials: "include",
            })

            if (!response.ok) {
                const error = await response.json()
                throw new Error(error.message || "Failed to fetch users")
            }

            return response.json()
        },
    })
}
