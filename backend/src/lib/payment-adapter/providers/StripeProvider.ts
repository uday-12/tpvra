import { BasePaymentProcessor } from '../BasePaymentProcessor';
import type { PaymentIntentData, PaymentData, PaymentResponse, CustomerData } from '../types';
import Stripe from 'stripe';

export class StripeProvider extends BasePaymentProcessor {
    private stripe: Stripe;

    constructor(config: any) {
        super('Stripe', config);
        this.stripe = new Stripe(this.config.apiSecret, {
            apiVersion: '2025-12-15.clover',
        });
    }
    async createCustomer(data: CustomerData): Promise<PaymentResponse> {
        try {
            const params: Stripe.CustomerCreateParams = {
                email: data.email,
                name: data.name,
                phone: data.phone,
                metadata: data.metadata,
                description: data.description,
            };

            if (data.address) {
                params.address = data.address;
            }

            // Check for idempotency if an ID is provided in metadata (e.g. userId)
            const options: Stripe.RequestOptions = {};
            if (data.metadata?.userId) {
                options.idempotencyKey = `customer_${data.metadata.userId}`;
            }

            const customer = await this.stripe.customers.create(params, options);

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
            const params: Stripe.CustomerUpdateParams = {
                email: data.email,
                name: data.name,
                phone: data.phone,
                metadata: data.metadata,
                description: data.description,
            };

            if (data.address) {
                params.address = data.address;
            }

            const customer = await this.stripe.customers.update(id, params);
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

            const params: Stripe.PaymentIntentCreateParams = {
                amount: amountInSmallestUnit,
                currency: data.currency.toLowerCase(),
                description: data.description,
                metadata: data.metadata,
                automatic_payment_methods: {
                    enabled: true,
                },
            };

            if (data.customerId) {
                params.customer = data.customerId;
            }

            if (data.customerEmail && !data.customerId) {
                params.receipt_email = data.customerEmail;
            }

            const paymentIntent = await this.stripe.paymentIntents.create(params);

            return {
                success: true,
                transactionId: paymentIntent.id,
                data: {
                    clientSecret: paymentIntent.client_secret,
                    status: paymentIntent.status,
                },
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async validatePaymentData(data: PaymentData): Promise<PaymentResponse> {
        // For Stripe, validation is often done via Webhook or retrieving the PI
        try {
            const paymentIntent = await this.stripe.paymentIntents.retrieve(data.paymentId);
            if (paymentIntent.status === 'succeeded') {
                return {
                    success: true,
                    transactionId: paymentIntent.id,
                    data: paymentIntent
                };
            }
            return {
                success: false,
                error: {
                    code: 'PAYMENT_NOT_SUCCEEDED',
                    message: `Payment status is ${paymentIntent.status}`,
                }
            };

        } catch (error) {
            return this.handleError(error);
        }
    }

    async verifyWebhookEvent(payload: any, signature: string): Promise<PaymentResponse> {
        try {
            if (!this.config.webhookSecret) {
                throw new Error('Webhook secret is not configured for Stripe');
            }
            const event = this.stripe.webhooks.constructEvent(
                payload,
                signature,
                this.config.webhookSecret
            );

            return {
                success: true,
                data: event,
            };
        } catch (error) {
            return this.handleError(error);
        }
    }

    async capturePayment(_paymentId: string, _amount: number, _currency: string): Promise<PaymentResponse> {
        // Stripe handles capture differently via PaymentIntents; not implemented for this gateway
        return {
            success: false,
            error: {
                code: 'NOT_IMPLEMENTED',
                message: 'capturePayment is not implemented for Stripe provider',
            },
        };
    }

    async fetchInvoice(_paymentId: string): Promise<PaymentResponse> {
        // Not implemented for Stripe provider
        return {
            success: false,
            error: {
                code: 'NOT_IMPLEMENTED',
                message: 'fetchInvoice is not implemented for Stripe provider',
            },
        };
    }
}
