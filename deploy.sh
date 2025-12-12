#!/bin/bash

# Manual deployment script for Amazon Reviewer
# Usage: ./deploy.sh

echo "🚀 Starting deployment to EC2..."

# Build the application
echo "📦 Building application..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi

# Configuration (Update these values)
EC2_HOST="your-ec2-ip-or-domain"
EC2_USER="ubuntu"
EC2_KEY_PATH="~/.ssh/your-key.pem"

echo "📤 Deploying to EC2..."

# Copy built files to EC2
scp -i $EC2_KEY_PATH -r dist/* $EC2_USER@$EC2_HOST:/var/www/html/

# SSH into EC2 and restart nginx
ssh -i $EC2_KEY_PATH $EC2_USER@$EC2_HOST << 'EOF'
sudo systemctl restart nginx
echo "✅ Nginx restarted successfully"
EOF

echo "🎉 Deployment completed!"
echo "🌐 Your site should be available at: http://$EC2_HOST"