import type { IPaymentProcessor } from './IPaymentProcessor';
import type { PaymentConfig, PaymentIntentData, PaymentData, PaymentResponse, CustomerData } from './types';

export abstract class BasePaymentProcessor implements IPaymentProcessor {
    protected config: PaymentConfig;
    protected name: string;

    constructor(name: string, config: PaymentConfig) {
        this.name = name;
        this.config = config;
        this.validateConfig();
    }

    /**
     * Validates that the necessary configuration is present.
     */
    protected validateConfig(): void {
        if (!this.config.apiKey || !this.config.apiSecret) {
            throw new Error(`[${this.name}] Missing API credentials (apiKey or apiSecret).`);
        }
    }

    /**
     * Standardized error handling.
     */
    protected handleError(error: any): PaymentResponse {
        console.error(`[${this.name}] Error:`, error);
        return {
            success: false,
            error: {
                code: error.code || 'UNKNOWN_ERROR',
                message: error.message || 'An unknown error occurred during payment processing.',
                details: error,
            },
        };
    }

    /**
     * Helper to convert amount to smallest currency unit (e.g., dollars to cents).
     * Note: This is a simplified version. For a real app, use a dedicated library or robust mapping.
     */
    protected toSmallestUnit(amount: number, currency: string): number {
        const zeroDecimalCurrencies = ['JPY', 'CLP', 'KRW'];
        if (zeroDecimalCurrencies.includes(currency.toUpperCase())) {
            return Math.round(amount);
        }
        // Default to 100 for currencies like USD, EUR, INR
        return Math.round(amount * 100);
    }

    abstract createCustomer(data: CustomerData): Promise<PaymentResponse>;
    abstract updateCustomer(id: string, data: CustomerData): Promise<PaymentResponse>;
    abstract createPaymentIntent(data: PaymentIntentData): Promise<PaymentResponse>;
    abstract validatePaymentData(data: PaymentData): Promise<PaymentResponse>;
    abstract verifyWebhookEvent(payload: any, signature: string): Promise<PaymentResponse>;
    abstract capturePayment(paymentId: string, amount: number, currency: string): Promise<PaymentResponse>;
    abstract fetchInvoice(paymentId: string): Promise<PaymentResponse>;

    // Default implementation implementation or abstract
    formatGatewayResponse(response: any): PaymentResponse {
        return {
            success: true,
            data: response
        }
    }
}
