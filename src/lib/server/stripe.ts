/**
 * Server-side Stripe Configuration
 * 
 * IMPORTANT: This file should only be imported in server-side code
 * (e.g., +page.server.ts, +server.ts, hooks.server.ts)
 * 
 * Never import this in client-side code as it contains the secret key
 */

import Stripe from 'stripe';

// Get secret key from environment
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

// Initialize Stripe with secret key (or placeholder during build)
export const stripe = STRIPE_SECRET_KEY 
	? new Stripe(STRIPE_SECRET_KEY, {
			apiVersion: '2024-11-20.acacia',
			typescript: true
		})
	: null as any; // Placeholder during build - will throw at runtime if used without key

/**
 * Create a Stripe Checkout Session
 * 
 * @param params - Checkout session parameters
 * @returns Stripe checkout session
 */
export async function createCheckoutSession(params: {
	lineItems: Stripe.Checkout.SessionCreateParams.LineItem[];
	successUrl: string;
	cancelUrl: string;
	customerEmail?: string;
	metadata?: Record<string, string>;
}) {
	const session = await stripe.checkout.sessions.create({
		payment_method_types: ['card'],
		line_items: params.lineItems,
		mode: 'payment',
		success_url: params.successUrl,
		cancel_url: params.cancelUrl,
		customer_email: params.customerEmail,
		metadata: params.metadata,
		shipping_address_collection: {
			allowed_countries: ['US', 'CA']
		}
	});

	return session;
}

/**
 * Verify Stripe webhook signature
 * 
 * @param payload - Raw request body
 * @param signature - Stripe signature header
 * @param webhookSecret - Webhook secret from Stripe dashboard
 * @returns Verified Stripe event
 */
export function verifyWebhookSignature(
	payload: string | Buffer,
	signature: string,
	webhookSecret: string
): Stripe.Event {
	return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

/**
 * Create a Stripe Product
 * 
 * @param params - Product parameters
 * @returns Stripe product
 */
export async function createStripeProduct(params: {
	name: string;
	description?: string;
	images?: string[];
	metadata?: Record<string, string>;
}) {
	return await stripe.products.create({
		name: params.name,
		description: params.description,
		images: params.images,
		metadata: params.metadata
	});
}

/**
 * Create a Stripe Price
 * 
 * @param params - Price parameters
 * @returns Stripe price
 */
export async function createStripePrice(params: {
	productId: string;
	unitAmount: number;
	currency?: string;
}) {
	return await stripe.prices.create({
		product: params.productId,
		unit_amount: params.unitAmount,
		currency: params.currency || 'usd'
	});
}

/**
 * Retrieve a payment intent
 * 
 * @param paymentIntentId - Payment intent ID
 * @returns Payment intent
 */
export async function getPaymentIntent(paymentIntentId: string) {
	return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Create a refund
 * 
 * @param chargeId - Charge ID to refund
 * @param amount - Amount to refund in cents (optional, full refund if not provided)
 * @returns Refund object
 */
export async function createRefund(chargeId: string, amount?: number) {
	return await stripe.refunds.create({
		charge: chargeId,
		amount
	});
}
