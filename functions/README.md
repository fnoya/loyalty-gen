# LoyaltyGen API - Cloud Functions

Backend API for the LoyaltyGen customer loyalty platform.

## Setup

```bash
npm install
```

## Development

```bash
# Build TypeScript
npm run build

# Build in watch mode
npm run build:watch

# Run linter
npm run lint

# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Serve locally with Firebase emulators
npm run serve
```

## Deploy

```bash
npm run deploy
```

## Project Structure

```
functions/
├── src/
│   ├── api/
│   │   ├── middleware/     # Auth, error handling
│   │   └── routes/         # Express routes
│   ├── core/
│   │   └── errors.ts       # Custom error classes
│   ├── models/             # TypeScript types
│   ├── schemas/            # Zod validation schemas
│   ├── services/           # Business logic
│   └── index.ts            # Main entry point
├── package.json
├── tsconfig.json
└── README.md
```

## Code Standards

- TypeScript strict mode enabled
- No `any` type allowed (use `unknown` with validation)
- All functions must have explicit return types
- ESLint and Prettier configured
- Minimum 80% test coverage required
