#!/bin/bash

# AccessManager Setup Script
# This script sets up the complete AccessManager system

set -e

echo "🚀 Starting AccessManager Setup..."

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "❌ This script must be run as root for network configuration"
    echo "   Please run: sudo $0"
    exit 1
fi

# Check for required commands
REQUIRED_COMMANDS="docker docker-compose git"
for cmd in $REQUIRED_COMMANDS; do
    if ! command -v $cmd &> /dev/null; then
        echo "❌ Required command '$cmd' not found"
        echo "   Please install $cmd and try again"
        exit 1
    fi
done

echo "✅ Prerequisites check passed"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    
    # Generate random secrets
    JWT_SECRET=$(openssl rand -base64 32)
    JWT_REFRESH_SECRET=$(openssl rand -base64 32)
    POSTGRES_PASSWORD=$(openssl rand -base64 16)
    
    # Update .env file with generated secrets
    sed -i "s/your-super-secret-jwt-key-change-this-in-production/$JWT_SECRET/g" .env
    sed -i "s/your-super-secret-refresh-key-change-this-in-production/$JWT_REFRESH_SECRET/g" .env
    sed -i "s/your-secure-postgres-password/$POSTGRES_PASSWORD/g" .env
    
    echo "✅ .env file created with random secrets"
else
    echo "✅ .env file already exists"
fi

# Set up network configuration
echo "🌐 Setting up network configuration..."
./scripts/network-setup.sh

# Build and start services
echo "🐳 Building and starting Docker services..."
docker-compose down --remove-orphans
docker-compose build --no-cache
docker-compose up -d

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
sleep 10

# Run database migrations and seed
echo "📊 Setting up database..."
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma db seed

echo "✅ AccessManager setup completed!"
echo ""
echo "🌟 Your AccessManager is now running!"
echo ""
echo "📋 Access Information:"
echo "   🌐 Web Interface: https://localhost"
echo "   👤 Admin Login: admin@accessmanager.local / Admin@123456"
echo "   🧪 Test User: user@example.com / User@123456"
echo ""
echo "📚 Useful Commands:"
echo "   📊 View logs: docker-compose logs -f"
echo "   🔄 Restart services: docker-compose restart"
echo "   🛑 Stop services: docker-compose down"
echo "   🔧 Database console: docker-compose exec postgres psql -U postgres -d accessmanager"
echo ""
echo "⚠️  Important Notes:"
echo "   🔐 Change default passwords in production!"
echo "   🌐 Configure proper SSL certificates for production use"
echo "   🔧 Customize network interface in network-setup.sh if needed"
echo ""
echo "🎉 Happy access managing!"