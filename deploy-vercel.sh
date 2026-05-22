#!/bin/bash
# Deploy Merge Master 2048 to Vercel
# Usage: ./deploy-vercel.sh
# You need a Vercel token - get one from: https://vercel.com/account/tokens

set -e

# Check if vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "Installing Vercel CLI..."
    npm install -g vercel
fi

# Check for token
if [ -z "$VERCEL_TOKEN" ]; then
    echo "⚠️  No VERCEL_TOKEN found!"
    echo "Please get a token from: https://vercel.com/account/tokens"
    echo "Then run: VERCEL_TOKEN=your_token ./deploy-vercel.sh"
    echo ""
    echo "Or run: vercel login"
    exit 1
fi

# Build without basePath (for Vercel)
echo "Building for Vercel..."
DEPLOY_TARGET=vercel bun run build

# Deploy to Vercel
echo "Deploying to Vercel..."
VERCEL_TOKEN="$VERCEL_TOKEN" vercel deploy out/ --prod --yes

echo "✅ Deployment complete!"
