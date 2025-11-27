# Stripe Webhook Setup Guide

## Overview

Webhooks allow Stripe to notify your application when events happen (payments succeed, fail, refunds, etc.). Your webhook endpoint is already created at:

**`/api/webhooks/stripe`**

## Local Development Setup

### Step 1: Install Stripe CLI

**macOS:**
```bash
brew install stripe/stripe-cli/stripe
```

**Linux:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases/latest
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz
sudo mv stripe /usr/local/bin/
```

**Windows:**
```bash
# Download from https://github.com/stripe/stripe-cli/releases/latest
# Or use Scoop:
scoop install stripe
```

### Step 2: Login to Stripe CLI

```bash
stripe login
```

This will open your browser to authenticate with your Stripe account.

### Step 3: Forward Webhooks to Local Server

```bash
# Start your dev server first
pnpm run dev

# In another terminal, forward webhooks
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_xxxxxxxxxxxxx (^C to quit)
```

### Step 4: Add Webhook Secret to .env

Copy the webhook signing secret and add it to your `.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### Step 5: Test the Webhook

In another terminal, trigger a test event:

```bash
# Test successful payment
stripe trigger payment_intent.succeeded

# Test checkout completion
stripe trigger checkout.session.completed
```

Check your dev server logs to see the webhook events being processed!

---

## Production Setup

### Step 1: Deploy Your Application

Make sure your application is deployed and accessible via HTTPS.

### Step 2: Add Webhook Endpoint in Stripe Dashboard

1. Go to [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click **"Add endpoint"**
3. Enter your endpoint URL:
   ```
   https://yourdomain.com/api/webhooks/stripe
   ```
4. Select events to listen to:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`

5. Click **"Add endpoint"**

### Step 3: Get Webhook Signing Secret

1. Click on your newly created webhook endpoint
2. Click **"Reveal"** under "Signing secret"
3. Copy the secret (starts with `whsec_`)

### Step 4: Add Secret to Production Environment

Add the webhook secret to your production environment variables:

```bash
STRIPE_WEBHOOK_SECRET=whsec_production_secret_here
```

**For Railway/Vercel/Netlify:**
- Go to your project settings
- Add environment variable: `STRIPE_WEBHOOK_SECRET`
- Redeploy your application

---

## Webhook Events Handled

Your webhook endpoint handles these events:

### 1. `checkout.session.completed`
**When:** Customer completes checkout
**Action:**
- Updates order status to "processing"
- Records payment intent ID
- Creates payment record
- Marks order as paid

### 2. `payment_intent.succeeded`
**When:** Payment is successfully processed
**Action:**
- Updates payment record status to "succeeded"
- Records charge ID and payment method

### 3. `payment_intent.payment_failed`
**When:** Payment fails
**Action:**
- Updates payment status to "failed"
- Updates order status to "cancelled"

### 4. `charge.refunded`
**When:** A charge is refunded
**Action:**
- Updates payment status to "refunded"
- Records refund amount and timestamp
- Updates order status to "refunded"

---

## Testing Webhooks

### Test with Stripe CLI

```bash
# Successful payment
stripe trigger payment_intent.succeeded

# Failed payment
stripe trigger payment_intent.payment_failed

# Checkout completed
stripe trigger checkout.session.completed

# Refund
stripe trigger charge.refunded
```

### Test with Real Checkout

1. Create a test product
2. Go through checkout with test card: `4242 4242 4242 4242`
3. Complete payment
4. Check your logs to see webhook events

### View Webhook Logs

**In Stripe Dashboard:**
1. Go to **Developers** → **Webhooks**
2. Click on your endpoint
3. View **"Logs"** tab to see all webhook attempts

---

## Troubleshooting

### Webhook Not Receiving Events

**Check:**
1. ✅ Webhook endpoint is accessible (test with curl)
2. ✅ HTTPS is enabled (required for production)
3. ✅ Webhook secret is correct in environment variables
4. ✅ Events are selected in Stripe Dashboard

**Test endpoint:**
```bash
curl -X POST https://yourdomain.com/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Signature Verification Fails

**Causes:**
- Wrong webhook secret
- Request body was modified before verification
- Using wrong endpoint URL

**Fix:**
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe Dashboard
- Don't parse request body before verification
- Check endpoint URL in Stripe Dashboard

### Events Not Processing

**Check logs:**
```bash
# View webhook logs in Stripe Dashboard
# Or check your application logs
```

**Common issues:**
- PocketBase authentication failed
- Order ID not in metadata
- Database connection issues

---

## Security Best Practices

✅ **Always verify webhook signatures** - prevents fake webhooks  
✅ **Use HTTPS in production** - required by Stripe  
✅ **Keep webhook secret secure** - treat like a password  
✅ **Log all webhook events** - helps with debugging  
✅ **Handle idempotency** - same event may be sent multiple times  
✅ **Return 200 quickly** - process async if needed  
✅ **Monitor webhook failures** - check Stripe Dashboard regularly  

---

## Webhook Endpoint Code

Your webhook is located at:
```
src/routes/api/webhooks/stripe/+server.ts
```

It:
1. Verifies Stripe signature
2. Parses the event
3. Updates PocketBase records
4. Returns success/error response

---

## Next Steps

1. ✅ Webhook endpoint created
2. ✅ Environment variable added
3. ⏳ Install Stripe CLI
4. ⏳ Test locally with `stripe listen`
5. ⏳ Test with real checkout flow
6. ⏳ Set up production webhook in Stripe Dashboard
7. ⏳ Monitor webhook logs

---

## Useful Commands

```bash
# Login to Stripe
stripe login

# Forward webhooks to local dev
stripe listen --forward-to localhost:5173/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger checkout.session.completed
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded

# View webhook logs
stripe logs tail

# Test webhook endpoint
curl -X POST http://localhost:5173/api/webhooks/stripe
```

---

## Resources

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
