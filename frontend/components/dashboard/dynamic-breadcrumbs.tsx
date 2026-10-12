"use client"

import { usePathname } from "next/navigation"
import { BREADCRUMB_CONFIG } from "@/config/breadcrumbs"
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import Link from "next/link"
import React from "react"
import { useAssessmentContext } from "@/contexts/assessment-context"

// Helper to check if a segment is a UUID
const isUUID = (str: string): boolean => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    return uuidRegex.test(str)
}

export function DynamicBreadcrumbs() {
    const pathname = usePathname()
    const pathSegments = pathname.split("/").filter((segment) => segment !== "")
    const { assessmentTitle } = useAssessmentContext()

    // Filter out role segments (admin, vendor, assessor)
    const roleSegments = ["admin", "vendor", "assessor"]
    const filteredSegments = pathSegments.filter((segment) => !roleSegments.includes(segment))
    const roleSegment = pathSegments.find((segment) => roleSegments.includes(segment))

    return (
        <Breadcrumb>
            <BreadcrumbList>
                {filteredSegments.map((segment, index) => {
                    // Build href using original path segments up to and including current segment
                    const originalIndex = pathSegments.indexOf(segment)
                    let href = `/${pathSegments.slice(0, originalIndex + 1).join("/")}`

                    // Special case: risk-profile should link to dashboard
                    if (segment === "risk-profile" && roleSegment) {
                        href = `/${roleSegment}/dashboard`
                    }

                    const isLast = index === filteredSegments.length - 1

                    // Use assessment title if segment is a UUID and we have the title
                    let label: string
                    if (isUUID(segment) && assessmentTitle) {
                        label = assessmentTitle
                    } else {
                        label = BREADCRUMB_CONFIG[segment] || segment.charAt(0).toUpperCase() + segment.slice(1)
                    }

                    return (
                        <React.Fragment key={index}>
                            <BreadcrumbItem>
                                {isLast ? (
                                    <BreadcrumbPage>{label}</BreadcrumbPage>
                                ) : (
                                    <BreadcrumbLink asChild>
                                        <Link href={href}>{label}</Link>
                                    </BreadcrumbLink>
                                )}
                            </BreadcrumbItem>
                            {!isLast && <BreadcrumbSeparator />}
                        </React.Fragment>
                    )
                })}
            </BreadcrumbList>
        </Breadcrumb>
    )
}
