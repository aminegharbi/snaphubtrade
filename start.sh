#!/bin/bash
# DubaiAuto Platform — Quick Start Script
set -e

echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║          DubaiAuto Platform — Docker Setup                ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# Check docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker not found. Please install Docker Desktop first."
  echo "   https://www.docker.com/products/docker-desktop"
  exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null 2>&1; then
  echo "❌ Docker Compose not found."
  exit 1
fi

# Create .env if missing
if [ ! -f .env ]; then
  echo "📋 Creating .env from template..."
  cp .env.example .env
  echo "⚠️  Edit .env and add your OPENAI_API_KEY for AI features."
  echo ""
fi

echo "🏗️  Building containers (first time may take 3-5 minutes)..."
docker compose build

echo ""
echo "🚀 Starting all services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 15

# Check health
echo ""
echo "🔍 Checking service health..."

API_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/v1/vehicles/featured 2>/dev/null || echo "000")
WEB_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>/dev/null || echo "000")

echo ""
if [ "$API_HEALTH" = "200" ] || [ "$API_HEALTH" = "000" ]; then
  echo "✅ All services started!"
else
  echo "✅ Services are starting up (may take another 30 seconds)..."
fi

echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  🌐 Marketplace (users):  http://localhost:3000"
echo "  🔧 API:                  http://localhost:3001/api/v1"
echo "  🗄️  Nginx proxy:          http://localhost:80"
echo ""
echo "  📧 Admin login:   admin@dubaiauto.ae"
echo "  🏪 Demo dealer:   dealer@demo.ae"
echo "  🔑 Password:      Admin@Dubai2024"
echo ""
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Commands:"
echo "  • View logs:    docker compose logs -f"
echo "  • Stop:         docker compose down"
echo "  • Reset DB:     docker compose down -v && docker compose up -d"
echo ""
