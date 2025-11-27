# Stripe Webhook Quick Start

## ✅ Stripe CLI Installed!

The Stripe CLI is now installed and ready to use.

---

## 🚀 Quick Setup (3 Steps)

### Step 1: Login to Stripe

Run this command and follow the browser prompt:

```bash
stripe login
```

This will:
- Open your browser
- Ask you to login to Stripe
- Authorize the CLI

### Step 2: Start Webhook Forwarding

**Option A: Use the helper script**
```bash
./start-webhook-forwarding.sh
```

**Option B: Run the command directly**
```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

You'll see output like:
```
> Ready! Your webhook signing secret is whsec_1a2b3c4d5e6f7g8h9i0j (^C to quit)
```

### Step 3: Update Your .env File

Copy the `whsec_...` secret from the output above and update your `.env` file:

```bash
STRIPE_WEBHOOK_SECRET=whsec_1a2b3c4d5e6f7g8h9i0j
```

Then **restart your dev server** for the changes to take effect.

---

## 🧪 Testing

### Test a Webhook Event

In a new terminal:

```bash
# Test successful checkout
stripe trigger checkout.session.completed

# Test successful payment
stripe trigger payment_intent.succeeded

# Test failed payment
stripe trigger payment_intent.payment_failed

# Test refund
stripe trigger charge.refunded
```

### Check Your Logs

Look at your dev server terminal - you should see:
```
📨 Received Stripe webhook
✅ Verified webhook event: checkout.session.completed
💳 Checkout session completed: cs_test_xxxxx
```

---

## 📋 Complete Workflow

### Terminal 1: Dev Server
```bash
pnpm run dev
```

### Terminal 2: Webhook Forwarding
```bash
stripe listen --forward-to localhost:5173/api/webhooks/stripe
```

### Terminal 3: Testing
```bash
stripe trigger checkout.session.completed
```

---

## 🔧 Troubleshooting

### "stripe: command not found"
The CLI is installed at `/usr/local/bin/stripe`. Try:
```bash
/usr/local/bin/stripe --version
```

### "You need to login first"
Run:
```bash
stripe login
```

### "Connection refused"
Make sure your dev server is running on port 5173:
```bash
pnpm run dev
```

### Webhook signature verification fails
1. Make sure you copied the correct `whsec_...` secret
2. Update your `.env` file
3. **Restart your dev server** (important!)

---

## 📚 Useful Commands

```bash
# Check Stripe CLI version
stripe --version

# Login to Stripe
stripe login

# Logout
stripe logout

# View webhook logs
stripe logs tail

# List available test events
stripe trigger --help

# Forward webhooks
stripe listen --forward-to localhost:5173/api/webhooks/stripe

# Test specific event
stripe trigger checkout.session.completed
```

---

## 🎯 Next Steps

Once webhooks are working:

1. ✅ Stripe CLI installed
2. ⏳ Login to Stripe (`stripe login`)
3. ⏳ Start webhook forwarding
4. ⏳ Update .env with webhook secret
5. ⏳ Test with `stripe trigger`
6. ⏳ Build checkout flow
7. ⏳ Test end-to-end payment

---

## 🔗 Resources

- [Stripe CLI Docs](https://stripe.com/docs/stripe-cli)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Webhook Events Reference](https://stripe.com/docs/api/events/types)
