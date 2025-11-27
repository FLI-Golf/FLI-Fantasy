/**
 * Stripe Webhook Handler
 * 
 * Handles incoming webhook events from Stripe
 * Events include: payment success, payment failure, refunds, etc.
 * 
 * Endpoint: POST /api/webhooks/stripe
 */

import { json } from '@sveltejs/kit';
import { verifyWebhookSignature } from '$lib/server/stripe';
import PocketBase from 'pocketbase';
import type { RequestHandler } from './$types';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';
const POCKETBASE_URL = process.env.VITE_POCKETBASE_URL || 'http://127.0.0.1:8090';

// Initialize PocketBase for server-side operations
const pb = new PocketBase(POCKETBASE_URL);

export const POST: RequestHandler = async ({ request }) => {
	console.log('📨 Received Stripe webhook');
	
	// Get raw body and signature
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');
	
	if (!signature) {
		console.error('❌ No Stripe signature found');
		return json({ error: 'No signature provided' }, { status: 400 });
	}
	
	if (!WEBHOOK_SECRET) {
		console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
		return json({ error: 'Webhook secret not configured' }, { status: 500 });
	}
	
	try {
		// Verify the webhook signature
		const event = verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
		
		console.log(`✅ Verified webhook event: ${event.type}`);
		
		// Handle different event types
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object as any;
				console.log('💳 Checkout session completed:', session.id);
				
				// Get order ID from metadata
				const orderId = session.metadata?.orderId;
				
				if (orderId) {
					try {
						// Update order status
						await pb.collection('orders').update(orderId, {
							status: 'processing',
							stripe_payment_intent_id: session.payment_intent,
							stripe_checkout_session_id: session.id,
							paid_at: new Date().toISOString()
						});
						
						console.log(`✅ Updated order ${orderId} to processing`);
						
						// Create payment record
						await pb.collection('payments').create({
							order: orderId,
							stripe_payment_intent_id: session.payment_intent,
							amount: session.amount_total,
							currency: session.currency,
							status: 'succeeded',
							payment_method: session.payment_method_types?.[0] || 'card'
						});
						
						console.log(`✅ Created payment record for order ${orderId}`);
					} catch (error: any) {
						console.error('❌ Error updating order:', error.message);
					}
				} else {
					console.warn('⚠️  No orderId in session metadata');
				}
				
				break;
			}
			
			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object as any;
				console.log('✅ Payment succeeded:', paymentIntent.id);
				
				// Update payment record if it exists
				try {
					const payments = await pb.collection('payments').getFullList({
						filter: `stripe_payment_intent_id = "${paymentIntent.id}"`
					});
					
					if (payments.length > 0) {
						await pb.collection('payments').update(payments[0].id, {
							status: 'succeeded',
							stripe_charge_id: paymentIntent.latest_charge,
							payment_method: paymentIntent.payment_method_types?.[0] || 'card'
						});
						
						console.log(`✅ Updated payment record ${payments[0].id}`);
					}
				} catch (error: any) {
					console.error('❌ Error updating payment:', error.message);
				}
				
				break;
			}
			
			case 'payment_intent.payment_failed': {
				const paymentIntent = event.data.object as any;
				console.log('❌ Payment failed:', paymentIntent.id);
				
				// Update payment record
				try {
					const payments = await pb.collection('payments').getFullList({
						filter: `stripe_payment_intent_id = "${paymentIntent.id}"`
					});
					
					if (payments.length > 0) {
						await pb.collection('payments').update(payments[0].id, {
							status: 'failed'
						});
						
						// Update order status
						const payment = payments[0];
						await pb.collection('orders').update(payment.order, {
							status: 'cancelled'
						});
						
						console.log(`✅ Updated payment and order to failed/cancelled`);
					}
				} catch (error: any) {
					console.error('❌ Error updating failed payment:', error.message);
				}
				
				break;
			}
			
			case 'charge.refunded': {
				const charge = event.data.object as any;
				console.log('💰 Charge refunded:', charge.id);
				
				// Update payment record with refund info
				try {
					const payments = await pb.collection('payments').getFullList({
						filter: `stripe_charge_id = "${charge.id}"`
					});
					
					if (payments.length > 0) {
						await pb.collection('payments').update(payments[0].id, {
							status: 'refunded',
							refund_amount: charge.amount_refunded,
							refunded_at: new Date().toISOString()
						});
						
						// Update order status
						const payment = payments[0];
						await pb.collection('orders').update(payment.order, {
							status: 'refunded'
						});
						
						console.log(`✅ Updated payment and order to refunded`);
					}
				} catch (error: any) {
					console.error('❌ Error updating refund:', error.message);
				}
				
				break;
			}
			
			default:
				console.log(`ℹ️  Unhandled event type: ${event.type}`);
		}
		
		// Return success response
		return json({ received: true, type: event.type });
		
	} catch (error: any) {
		console.error('❌ Webhook error:', error.message);
		return json({ error: error.message }, { status: 400 });
	}
};
