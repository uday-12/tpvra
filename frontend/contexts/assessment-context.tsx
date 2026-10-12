"use client"

import React, { createContext, useContext, useState } from "react"

interface AssessmentContextType {
    assessmentTitle: string | null
    setAssessmentTitle: (title: string) => void
}

const AssessmentContext = createContext<AssessmentContextType | undefined>(undefined)

export function AssessmentProvider({ children }: { children: React.ReactNode }) {
    const [assessmentTitle, setAssessmentTitle] = useState<string | null>(null)

    return (
        <AssessmentContext.Provider value={{ assessmentTitle, setAssessmentTitle }}>
            {children}
        </AssessmentContext.Provider>
    )
}

export function useAssessmentContext() {
    const context = useContext(AssessmentContext)
    if (context === undefined) {
        throw new Error("useAssessmentContext must be used within AssessmentProvider")
    }
    return context
}
