# Stripe Integration Guide

## Setup Complete ✅

Your Stripe test account is now integrated with the FLI Golf Shop!

### Environment Variables

```bash
STRIPE_SECRET_KEY=sk_test_51SXtbSCvrUeGzPZk35C4Aqh5efU7CmR53IFFSresOtuZ9b0dyIWuKSrQ82gImzUMKynuDX4dDkrXifKxzljbWAaa00JK9SL5PU
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51SXtbSCvrUeGzPZkKSAly9kKFdoZ3RCJfgKppDNSeLRg4ANIcCnPkVEdQvISp9squdp1ZM9TmILfR9wBcIJPnD7w00xtiQ17Oe
```

### Installed Packages

- `stripe` - Server-side Stripe SDK
- `@stripe/stripe-js` - Client-side Stripe SDK

### Files Created

1. **`src/lib/stripe.ts`** - Client-side Stripe utilities
2. **`src/lib/server/stripe.ts`** - Server-side Stripe utilities

---

## Test Cards

Use these cards in your Stripe test environment:

### Successful Payment
```
Card Number: 4242 4242 4242 4242
Expiry: 12/34 (any future date)
CVC: 123 (any 3 digits)
ZIP: 12345 (any 5 digits)
```

### Declined Payment
```
Card Number: 4000 0000 0000 0002
```

### Requires 3D Secure Authentication
```
Card Number: 4000 0025 0000 3155
```

---

## Quick Start Examples

### 1. Create a Checkout Session (Server-side)

Create a file: `src/routes/api/checkout/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { createCheckoutSession } from '$lib/server/stripe';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, url }) => {
	const { items } = await request.json();
	
	// Create line items for Stripe
	const lineItems = items.map((item: any) => ({
		price_data: {
			currency: 'usd',
			product_data: {
				name: item.name,
				images: item.images || []
			},
			unit_amount: item.price // Price in cents
		},
		quantity: item.quantity
	}));
	
	// Create checkout session
	const session = await createCheckoutSession({
		lineItems,
		successUrl: `${url.origin}/order/success?session_id={CHECKOUT_SESSION_ID}`,
		cancelUrl: `${url.origin}/cart`,
		customerEmail: 'customer@example.com', // Optional
		metadata: {
			orderId: 'order_123' // Your order ID
		}
	});
	
	return json({ sessionId: session.id });
};
```

### 2. Redirect to Checkout (Client-side)

In your Svelte component:

```svelte
<script lang="ts">
	import { redirectToCheckout } from '$lib/stripe';
	
	async function handleCheckout() {
		try {
			// Call your API to create checkout session
			const response = await fetch('/api/checkout', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					items: [
						{
							name: 'FLI Golf T-Shirt',
							price: 2999, // $29.99 in cents
							quantity: 1,
							images: ['https://example.com/image.jpg']
						}
					]
				})
			});
			
			const { sessionId } = await response.json();
			
			// Redirect to Stripe Checkout
			await redirectToCheckout(sessionId);
		} catch (error) {
			console.error('Checkout error:', error);
		}
	}
</script>

<button onclick={handleCheckout}>
	Checkout with Stripe
</button>
```

### 3. Handle Webhook Events (Server-side)

Create a file: `src/routes/api/webhooks/stripe/+server.ts`

```typescript
import { json } from '@sveltejs/kit';
import { verifyWebhookSignature } from '$lib/server/stripe';
import { pb } from '$lib/pocketbase';
import type { RequestHandler } from './$types';

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.text();
	const signature = request.headers.get('stripe-signature');
	
	if (!signature) {
		return json({ error: 'No signature' }, { status: 400 });
	}
	
	try {
		// Verify webhook signature
		const event = verifyWebhookSignature(body, signature, WEBHOOK_SECRET);
		
		// Handle different event types
		switch (event.type) {
			case 'checkout.session.completed': {
				const session = event.data.object;
				
				// Update order in PocketBase
				await pb.collection('orders').update(session.metadata.orderId, {
					status: 'processing',
					stripe_payment_intent_id: session.payment_intent,
					paid_at: new Date().toISOString()
				});
				
				// Create payment record
				await pb.collection('payments').create({
					order: session.metadata.orderId,
					stripe_payment_intent_id: session.payment_intent,
					amount: session.amount_total,
					currency: session.currency,
					status: 'succeeded'
				});
				
				break;
			}
			
			case 'payment_intent.succeeded': {
				const paymentIntent = event.data.object;
				console.log('Payment succeeded:', paymentIntent.id);
				break;
			}
			
			case 'payment_intent.payment_failed': {
				const paymentIntent = event.data.object;
				console.log('Payment failed:', paymentIntent.id);
				break;
			}
		}
		
		return json({ received: true });
	} catch (error: any) {
		console.error('Webhook error:', error.message);
		return json({ error: error.message }, { status: 400 });
	}
};
```

---

## Testing Webhooks Locally

### Install Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from: https://stripe.com/docs/stripe-cli
```

### Forward Webhooks to Local Server

```bash
# Login to Stripe
stripe login

# Forward webhooks
stripe listen --forward-to localhost:5173/api/webhooks/stripe

# This will give you a webhook signing secret (whsec_...)
# Add it to your .env file:
# STRIPE_WEBHOOK_SECRET=whsec_...
```

### Trigger Test Events

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test checkout completion
stripe trigger checkout.session.completed
```

---

## Production Setup

When ready to go live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Get Live API Keys** (starts with `pk_live_` and `sk_live_`)
3. **Update Environment Variables** with live keys
4. **Set up Production Webhook** endpoint
5. **Test with Real Cards** (small amounts first!)

---

## Security Best Practices

✅ **Never expose secret key** in client-side code  
✅ **Always verify webhook signatures** to prevent fraud  
✅ **Use HTTPS** in production  
✅ **Validate amounts server-side** before creating checkout  
✅ **Store minimal payment data** - let Stripe handle sensitive info  
✅ **Use idempotency keys** for critical operations  
✅ **Log all webhook events** for debugging  

---

## Useful Links

- [Stripe Dashboard](https://dashboard.stripe.com/test/dashboard)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Stripe Checkout Docs](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks Guide](https://stripe.com/docs/webhooks)
- [Test Cards](https://stripe.com/docs/testing)

---

## Next Steps

1. ✅ Stripe account created
2. ✅ API keys added to `.env`
3. ✅ Stripe packages installed
4. ✅ Utility files created
5. ⏳ Create checkout API endpoint
6. ⏳ Build product pages
7. ⏳ Implement shopping cart
8. ⏳ Test checkout flow
9. ⏳ Set up webhooks
10. ⏳ Go live!
