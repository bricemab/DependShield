import { Controller, Post, Body, Headers, Req, Res, UseGuards, BadRequestException, ForbiddenException, Get, Query } from '@nestjs/common';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request, Response } from 'express';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../organizations/organization.entity';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';

@Controller('billing')
export class BillingController {
    constructor(
        private readonly stripeService: StripeService,
        @InjectRepository(Organization)
        private organizationsRepository: Repository<Organization>,
        private configService: ConfigService,
        private usersService: UsersService,
    ) { }

    @Post('checkout')
    @UseGuards(JwtAuthGuard)
    async createCheckoutSession(@Body() body: { plan: string, organizationId: number }, @Req() req) {
        const { plan, organizationId } = body;

        let priceId: string;
        if (plan === 'PRO') {
            priceId = this.configService.get<string>('stripe.priceIdPro');
        }

        if (!priceId) {
            throw new BadRequestException('Invalid plan or missing price configuration');
        }

        const org = await this.organizationsRepository.findOne({ where: { id: organizationId } });
        if (!org) throw new BadRequestException('Organization not found');

        const userId = req.user.userId;

        // Auto-claim ownership if not set
        if (!org.ownerId) {
            org.ownerId = userId;
            await this.organizationsRepository.save(org);
        }

        if (org.ownerId !== userId) {
            throw new ForbiddenException('Only the organization owner can manage billing.');
        }

        let customerId = org.stripeCustomerId;
        if (!customerId) {
            const user = await this.usersService.findOne(userId);
            const email = user.email || `org_${organizationId}_admin@dependshield.com`;

            const existingCustomer = await this.stripeService.findCustomerByEmail(email);

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const customer = await this.stripeService.createCustomer(
                    email,
                    org.name
                );
                customerId = customer.id;
            }
            org.stripeCustomerId = customerId;
            await this.organizationsRepository.save(org);
        }

        const session = await this.stripeService.createCheckoutSession(
            customerId,
            priceId,
            `${process.env.FRONTEND_URL}/settings/billing?success=true`,
            `${process.env.FRONTEND_URL}/settings/billing?canceled=true`
        );

        return { url: session.url };
    }

    @Post('portal')
    @UseGuards(JwtAuthGuard)
    async createPortalSession(@Body() body: { organizationId: number }, @Req() req) {
        const { organizationId } = body;

        const org = await this.organizationsRepository.findOne({ where: { id: organizationId } });
        if (!org) throw new BadRequestException('Organization not found');

        const userId = req.user.userId;

        // Auto-claim ownership if not set
        if (!org.ownerId) {
            org.ownerId = userId;
            await this.organizationsRepository.save(org);
        }

        if (org.ownerId !== userId) {
            throw new ForbiddenException('Only the organization owner can manage billing.');
        }

        if (!org.stripeCustomerId) {
            const user = await this.usersService.findOne(userId);
            const email = user.email || `org_${organizationId}_admin@dependshield.com`;

            // Check if exists in Stripe first
            const existingCustomer = await this.stripeService.findCustomerByEmail(email);

            if (existingCustomer) {
                org.stripeCustomerId = existingCustomer.id;
            } else {
                // Create customer
                const customer = await this.stripeService.createCustomer(
                    email,
                    org.name
                );
                org.stripeCustomerId = customer.id;
            }
            await this.organizationsRepository.save(org);
        }

        const session = await this.stripeService.createPortalSession(
            org.stripeCustomerId,
            `${process.env.FRONTEND_URL}/settings/billing`
        );

        return { url: session.url };
    }

    @Post('webhook')
    async handleWebhook(@Req() req: Request, @Headers('stripe-signature') signature: string) {
        let event: Stripe.Event;

        try {
            const rawBody = (req as any).rawBody;
            event = this.stripeService.constructEvent(rawBody, signature);
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            throw new BadRequestException(`Webhook Error: ${err.message}`);
        }

        const dataObject = event.data.object as any;
        console.log(`[Webhook] Received event: ${event.type}`);

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                console.log(`[Webhook] Processing checkout.session.completed. Mode: ${dataObject.mode}`);
                if (dataObject.mode === 'subscription') {
                    const customerId = dataObject.customer;
                    const subscriptionId = dataObject.subscription;
                    console.log(`[Webhook] Customer ID: ${customerId}, Subscription ID: ${subscriptionId}`);

                    const org = await this.organizationsRepository.findOne({ where: { stripeCustomerId: customerId } });
                    console.log(`[Webhook] Found Org: ${org ? org.id : 'NONE'}`);

                    if (org) {
                        org.subscriptionId = subscriptionId;
                        org.subscriptionStatus = 'active';
                        org.plan = 'PRO' as any;
                        const saved = await this.organizationsRepository.save(org);
                        console.log(`[Webhook] Updated Org ${org.id} to PRO. Saved:`, saved);
                    } else {
                        console.error(`[Webhook] Organization not found for customer ${customerId}`);
                    }
                }
                break;

            case 'invoice.payment_succeeded':
                console.log(`[Webhook] Invoice payment succeeded for customer ${dataObject.customer}`);
                // Implementation...
                break;

            case 'customer.subscription.deleted':
                console.log(`[Webhook] Subscription deleted for customer ${dataObject.customer}`);
                // Implementation...
                break;

            case 'customer.subscription.updated':
                console.log(`[Webhook] Subscription updated for customer ${dataObject.customer}.Status: ${dataObject.status} `);
                // Implementation...
                break;

            default:
                console.log(`[Webhook] Unhandled event type ${event.type
                    }`);
        }

        return { received: true };
    }
}
