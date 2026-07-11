# DubaiAuto — Automotive Trading Platform

Dubai Free Zone vehicle marketplace with AI-powered listings, real-time inventory management, and global export tools.

## Quick start

```bash
# 1. Clone / extract the project
cd dubaiauto

# 2. Copy environment file
cp .env.example .env
# Edit .env to add your OPENAI_API_KEY (optional for demo)

# 3. Run the platform
bash start.sh
```

That's it. The script builds everything and starts all services.

## Access points

| Service | URL |
|---|---|
| **Marketplace (users)** | http://localhost:3000 |
| **API** | http://localhost:3001/api/v1 |
| **Nginx proxy** | http://localhost:80 |
| **Elasticsearch** | http://localhost:9200 |

## Demo credentials

| Role | Email | Password |
|---|---|---|
| Super Admin | admin@dubaiauto.ae | Admin@Dubai2024 |
| Demo Dealer | dealer@demo.ae | Admin@Dubai2024 |

## Services architecture

```
web (Next.js)       → port 3000
api (NestJS)        → port 3001
worker (BullMQ)
postgres (TimescaleDB) → port 5432
redis               → port 6379
elasticsearch       → port 9200
nginx               → port 80
```

## Marketplace features (user-facing)

- **Homepage** — hero search, featured vehicles, brand browser, export section
- **Marketplace** (`/marketplace`) — full search with filters: make, model, body type, fuel, year, price, export eligibility
- **Vehicle detail** (`/vehicle/:id`) — photos, full specs, WhatsApp CTA, dealer card
- **Dealers** (`/dealers`) — verified dealer directory
- **Dealer profile** (`/dealer/:slug`) — dealer info + their inventory

## API endpoints

```
GET  /api/v1/vehicles          — list with filters
GET  /api/v1/vehicles/featured — homepage featured
GET  /api/v1/vehicles/:id      — vehicle detail
POST /api/v1/vehicles          — create vehicle

GET  /api/v1/search            — full-text search
GET  /api/v1/search/suggest    — autocomplete

GET  /api/v1/dealers           — dealer directory
GET  /api/v1/dealers/:slug     — dealer profile

POST /api/v1/auth/register     — register user/dealer
POST /api/v1/auth/login        — login

POST /api/v1/ai/recognize      — AI vehicle recognition
POST /api/v1/ai/price-suggest  — price prediction

GET  /api/v1/analytics/platform  — platform stats
GET  /api/v1/analytics/dealer/:id — dealer stats

POST /api/v1/crm/leads         — create lead
GET  /api/v1/crm/leads         — get leads (dealer)
```

## Configuration

Edit `.env` to configure:

- `OPENAI_API_KEY` — enables AI vehicle recognition (GPT-4 Vision)
- `AWS_*` — S3 image storage (defaults to local file storage)
- `STRIPE_*` — payment processing
- `TWILIO_*` / `WHATSAPP_*` — SMS & WhatsApp notifications

## Useful commands

```bash
# View all logs
docker compose logs -f

# View specific service
docker compose logs -f api
docker compose logs -f web

# Restart a service
docker compose restart api

# Stop everything
docker compose down

# Reset database (destroys all data)
docker compose down -v
docker compose up -d

# Access PostgreSQL
docker exec -it dubaiauto-postgres psql -U dubaiauto -d dubaiauto

# Access Redis
docker exec -it dubaiauto-redis redis-cli
```

## Production deployment

For production on AWS:
1. Push images to ECR
2. Use `k8s/` manifests for EKS deployment
3. Replace PostgreSQL with RDS, Redis with ElastiCache, Elasticsearch with OpenSearch
4. Set up CloudFront distribution for the web app
5. Configure Route53 for your domain

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Backend | NestJS, TypeScript |
| Database | PostgreSQL 16 + TimescaleDB |
| Search | Elasticsearch 8 |
| Cache / Queue | Redis 7, BullMQ |
| AI | OpenAI GPT-4 Vision |
| Storage | AWS S3 / local |
| Payments | Stripe |
| Notifications | Twilio, WhatsApp Business API |
| Infrastructure | Docker, Kubernetes |
