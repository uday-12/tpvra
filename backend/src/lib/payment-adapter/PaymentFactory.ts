import type { IPaymentProcessor } from './IPaymentProcessor';
import type { PaymentConfig } from './types';
import { StripeProvider } from './providers/StripeProvider';
import { RazorpayProvider } from './providers/RazorpayProvider';

export class PaymentProcessorFactory {
    private static processors: Map<string, new (config: PaymentConfig) => IPaymentProcessor> = new Map();

    // Register default processors
    static {
        this.registerProcessor('stripe', StripeProvider);
        this.registerProcessor('razorpay', RazorpayProvider);
    }

    /**
     * Register a new processor class.
     */
    static registerProcessor(name: string, processorClass: new (config: PaymentConfig) => IPaymentProcessor): void {
        this.processors.set(name.toLowerCase(), processorClass);
    }

    /**
     * Get an instance of a processor.
     */
    static getProcessor(name: string, config: PaymentConfig): IPaymentProcessor {
        const ProcessorClass = this.processors.get(name.toLowerCase());
        if (!ProcessorClass) {
            throw new Error(`Payment processor '${name}' not found.`);
        }
        return new ProcessorClass(config);
    }
}
