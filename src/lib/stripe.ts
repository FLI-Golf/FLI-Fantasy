/**
 * Stripe Client Configuration
 * 
 * Frontend Stripe integration using @stripe/stripe-js
 * Only uses the publishable key (safe for client-side)
 */

import { loadStripe } from '@stripe/stripe-js';
import { browser } from '$app/environment';

// Get publishable key from environment
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

if (!stripePublishableKey) {
	console.warn('⚠️  Stripe publishable key not found. Set VITE_STRIPE_PUBLISHABLE_KEY in .env');
}

// Initialize Stripe (only in browser)
export const stripePromise = browser && stripePublishableKey 
	? loadStripe(stripePublishableKey)
	: null;

/**
 * Redirect to Stripe Checkout
 * @param sessionId - Stripe checkout session ID from server
 */
export async function redirectToCheckout(sessionId: string) {
	const stripe = await stripePromise;
	
	if (!stripe) {
		throw new Error('Stripe not initialized');
	}
	
	const { error } = await stripe.redirectToCheckout({ sessionId });
	
	if (error) {
		console.error('Stripe checkout error:', error);
		throw error;
	}
}
