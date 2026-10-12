"use client"

import * as React from "react"
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

export interface InfiniteScrollSelectOption {
    value: string
    label: string
}

interface InfiniteScrollSelectProps {
    value: string
    onValueChange: (value: string) => void
    options: InfiniteScrollSelectOption[]
    placeholder?: string
    searchPlaceholder?: string
    emptyText?: string
    isLoading?: boolean
    hasMore?: boolean
    onLoadMore?: () => void
    onSearch?: (query: string) => void
    /** Called when the dropdown opens - use this to fetch initial data */
    onOpen?: () => void
    disabled?: boolean
    className?: string
    /** Label to display when value is set but not found in options (useful for async loading) */
    selectedLabel?: string
}

export function InfiniteScrollSelect({
    value,
    onValueChange,
    options,
    placeholder = "Select option...",
    searchPlaceholder = "Search...",
    emptyText = "No results found.",
    isLoading = false,
    hasMore = false,
    onLoadMore,
    onSearch,
    onOpen,
    disabled = false,
    className,
    selectedLabel,
}: InfiniteScrollSelectProps) {
    const [open, setOpen] = React.useState(false)
    const [searchQuery, setSearchQuery] = React.useState("")
    const scrollContainerRef = React.useRef<HTMLDivElement>(null)
    const loadingRef = React.useRef(false)
    const hasOpenedRef = React.useRef(false)

    const selectedOption = options.find((option) => option.value === value)
    // Use selectedLabel if provided and option not found in current options
    const displayLabel = selectedOption?.label || selectedLabel

    // Handle open change
    const handleOpenChange = (newOpen: boolean) => {
        setOpen(newOpen)
        if (newOpen && !hasOpenedRef.current) {
            // First time opening - fetch initial data
            hasOpenedRef.current = true
            onOpen?.()
        }
        if (!newOpen) {
            // Reset search when closing
            setSearchQuery("")
        }
    }

    // Check if we need to load more
    const checkAndLoadMore = React.useCallback(() => {
        const container = scrollContainerRef.current
        if (!container) return

        const scrollTop = container.scrollTop
        const scrollHeight = container.scrollHeight
        const clientHeight = container.clientHeight

        // Load more when scrolled to bottom (with 50px threshold)
        if (scrollHeight - scrollTop - clientHeight < 50 && hasMore && !isLoading && !loadingRef.current) {
            loadingRef.current = true
            onLoadMore?.()
            setTimeout(() => {
                loadingRef.current = false
            }, 500)
        }
    }, [hasMore, isLoading, onLoadMore])

    // Handle wheel event explicitly
    const handleWheel = React.useCallback((e: React.WheelEvent<HTMLDivElement>) => {
        const container = scrollContainerRef.current
        if (!container) return

        // Manually scroll the container
        container.scrollTop += e.deltaY

        // Prevent the event from bubbling up to close the popover
        e.stopPropagation()

        // Check if we need to load more after scrolling
        checkAndLoadMore()
    }, [checkAndLoadMore])

    // Handle native scroll event (for scrollbar clicks)
    const handleScroll = React.useCallback(() => {
        checkAndLoadMore()
    }, [checkAndLoadMore])

    // Handle search
    const handleSearchChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const query = e.target.value
        setSearchQuery(query)
        onSearch?.(query)
    }, [onSearch])

    // Handle item selection
    const handleSelect = (optionValue: string) => {
        onValueChange(optionValue)
        setOpen(false)
    }

    // Reset hasOpenedRef when component unmounts or when options are cleared externally
    React.useEffect(() => {
        if (options.length === 0 && !isLoading) {
            hasOpenedRef.current = false
        }
    }, [options.length, isLoading])

    return (
        <Popover open={open} onOpenChange={handleOpenChange}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn(
                        "w-full justify-between font-normal h-9",
                        !displayLabel && "text-muted-foreground",
                        className
                    )}
                    disabled={disabled}
                >
                    <span className="truncate">{displayLabel || placeholder}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent
                className="w-[--radix-popover-trigger-width] p-0"
                align="start"
                onWheel={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col">
                    {/* Search input */}
                    <div className="flex items-center border-b px-3 py-2">
                        <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                        <input
                            className="flex h-8 w-full rounded-md bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
                            placeholder={searchPlaceholder}
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>

                    {/* Scrollable options list */}
                    <div
                        ref={scrollContainerRef}
                        onWheel={handleWheel}
                        onScroll={handleScroll}
                        className="max-h-[200px] overflow-y-auto"
                        style={{
                            overscrollBehavior: 'contain',
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {options.length === 0 && !isLoading ? (
                            <div className="py-6 text-center text-sm text-muted-foreground">
                                {emptyText}
                            </div>
                        ) : (
                            <div className="p-1">
                                {options.map((option) => (
                                    <div
                                        key={option.value}
                                        onClick={() => handleSelect(option.value)}
                                        className={cn(
                                            "relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
                                            "hover:bg-accent hover:text-accent-foreground",
                                            value === option.value && "bg-accent text-accent-foreground"
                                        )}
                                    >
                                        <Check
                                            className={cn(
                                                "mr-2 h-4 w-4",
                                                value === option.value ? "opacity-100" : "opacity-0"
                                            )}
                                        />
                                        {option.label}
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex items-center justify-center py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                    </div>
                                )}
                                {hasMore && !isLoading && (
                                    <div className="text-center py-2 text-xs text-muted-foreground">
                                        Scroll for more...
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
