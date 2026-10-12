"use client"

import * as React from "react"
import { ChevronDownIcon, CheckIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

export interface MultiSelectOption {
    value: string
    label: string
}

interface MultiSelectFilterProps {
    options: MultiSelectOption[]
    selectedValues: string[]
    onSelectionChange: (values: string[]) => void
    placeholder?: string
    allLabel?: string
    className?: string
    triggerClassName?: string
}

export function MultiSelectFilter({
    options,
    selectedValues,
    onSelectionChange,
    placeholder = "Select...",
    allLabel = "All",
    className,
    triggerClassName,
}: MultiSelectFilterProps) {
    const [open, setOpen] = React.useState(false)

    const handleToggle = (value: string) => {
        if (selectedValues.includes(value)) {
            onSelectionChange(selectedValues.filter(v => v !== value))
        } else {
            onSelectionChange([...selectedValues, value])
        }
    }

    const handleSelectAll = () => {
        if (selectedValues.length === options.length) {
            onSelectionChange([])
        } else {
            onSelectionChange(options.map(opt => opt.value))
        }
    }

    const getDisplayText = () => {
        if (selectedValues.length === 0) {
            return allLabel
        }
        if (selectedValues.length === options.length) {
            return allLabel
        }
        if (selectedValues.length === 1) {
            const selectedOption = options.find(opt => opt.value === selectedValues[0])
            return selectedOption?.label || selectedValues[0]
        }
        return `${selectedValues.length} selected`
    }

    const isAllSelected = selectedValues.length === 0 || selectedValues.length === options.length

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <button
                    type="button"
                    className={cn(
                        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 flex w-fit items-center justify-between gap-2 rounded-md border bg-transparent px-3 py-2 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:ring-[3px] cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 h-9",
                        triggerClassName
                    )}
                >
                    <span className="truncate">{getDisplayText()}</span>
                    <ChevronDownIcon className="size-4 opacity-50 shrink-0" />
                </button>
            </PopoverTrigger>
            <PopoverContent
                className={cn("w-56 p-2 max-h-72 overflow-y-auto", className)}
                align="start"
            >
                <div className="space-y-1">
                    {/* Select All option */}
                    <label
                        className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                    >
                        <Checkbox
                            checked={isAllSelected}
                            onCheckedChange={handleSelectAll}
                        />
                        <span className="text-sm">{allLabel}</span>
                    </label>

                    {/* Separator */}
                    <div className="border-t my-1" />

                    {/* Options */}
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className="flex items-center gap-2 px-2 py-1.5 rounded-sm cursor-pointer hover:bg-accent hover:text-accent-foreground"
                        >
                            <Checkbox
                                checked={selectedValues.includes(option.value)}
                                onCheckedChange={() => handleToggle(option.value)}
                            />
                            <span className="text-sm truncate">{option.label}</span>
                        </label>
                    ))}
                </div>
            </PopoverContent>
        </Popover>
    )
}
