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

    private async ensureStripeCustomer(org: Organization, userId: number): Promise<string> {
        if (org.stripeCustomerId) {
            return org.stripeCustomerId;
        }

        const user = await this.usersService.findOne(userId);
        // Use user's email or fallback to generated one
        // Note: Logic here prioritizes finding ANY existing customer with that email in Stripe
        // to avoid duplicates if DB was reset but Stripe wasn't.
        const email = user.email || `org_${org.id}_admin@dependshield.com`;

        let customerId: string;
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

        // Save linkage
        org.stripeCustomerId = customerId;
        await this.organizationsRepository.save(org);

        return customerId;
    }

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

        const customerId = await this.ensureStripeCustomer(org, userId);

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

        const customerId = await this.ensureStripeCustomer(org, userId);

        const session = await this.stripeService.createPortalSession(
            customerId,
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
                const orgDeleted = await this.organizationsRepository.findOne({ where: { stripeCustomerId: dataObject.customer } });
                if (orgDeleted) {
                    orgDeleted.plan = 'STARTER' as any;
                    orgDeleted.subscriptionStatus = 'canceled';
                    orgDeleted.subscriptionId = null;
                    await this.organizationsRepository.save(orgDeleted);
                    console.log(`[Webhook] Downgraded Org ${orgDeleted.id} to STARTER.`);
                }
                break;

            case 'customer.subscription.updated':
                console.log(`[Webhook] Subscription updated for customer ${dataObject.customer}. Status: ${dataObject.status}`);
                const orgUpdated = await this.organizationsRepository.findOne({ where: { stripeCustomerId: dataObject.customer } });
                if (orgUpdated) {
                    orgUpdated.subscriptionStatus = dataObject.status;
                    // Optionally check for plan changes if you support multiple paid tiers
                    await this.organizationsRepository.save(orgUpdated);
                    console.log(`[Webhook] Updated subscription status for Org ${orgUpdated.id} to ${dataObject.status}`);
                }
                break;

            default:
                console.log(`[Webhook] Unhandled event type ${event.type}`);
        }

        return { received: true };
    }

    @Get('invoices')
    @UseGuards(JwtAuthGuard)
    async getInvoices(@Query('organizationId') organizationId: number, @Req() req) {
        console.log(`[Billing] Get Invoices for Org ${organizationId}`);
        if (!organizationId) throw new BadRequestException('Organization ID is required');

        const org = await this.organizationsRepository.findOne({ where: { id: organizationId } });
        if (!org) throw new BadRequestException('Organization not found');

        const userId = req.user.userId;
        console.log(`[Billing] User ${userId} requesting invoices for Org ${org.id} (Owner: ${org.ownerId})`);

        // Check permission (Owner only for now to match other billing logic)
        if (org.ownerId && org.ownerId !== userId) {
            throw new ForbiddenException('Only the organization owner can view invoices.');
        }

        // Logic refined: ensureStripeCustomer will now FIND the customer if it exists in Stripe
        // even if it's not yet saved in the DB.
        const customerId = await this.ensureStripeCustomer(org, userId);
        console.log(`[Billing] Resolved Stripe Customer ID: ${customerId}`);

        console.log(`[Billing] Fetching invoices for Customer ${customerId}`);
        const invoices = await this.stripeService.getInvoices(customerId);
        console.log(`[Billing] Found ${invoices.length} invoices`);
        return invoices;
    }
}
