import type { PaymentIntentData, PaymentData, PaymentResponse, CustomerData } from './types';

export interface IPaymentProcessor {
    /**
     * Creates a customer.
     */
    createCustomer(data: CustomerData): Promise<PaymentResponse>;

    /**
     * Updates a customer.
     */
    updateCustomer(id: string, data: CustomerData): Promise<PaymentResponse>;

    /**
     * Creates a payment intent or order on the gateway.
     */
    createPaymentIntent(data: PaymentIntentData): Promise<PaymentResponse>;

    /**
     * Validates payment data (e.g., signature verification for Razorpay).
     */
    validatePaymentData(data: PaymentData): Promise<PaymentResponse>;

    /**
     * Verifies and processes a webhook event.
     */
    verifyWebhookEvent(payload: any, signature: string): Promise<PaymentResponse>;

    /**
     * Captures an authorized payment.
     */
    capturePayment(paymentId: string, amount: number, currency: string): Promise<PaymentResponse>;

    /**
     * Fetches invoice details for a payment.
     */
    fetchInvoice(paymentId: string): Promise<PaymentResponse>;

    /**
     * Formats the raw gateway response into a standardized format.
     */
    formatGatewayResponse(response: any): PaymentResponse;
}
