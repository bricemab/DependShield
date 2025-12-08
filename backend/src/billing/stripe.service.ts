import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe;

    constructor(private configService: ConfigService) {
        this.stripe = new Stripe(this.configService.get<string>('STRIPE_SECRET_KEY'), {
            apiVersion: '2025-02-24.acacia' as any, // Cast to avoid TS check if SDK definitions are outdated in lockfile
        });
    }

    async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
        return this.stripe.customers.create({
            email,
            name,
        });
    }

    async findCustomerByEmail(email: string): Promise<Stripe.Customer | undefined> {
        const customers = await this.stripe.customers.list({
            email,
            limit: 1,
        });
        if (customers.data.length > 0) {
            return customers.data[0];
        }
        return undefined;
    }

    async createCheckoutSession(
        customerId: string,
        priceId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            success_url: successUrl,
            cancel_url: cancelUrl,
        });
    }

    async createPortalSession(
        customerId: string,
        returnUrl: string,
    ): Promise<Stripe.BillingPortal.Session> {
        return this.stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl,
        });
    }

    constructEvent(
        payload: Buffer,
        signature: string,
    ): Stripe.Event {
        return this.stripe.webhooks.constructEvent(
            payload,
            signature,
            this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
        );
    }

    async getInvoices(customerId: string): Promise<Stripe.Invoice[]> {
        const invoices = await this.stripe.invoices.list({
            customer: customerId,
            limit: 10,
        });
        return invoices.data;
    }
}
