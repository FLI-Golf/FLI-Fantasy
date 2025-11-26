# FLI Golf Shop - E-Commerce Setup Guide

## Overview

The FLI Golf Shop supports three product types:
1. **Clothing** - Apparel and merchandise (t-shirts, hoodies, hats)
2. **Tickets** - Event tickets and tournament passes
3. **Fantasy Leagues** - Premium fantasy league features

All payments are processed through Stripe.

## Database Collections

### Created Collections (7 total)

1. **product_categories** - Organize products into categories
2. **products** - All products (clothing, tickets, fantasy leagues)
3. **product_variants** - Size/color variations for products
4. **shipping_addresses** - Customer shipping information
5. **orders** - Customer orders
6. **order_items** - Individual items in orders
7. **payments** - Payment transactions (Stripe)

## Quick Start

### 1. Set Up Stripe

1. Create a Stripe account at [stripe.com](https://stripe.com)
2. Get your API keys from the Stripe Dashboard
3. Add to your `.env` file:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   ```

### 2. Create Product Categories

Example categories:
- Apparel
- Accessories
- Event Tickets
- Fantasy Leagues

### 3. Add Products

#### Example: T-Shirt (Clothing)
```javascript
{
  name: "FLI Golf Tour T-Shirt",
  slug: "fli-golf-tour-tshirt",
  description: "Official FLI Golf Tour t-shirt...",
  category: "apparel_category_id",
  product_type: "clothing",
  price: 2999, // $29.99 in cents
  requires_shipping: true,
  is_active: true,
  is_featured: true
}
```

#### Example: Event Ticket
```javascript
{
  name: "FLI Golf Championship - VIP Pass",
  slug: "championship-vip-pass",
  description: "VIP access to the championship...",
  category: "tickets_category_id",
  product_type: "ticket",
  price: 15000, // $150.00
  stock_quantity: 100,
  requires_shipping: false,
  is_active: true
}
```

#### Example: Fantasy League
```javascript
{
  name: "Premium Fantasy League",
  slug: "premium-fantasy-league",
  description: "Unlock premium features...",
  category: "fantasy_category_id",
  product_type: "fantasy_league",
  price: 999, // $9.99
  requires_shipping: false,
  is_active: true
}
```

### 4. Add Product Variants (for clothing)

```javascript
{
  product: "tshirt_product_id",
  name: "Large - Blue",
  size: "L",
  color: "Blue",
  sku: "FLIGOLF-TSHIRT-L-BLUE",
  stock_quantity: 50,
  is_active: true
}
```

## Stripe Integration

### Checkout Flow

1. **User adds items to cart** (frontend state)
2. **Create order in PocketBase**
   ```javascript
   const order = await pb.collection('orders').create({
     order_number: generateOrderNumber(),
     user: currentUser.id,
     email: currentUser.email,
     status: 'pending',
     subtotal: calculateSubtotal(),
     tax: calculateTax(),
     shipping_cost: calculateShipping(),
     total: calculateTotal(),
     currency: 'usd'
   });
   ```

3. **Create Stripe Checkout Session**
   ```javascript
   const session = await stripe.checkout.sessions.create({
     payment_method_types: ['card'],
     line_items: cartItems.map(item => ({
       price_data: {
         currency: 'usd',
         product_data: {
           name: item.name,
           images: [item.image]
         },
         unit_amount: item.price
       },
       quantity: item.quantity
     })),
     mode: 'payment',
     success_url: `${YOUR_DOMAIN}/order/success?session_id={CHECKOUT_SESSION_ID}`,
     cancel_url: `${YOUR_DOMAIN}/cart`,
     metadata: {
       order_id: order.id
     }
   });
   ```

4. **Redirect to Stripe Checkout**
   ```javascript
   window.location.href = session.url;
   ```

5. **Handle Webhook** (server-side)
   ```javascript
   // Verify webhook signature
   const event = stripe.webhooks.constructEvent(
     request.body,
     signature,
     webhookSecret
   );

   if (event.type === 'checkout.session.completed') {
     const session = event.data.object;
     
     // Update order status
     await pb.collection('orders').update(session.metadata.order_id, {
       status: 'processing',
       stripe_payment_intent_id: session.payment_intent,
       paid_at: new Date().toISOString()
     });
     
     // Create payment record
     await pb.collection('payments').create({
       order: session.metadata.order_id,
       stripe_payment_intent_id: session.payment_intent,
       amount: session.amount_total,
       currency: session.currency,
       status: 'succeeded'
     });
   }
   ```

### Webhook Events to Handle

- `checkout.session.completed` - Payment successful
- `payment_intent.succeeded` - Payment confirmed
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Refund processed

## API Endpoints to Create

### Products
- `GET /api/products` - List all active products
- `GET /api/products/:slug` - Get product details
- `GET /api/products/category/:slug` - Products by category

### Cart & Checkout
- `POST /api/checkout` - Create Stripe checkout session
- `GET /api/order/:id` - Get order details

### Webhooks
- `POST /api/webhooks/stripe` - Handle Stripe webhooks

## Security Considerations

1. **Never expose Stripe secret keys** in frontend code
2. **Verify webhook signatures** to prevent fraud
3. **Store minimal payment data** - let Stripe handle sensitive info
4. **Use HTTPS** for all payment-related endpoints
5. **Validate order totals** server-side before creating Stripe session

## Testing

### Test Mode
Use Stripe test cards:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3D Secure: `4000 0025 0000 3155`

### Test Webhooks
Use Stripe CLI to forward webhooks to localhost:
```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

## Next Steps

1. ✅ Database collections created
2. ⏳ Set up Stripe account
3. ⏳ Create product categories in PocketBase admin
4. ⏳ Add products
5. ⏳ Implement checkout flow
6. ⏳ Set up webhook endpoint
7. ⏳ Test with Stripe test cards
8. ⏳ Go live with real Stripe keys

## Resources

- [Stripe Documentation](https://stripe.com/docs)
- [Stripe Checkout](https://stripe.com/docs/payments/checkout)
- [Stripe Webhooks](https://stripe.com/docs/webhooks)
- [PocketBase Documentation](https://pocketbase.io/docs/)
