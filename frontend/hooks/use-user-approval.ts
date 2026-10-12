import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { approveUser, rejectUser } from "../apis/users"

export function useUserApproval() {
    const queryClient = useQueryClient()

    const approveUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await approveUser(userId)
        },
        onSuccess: () => {
            // Invalidate all admin-users queries to refresh list
            queryClient.invalidateQueries({ queryKey: ["admin-users"] })
            toast.success("User approved and email sent")
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

    const rejectUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            return await rejectUser(userId)
        },
        onSuccess: () => {
            // Invalidate all admin-users queries
            queryClient.invalidateQueries({ queryKey: ["admin-users"] })
            toast.success("User rejected and email sent")
        },
        onError: (error) => {
            toast.error(error.message)
        },
    })

    return {
        approveUser: approveUserMutation,
        rejectUser: rejectUserMutation,
    }
}
