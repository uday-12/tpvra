import { PaymentProcessorFactory } from './PaymentFactory';
import { getPaymentConfig } from '../../config/payment.config'; // Adjust path as needed
import { PaymentGateway } from './types';
import { prisma } from '../../database/prisma-client';

/**
 * This is an example of how to use the Payment Adapter system.
 * You can import this or copy snippets into your service logic.
 */
export async function examplePaymentFlow() {
    try {
        // 1. Choose your gateway (dynamically or statically)
        // const gateway = process.env.PAYMENT_GATEWAY || PaymentGateway.STRIPE;
        const gateway = PaymentGateway.STRIPE;

        // 2. Load Configuration
        const config = getPaymentConfig(gateway);

        // 3. Get the Processor Instance
        const paymentProcessor = PaymentProcessorFactory.getProcessor(gateway, config);

        console.log(`Using Payment Processor: ${gateway}`);

        // --- SCENARIO A: New Customer Payment ---

        // 4. Create a Customer (Optional, but recommended for recurring/tracking)
        const customerResponse = await paymentProcessor.createCustomer({
            email: 'customer@example.com',
            name: 'Jane Doe',
            phone: '+15550199',
            metadata: {
                userId: 'user_12345' // Useful for Idempotency in StripeProvider
            },
            address: {
                line1: '123 Main St',
                city: 'San Francisco',
                state: 'CA',
                postal_code: '94105',
                country: 'US'
            }
        });

        if (!customerResponse.success || !customerResponse.transactionId) {
            throw new Error(`Failed to create customer: ${customerResponse.error?.message}`);
        }

        const customerId = customerResponse.transactionId;
        console.log(`Created Customer ID: ${customerId}`);

        // 5. Create a Payment Intent (Order)
        // The amount should be in the currency's standard unit (e.g., 20.00 USD).
        // The adapter handles conversion to cents/smallest units.
        const paymentIntentResponse = await paymentProcessor.createPaymentIntent({
            amount: 49.99,
            currency: 'USD',
            description: 'Premium Subscription',
            customerId: customerId, // Attach the customer we just created
            metadata: {
                orderId: 'order_98765',
                // IMPORTANT: Pass these IDs so they are available in webhooks
                vendorId: 'vendor_uuid_here',
                assessmentId: 'assessment_uuid_here',
            },
        });

        if (!paymentIntentResponse.success) {
            throw new Error(`Payment creation failed: ${paymentIntentResponse.error?.message}`);
        }

        console.log('Payment Intent Created:', paymentIntentResponse.data);

        // For Stripe: Pass `clientSecret` to the frontend.
        // For Razorpay: Pass `order_id` to the frontend.

        // --- SCENARIO B: Guest Checkout (No Customer Created) ---

        const guestPaymentResponse = await paymentProcessor.createPaymentIntent({
            amount: 25.00,
            currency: 'USD',
            description: 'One-time Purchase',
            customerEmail: 'guest@example.com', // Optional: Used for receipts
            metadata: {
                orderId: 'guest_order_111',
            },
        });

        if (guestPaymentResponse.success) {
            console.log('Guest Payment Intent Created:', guestPaymentResponse.data);
        }

    } catch (error) {
        console.error('Example Flow Error:', error);
    }
}

/**
 * Example of handling a webhook
 */
export async function exampleWebhookHandler(payload: any, signature: string, gateway: string) {
    const config = getPaymentConfig(gateway);
    const processor = PaymentProcessorFactory.getProcessor(gateway, config);

    // Verify the event is from the gateway
    const verification = await processor.verifyWebhookEvent(payload, signature);

    // Log the raw event to the database for audit/debugging
    // Ensure you have run migrated the db to have PaymentLog table
    try {
        await prisma.paymentLog.create({
            data: {
                gateway,
                event: verification.success ? (verification.data.type || 'unknown') : 'verification_failed',
                payload: payload as any,
                paymentId: undefined, // Link to payment if available in payload logic
            }
        });
    } catch (e) {
        console.error("Failed to log payment webhook:", e);
    }


    if (verification.success) {
        console.log('Webhook verified:', verification.data);
        const event = verification.data;

        // --- Example: Create Payment Record on Success ---
        // Adapters standardize the webhook verification but payload structure varies.
        // You would typically normalize this or handle per-gateway.

        // Simplified Logic for Stripe 'payment_intent.succeeded'
        if (gateway === PaymentGateway.STRIPE && event.type === 'payment_intent.succeeded') {
            const paymentIntent = event.data.object;
            const metadata = paymentIntent.metadata || {};

            // Ensure we have required IDs from metadata passed during creation
            if (metadata.vendorId && metadata.assessmentId) {
                try {
                    await prisma.payment.create({
                        data: {
                            amount: paymentIntent.amount / 100, // Convert cents to dollars
                            status: 'COMPLETED', // Use enum if imported
                            paymentMethod: 'stripe',
                            vendorId: metadata.vendorId,
                            assessmentId: metadata.assessmentId,
                            // assessorId: metadata.assessorId (optional)
                        }
                    });
                    console.log("Payment record created successfully.");
                } catch (e) {
                    console.error("Failed to create payment record:", e);
                }
            }
        }

        // Similar logic for Razorpay 'order.paid' or 'payment.captured'...

    } else {
        console.error('Invalid Webhook Signature');
    }
}
