#!/bin/bash

echo "🎯 FLI Golf - Stripe Webhook Setup"
echo "=================================="
echo ""

# Check if Stripe CLI is installed
if command -v stripe &> /dev/null; then
    echo "✅ Stripe CLI is already installed"
    stripe --version
else
    echo "📦 Installing Stripe CLI..."
    
    # Detect OS and install
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        if command -v brew &> /dev/null; then
            echo "Installing via Homebrew..."
            brew install stripe/stripe-cli/stripe
        else
            echo "❌ Homebrew not found. Please install Homebrew first:"
            echo "   /bin/bash -c \"\$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)\""
            exit 1
        fi
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux
        echo "Installing for Linux..."
        wget https://github.com/stripe/stripe-cli/releases/download/v1.33.0/stripe_1.33.0_linux_x86_64.tar.gz
        tar -xvf stripe_1.33.0_linux_x86_64.tar.gz
        sudo mv stripe /usr/local/bin/
        rm stripe_1.33.0_linux_x86_64.tar.gz
    else
        echo "❌ Unsupported OS. Please install manually from:"
        echo "   https://stripe.com/docs/stripe-cli"
        exit 1
    fi
fi

echo ""
echo "✅ Stripe CLI installed successfully!"
echo ""
echo "📝 Next Steps:"
echo ""
echo "1. Login to Stripe:"
echo "   stripe login"
echo ""
echo "2. Start your dev server (in one terminal):"
echo "   pnpm run dev"
echo ""
echo "3. Forward webhooks (in another terminal):"
echo "   stripe listen --forward-to localhost:5173/api/webhooks/stripe"
echo ""
echo "4. Copy the webhook secret (whsec_...) from the output"
echo ""
echo "5. Update your .env file:"
echo "   STRIPE_WEBHOOK_SECRET=whsec_your_secret_here"
echo ""
echo "6. Restart your dev server"
echo ""
echo "7. Test with:"
echo "   stripe trigger checkout.session.completed"
echo ""
