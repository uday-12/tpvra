"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Script from "next/script"
import { ArrowLeft, Loader2, CreditCard, Lock, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { getOrderSummary, createOrder, type OrderSummaryResponse } from "@/apis/vendorAssessments"

declare global {
    interface Window {
        Razorpay: any
    }
}

export default function AssessmentPaymentPage() {
    const router = useRouter()
    const params = useParams()
    const assessmentId = params.id as string

    const [isLoading, setIsLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [summary, setSummary] = useState<OrderSummaryResponse | null>(null)

    useEffect(() => {
        if (!assessmentId) return

        const fetchSummary = async () => {
            try {
                const data = await getOrderSummary(assessmentId)
                setSummary(data)
            } catch (error) {
                console.error("Error fetching order summary:", error)
                toast.error("Failed to load payment details")
            } finally {
                setIsLoading(false)
            }
        }

        fetchSummary()
    }, [assessmentId])

    const handlePayment = async () => {
        if (!summary) return

        setIsProcessing(true)
        try {
            // 1. Create Order
            const orderData = await createOrder(assessmentId)

            // 2. Open Razorpay
            const options = {
                key: orderData.keyId,
                // amount and currency are automatically inferred from order_id
                name: "Vendor Assessment",
                description: `Payment for ${summary.assessmentTitle}`,
                order_id: orderData.orderId,
                handler: function (response: any) {
                    // Payment successful
                    console.log("Payment successful:", response)
                    toast.success("Payment successful!")
                    router.push("/vendor/assessments")
                },
                prefill: {
                    name: orderData.vendorName,
                    email: orderData.vendorEmail,
                    contact: orderData.vendorPhone,
                },
                theme: {
                    color: "#F97316", // Orange-500
                },
                modal: {
                    ondismiss: function () {
                        setIsProcessing(false)
                    }
                }
            }

            const rzp1 = new window.Razorpay(options)
            rzp1.on("payment.failed", function (response: any) {
                console.error("Payment failed:", response.error)
                toast.error(`Payment failed: ${response.error.description}`)
                setIsProcessing(false)
            })

            rzp1.open()
        } catch (error: any) {
            console.error("Payment error:", error)
            toast.error(error.message || "Failed to initiate payment")
            setIsProcessing(false)
        }
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        )
    }

    if (!summary) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <p className="text-muted-foreground">Payment details not found</p>
                <Button onClick={() => router.push("/vendor/assessments")}>
                    Back to Assessment
                </Button>
            </div>
        )
    }

    return (
        <div className="flex flex-col min-h-screen bg-gray-50">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            {/* Header */}
            <div className="bg-white border-b sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 py-4">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push("/vendor/assessments")}
                        className="mb-3 -ml-2"
                    >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Assessment
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        Complete Payment
                    </h1>

                    {/* Steps Indicator */}
                    <div className="flex items-center gap-4">
                        {/* Step 1 - Completed */}
                        <div className="flex items-center gap-3 opacity-60">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-green-100 text-green-600">
                                <CheckCircle2 className="h-6 w-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Step 1</p>
                                <p className="text-xs text-gray-500">Questions</p>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="h-px w-8 bg-gray-300"></div>

                        {/* Step 2 - Active */}
                        <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white">
                                <CreditCard className="h-5 w-5" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-gray-900">Step 2</p>
                                <p className="text-xs text-gray-500">Payment</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 py-12 px-6">
                <div className="max-w-md mx-auto">
                    <Card className="shadow-lg border-muted">
                        <CardHeader>
                            <CardTitle>Order Summary</CardTitle>
                            <CardDescription>
                                Review your assessment fee details
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-4">
                                <div className="flex justify-between items-start gap-4">
                                    <span className="text-sm text-muted-foreground">Assessment</span>
                                    <span className="text-sm font-medium text-right">{summary.assessmentTitle}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-sm text-muted-foreground">Fee</span>
                                    <span className="text-sm font-medium">
                                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: summary.currency }).format(summary.amount)}
                                    </span>
                                </div>
                            </div>

                            <Separator />

                            <div className="flex justify-between items-center">
                                <span className="font-semibold">Total</span>
                                <span className="text-xl font-bold text-orange-600">
                                    {new Intl.NumberFormat('en-US', { style: 'currency', currency: summary.currency }).format(summary.amount)}
                                </span>
                            </div>

                            <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm">
                                <Lock className="h-5 w-5 flex-shrink-0" />
                                <p>
                                    Your payment is secured by Razorpay. You will be redirected to a secure payment page.
                                </p>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-orange-600 hover:bg-orange-700 text-white h-12 text-lg"
                                onClick={handlePayment}
                                disabled={isProcessing}
                            >
                                {isProcessing ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Pay {new Intl.NumberFormat('en-US', { style: 'currency', currency: summary.currency }).format(summary.amount)}
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>
            </div>
        </div>
    )
}
