
export interface PaymentIntentData {
    amount: number;
    currency: string;
    description?: string;
    metadata?: Record<string, any>;
    customerEmail?: string;
    customerId?: string;
    paymentMethodTypes?: string[];
}

export interface CustomerData {
    email: string;
    name?: string;
    phone?: string;
    metadata?: Record<string, any>;
    description?: string;
    address?: {
        line1: string;
        line2?: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
}

export interface PaymentData {
    orderId: string;
    paymentId: string;
    signature?: string;
    gatewayResponse?: any;
}

export interface PaymentResponse {
    success: boolean;
    transactionId?: string;
    data?: any;
    error?: {
        code: string;
        message: string;
        details?: any;
    };
}

export interface PaymentConfig {
    apiKey: string;
    apiSecret: string;
    webhookSecret?: string;
    currency?: string;
    options?: Record<string, any>;
}


export enum PaymentGateway {
    STRIPE = 'stripe',
    RAZORPAY = 'razorpay',
}

import type Stripe from 'stripe';
export type StripeWebhookPayload = Stripe.Event;
