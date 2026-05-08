#!/bin/bash
# ============================================
# 🚀 MERGE MASTER 2048 - DEPLOY SCRIPT
# ============================================
# Ye script tera game GitHub pe push karega
# aur Vercel pe deploy karega
# ============================================

echo "🎮 Merge Master 2048 - Deploy Script"
echo "====================================="
echo ""

# Step 1: Check git
if ! command -v git &> /dev/null; then
    echo "❌ Git nahi hai! Pehle install karo:"
    echo "   https://git-scm.com/downloads"
    exit 1
fi
echo "✅ Git mil gaya"

# Step 2: Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js nahi hai! Pehle install karo:"
    echo "   https://nodejs.org/"
    exit 1
fi
echo "✅ Node.js mil gaya"

# Step 3: Ask for GitHub username
echo ""
echo "📝 Ab tujhe GitHub account chahiye"
echo "   Agar nahi hai toh banao: https://github.com/signup"
echo ""
read -p "GitHub username daalo: " GITHUB_USER

if [ -z "$GITHUB_USER" ]; then
    echo "❌ Username zaruri hai!"
    exit 1
fi

# Step 4: Initialize git if needed
if [ ! -d .git ]; then
    git init
fi

# Step 5: Commit all files
git add -A
git commit -m "Merge Master 2048 Challenge - Ready to deploy"

# Step 6: Create GitHub repo using API
echo ""
echo "🔄 GitHub pe repo bana raha hoon..."
echo "   (Browser me GitHub login page khulega - allow karo)"
gh auth login --hostname github.com --git-protocol https -p https -w

# Step 7: Create repo
echo "📦 GitHub repository bana raha hoon..."
gh repo create merge-master-2048 --public --source=. --push

echo ""
echo "✅ GitHub pe push ho gaya!"
echo ""

# Step 8: Deploy to Vercel
echo "🚀 Ab Vercel pe deploy karte hain..."
echo "   (Browser me Vercel login page khulega - allow karo)"
npx vercel deploy --prod

echo ""
echo "🎉🎉🎉 DEPLOY HO GAYA! 🎉🎉🎉"
echo ""
echo "Ab tera game live hai! URL upar dikha hoga"
