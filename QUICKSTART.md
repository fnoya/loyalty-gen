# Quick Start Guide

This guide will help you get the LoyaltyGen project up and running quickly.

## Prerequisites

- Node.js 18 LTS or higher
- npm 9+ or yarn 1.22+
- Firebase CLI: `npm install -g firebase-tools`

## Setup

### 1. Clone and Install

```bash
# Clone the repository
git clone https://github.com/fnoya/loyalty-gen.git
cd loyalty-gen

# Install backend dependencies
cd functions
npm install
```

### 2. Configure Environment

```bash
# Copy the example environment file
cp .env.example .env

# Edit .env if needed for your setup
# For local development, the defaults should work
```

### 3. Start Firebase Emulator

From the project root:

```bash
# Login to Firebase (first time only)
firebase login

# Start the emulators
firebase emulators:start
```

This will start:
- **Functions Emulator**: http://localhost:5001
- **Firestore Emulator**: http://localhost:8080
- **Emulator UI**: http://localhost:4000

### 4. Seed the Database

In a new terminal, while the emulator is running:

```bash
cd functions
FIRESTORE_EMULATOR_HOST="localhost:8080" npm run seed
```

You should see output like:

```
🌱 Starting seed process...

🗑️  Clearing existing data...
✅ Collections cleared
📦 Seeding affinity groups...
  ✓ Created group: Clientes VIP
  ✓ Created group: Compradores Frecuentes
  ✓ Created group: Clientes Nuevos
✅ Affinity groups seeded
👥 Seeding clients...
  ✓ Created client: Francisco Noya
  ✓ Created client: María González
  ✓ Created client: Juan Rodríguez
  ✓ Created client: Ana Martínez
✅ Clients seeded
💳 Seeding loyalty accounts and transactions...
  ✓ Created account: Puntos Generales for client client-francisco
    ✓ Added transaction: credit 1000 pts
    ✓ Added transaction: credit 500 pts
  ...
✅ Loyalty accounts and transactions seeded

🎉 Seed process completed successfully!

📊 Summary:
  - 3 affinity groups
  - 4 clients
  - 5 loyalty accounts
  - 8 transactions
```

### 5. Explore the Data

Open the Firestore Emulator UI at http://localhost:4000 to browse the seeded data:

- **clients**: 4 sample clients with names, emails, documents
- **affinityGroups**: 3 sample groups
- **loyaltyAccounts**: Under each client document
- **transactions**: Under each loyalty account

## Development Workflow

### Build Backend

```bash
cd functions
npm run build
```

### Lint Code

```bash
cd functions
npm run lint
```

### Clear and Re-seed Data

```bash
# While emulator is running
cd functions
FIRESTORE_EMULATOR_HOST="localhost:8080" npm run seed
```

The seed script automatically clears existing data before seeding.

## Verify the Setup

### 1. Check the Health Endpoint

With the emulator running:

```bash
curl http://localhost:5001/loyalty-cloud/us-central1/api/health
```

Should return:

```json
{"status":"ok"}
```

### 2. Browse the Emulator UI

Open http://localhost:4000 and navigate to:

- **Firestore**: View collections and documents
- **Functions**: See deployed functions and logs

## Next Steps

Now that your environment is set up:

1. **Read the Documentation**
   - [WORK-PLAN.md](./WORK-PLAN.md) - Implementation roadmap
   - [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) - System architecture
   - [docs/API-DESIGN.md](./docs/API-DESIGN.md) - API conventions
   - [openapi.yaml](./openapi.yaml) - API specification

2. **Start Building**
   - Follow the WORK-PLAN.md to implement Phase 2 (API endpoints)
   - See Task 2.1 for creating Zod schemas
   - See Task 2.2 for implementing client endpoints

3. **Explore the Seed Data**
   - See [functions/src/scripts/README.md](./functions/src/scripts/README.md)
   - Try different search queries using the seeded data
   - Modify the seed script to add your own test data

## Troubleshooting

### Emulator Issues

**Port already in use:**

```bash
# Find and kill the process using the port
lsof -ti:5001 | xargs kill -9
lsof -ti:8080 | xargs kill -9
```

**Emulator won't start:**

```bash
# Clear Firebase cache
rm -rf ~/.cache/firebase/emulators
firebase setup:emulators:firestore
```

### Seed Script Issues

**"Firebase Admin app not initialized":**

Make sure the `FIRESTORE_EMULATOR_HOST` environment variable is set:

```bash
FIRESTORE_EMULATOR_HOST="localhost:8080" npm run seed
```

**"Permission denied":**

Check that:
1. Firebase emulator is running
2. The Firestore emulator is on port 8080 (default)
3. Your firestore.rules file is valid

### Build Issues

**TypeScript errors:**

```bash
cd functions
npm run build
```

Check the output for specific errors. Most should be in dependency type definitions (safe to ignore with `skipLibCheck: true` in tsconfig.json).

**ESLint errors:**

```bash
cd functions
npm run lint:fix
```

This will auto-fix most formatting issues.

## Project Status

✅ **Completed:**
- Backend structure and configuration
- Core error classes
- Seed script with sample data
- Firebase configuration
- TypeScript, ESLint, Prettier setup

🔜 **Next:**
- API implementation (Zod schemas, services, routes)
- Authentication middleware
- Frontend dashboard (Next.js)

See [WORK-PLAN.md](./WORK-PLAN.md) for the complete roadmap.

## Getting Help

- **Documentation**: See the [docs/](./docs/) directory
- **Issues**: Check existing issues or create a new one
- **Contributing**: See [docs/GUIDELINES.md](./docs/GUIDELINES.md)

---

**Happy coding! 🚀**
