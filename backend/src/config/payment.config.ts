
import { PaymentGateway } from '../lib/payment-adapter/types';

export const getPaymentConfig = (gateway: string) => {
    switch (gateway.toLowerCase()) {
        case PaymentGateway.STRIPE:
            return {
                apiKey: process.env.STRIPE_PUBLIC_KEY || '',
                apiSecret: process.env.STRIPE_SECRET_KEY || '',
                webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
                currency: process.env.DEFAULT_CURRENCY || 'USD',
            };
        case PaymentGateway.RAZORPAY:
            return {
                apiKey: process.env.RAZORPAY_KEY_ID || '',
                apiSecret: process.env.RAZORPAY_KEY_SECRET || '',
                webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || '',
                currency: process.env.DEFAULT_CURRENCY || 'USD',
            };
        default:
            throw new Error(`Unsupported payment gateway: ${gateway}`);
    }
};
