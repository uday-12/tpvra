"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface PaginationProps {
    currentPage: number
    totalPages: number
    hasNextPage?: boolean
    hasPrevPage?: boolean
    onPageChange: (page: number) => void
    isLoading?: boolean
    className?: string
}

export function Pagination({
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    onPageChange,
    isLoading = false,
    className,
}: PaginationProps) {
    // Don't render if there's only 1 page or no pages
    if (totalPages <= 1) return null

    // Calculate which page numbers to show
    const getPageNumbers = (): (number | "ellipsis")[] => {
        const pages: (number | "ellipsis")[] = []
        const maxVisiblePages = 5

        if (totalPages <= maxVisiblePages + 2) {
            // Show all pages if total is small enough
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i)
            }
        } else {
            // Always show first page
            pages.push(1)

            if (currentPage <= 3) {
                // Near the start
                for (let i = 2; i <= 4; i++) {
                    pages.push(i)
                }
                pages.push("ellipsis")
                pages.push(totalPages)
            } else if (currentPage >= totalPages - 2) {
                // Near the end
                pages.push("ellipsis")
                for (let i = totalPages - 3; i <= totalPages; i++) {
                    pages.push(i)
                }
            } else {
                // In the middle
                pages.push("ellipsis")
                for (let i = currentPage - 1; i <= currentPage + 1; i++) {
                    pages.push(i)
                }
                pages.push("ellipsis")
                pages.push(totalPages)
            }
        }

        return pages
    }

    const pageNumbers = getPageNumbers()

    // Determine if prev/next should be disabled
    const isPrevDisabled = hasPrevPage !== undefined ? !hasPrevPage : currentPage === 1
    const isNextDisabled = hasNextPage !== undefined ? !hasNextPage : currentPage >= totalPages

    return (
        <div className={cn("flex items-center justify-end space-x-1 py-4", className)}>
            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={isPrevDisabled || isLoading}
                className="h-8 w-8 p-0"
            >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
            </Button>

            {pageNumbers.map((page, index) => {
                if (page === "ellipsis") {
                    return (
                        <span
                            key={`ellipsis-${index}`}
                            className="flex h-8 w-8 items-center justify-center"
                        >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </span>
                    )
                }

                return (
                    <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        disabled={isLoading}
                        className={cn(
                            "h-8 w-8 p-0",
                            currentPage === page && "bg-sidebar-accent-foreground hover:bg-sidebar-accent-foreground/90"
                        )}
                    >
                        {page}
                    </Button>
                )
            })}

            <Button
                variant="outline"
                size="sm"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={isNextDisabled || isLoading}
                className="h-8 w-8 p-0"
            >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
            </Button>
        </div>
    )
}
