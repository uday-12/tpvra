import { BasePaymentProcessor } from '../BasePaymentProcessor';
import type { PaymentIntentData, PaymentData, PaymentResponse, CustomerData } from '../types';
import Razorpay from 'razorpay';
import crypto from 'crypto';

export class RazorpayProvider extends BasePaymentProcessor {
    private razorpay: Razorpay;

    constructor(config: any) {
        super('Razorpay', config);
        this.razorpay = new Razorpay({
            key_id: this.config.apiKey,
            key_secret: this.config.apiSecret,
        });
    }
    async createCustomer(data: CustomerData): Promise<PaymentResponse> {
        try {
            // Razorpay customer creation params
            const params: any = {
                name: data.name,
                email: data.email,
                contact: data.phone,
                notes: data.metadata,
                fail_existing: '0' // Don't fail if customer exists, just return it
            };

            const customer = await this.razorpay.customers.create(params);

            return {
                success: true,
                transactionId: customer.id,
                data: customer,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async updateCustomer(id: string, data: CustomerData): Promise<PaymentResponse> {
        try {
            const params: any = {
                name: data.name,
                email: data.email,
                contact: data.phone,
                notes: data.metadata,
            };

            const customer = await this.razorpay.customers.edit(id, params);

            return {
                success: true,
                transactionId: customer.id,
                data: customer,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async createPaymentIntent(data: PaymentIntentData): Promise<PaymentResponse> {
        try {
            const amountInSmallestUnit = this.toSmallestUnit(data.amount, data.currency);

            const options = {
                amount: amountInSmallestUnit,
                currency: data.currency.toUpperCase(),
                receipt: `receipt_${Date.now()}`,
                notes: data.metadata,
            };

            const order = await this.razorpay.orders.create(options);

            return {
                success: true,
                transactionId: order.id,
                data: order,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async validatePaymentData(data: PaymentData): Promise<PaymentResponse> {
        // Razorpay signature verification
        try {
            const { orderId, paymentId, signature } = data;
            if (!signature) {
                throw new Error("Signature missing for Razorpay validation");
            }

            const generatedSignature = crypto
                .createHmac('sha256', this.config.apiSecret)
                .update(orderId + '|' + paymentId)
                .digest('hex');

            if (generatedSignature === signature) {
                return {
                    success: true,
                    transactionId: paymentId,
                };
            } else {
                return {
                    success: false,
                    error: {
                        code: 'INVALID_SIGNATURE',
                        message: 'Payment signature verification failed',
                    }
                };
            }
        } catch (error) {
            return this.handleError(error);
        }
    }

    async verifyWebhookEvent(payload: any, signature: string): Promise<PaymentResponse> {
        try {
            if (!this.config.webhookSecret) {
                throw new Error('Webhook secret is not configured for Razorpay');
            }
            // Validator for Razorpay webhooks
            const shasum = crypto.createHmac('sha256', this.config.webhookSecret);
            shasum.update(JSON.stringify(payload));
            const digest = shasum.digest('hex');

            if (digest === signature) {
                return {
                    success: true,
                    data: payload
                };
            }
            return {
                success: false,
                error: {
                    code: 'INVALID_WEBHOOK_SIGNATURE',
                    message: 'Webhook signature verification failed',
                }
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async capturePayment(paymentId: string, amount: number, currency: string): Promise<PaymentResponse> {
        try {
            const captured = await this.razorpay.payments.capture(paymentId, amount, currency);
            return {
                success: true,
                transactionId: captured.id,
                data: captured,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async fetchInvoice(paymentId: string): Promise<PaymentResponse> {
        try {
            // Fetch the payment to get the invoice_id
            const payment = await this.razorpay.payments.fetch(paymentId);
            const invoiceId = payment.invoice_id;

            if (!invoiceId) {
                return {
                    success: true,
                    data: { invoiceId: null, invoiceUrl: null },
                };
            }

            // Fetch the invoice to get the short_url
            const invoice = await this.razorpay.invoices.fetch(invoiceId);

            return {
                success: true,
                data: {
                    invoiceId: invoiceId,
                    invoiceUrl: invoice.short_url || null,
                },
            };
        } catch (error) {
            return this.handleError(error);
        }
    }
}
