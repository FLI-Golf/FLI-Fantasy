#!/bin/bash

echo "🎯 Starting Stripe Webhook Forwarding"
echo "====================================="
echo ""
echo "This will forward Stripe webhooks to your local dev server."
echo ""
echo "⚠️  IMPORTANT: Before running this, make sure:"
echo "   1. Your dev server is running (pnpm run dev)"
echo "   2. You've logged in to Stripe CLI (stripe login)"
echo ""
echo "Press Ctrl+C to stop forwarding"
echo ""
echo "Starting in 3 seconds..."
sleep 3

echo ""
echo "🚀 Forwarding webhooks to localhost:5173/api/webhooks/stripe"
echo ""
echo "📝 Copy the webhook secret (whsec_...) and add it to your .env file:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here"
echo ""
echo "Then restart your dev server for the changes to take effect."
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

stripe listen --forward-to localhost:5173/api/webhooks/stripe
