# LoyaltyGen Functions

This directory contains the backend Cloud Functions for the LoyaltyGen platform.

## Project Structure

```
functions/
├── src/
│   ├── api/              # API routes and middleware
│   │   ├── routes/       # Express route handlers
│   │   └── middleware/   # Middleware (auth, error handling, etc.)
│   ├── core/             # Core utilities and error classes
│   │   └── errors.ts     # Custom error classes
│   ├── services/         # Business logic layer
│   ├── schemas/          # Zod validation schemas
│   ├── scripts/          # Utility scripts (seed data, migrations, etc.)
│   │   ├── seed.ts       # Database seeding script
│   │   └── README.md     # Scripts documentation
│   └── index.ts          # Cloud Function entry point
├── lib/                  # Compiled JavaScript output (gitignored)
├── package.json
├── tsconfig.json
├── eslint.config.mjs
└── .prettierrc
```

## Prerequisites

- Node.js 18 LTS
- npm 9+
- Firebase CLI: `npm install -g firebase-tools`

## Installation

```bash
cd functions
npm install
```

## Development

### Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

### Lint

Check code quality:

```bash
npm run lint
```

Fix linting issues automatically:

```bash
npm run lint:fix
```

### Local Development with Emulator

Start Firebase emulators (from project root):

```bash
firebase emulators:start
```

The emulators will run:
- Functions: `http://localhost:5001`
- Firestore: `http://localhost:8080`
- Emulator UI: `http://localhost:4000`

### Seed Database

Populate the database with sample data:

```bash
# With emulator running
FIRESTORE_EMULATOR_HOST="localhost:8080" npm run seed
```

See [src/scripts/README.md](./src/scripts/README.md) for detailed seed data documentation.

## Code Standards

### TypeScript

- **Strict mode enabled**: All code must compile with `strict: true`
- **No `any` type**: Use `unknown` with type guards instead
- **Explicit return types**: Recommended for exported functions

### Validation

- **Zod schemas**: Single source of truth for data models
- **Type inference**: Use `z.infer<typeof schema>` instead of manual interfaces

### Error Handling

- **Custom error classes**: Defined in `src/core/errors.ts`
- **Structured responses**: All errors follow the format:
  ```json
  {
    "error": {
      "code": "ERROR_CODE",
      "message": "Human-readable message"
    }
  }
  ```

### Code Formatting

- **Prettier**: Automatically formats code
- **Single quotes**: For strings
- **2 space indentation**
- **Semicolons**: Required
- **Line length**: 100 characters

## Deployment

### Deploy to Firebase

```bash
npm run deploy
```

### View Logs

```bash
npm run logs
```

## Testing

Testing infrastructure will be added in Phase 4 of the project. See [WORK-PLAN.md](../WORK-PLAN.md) for details.

## Security

### PII (Personally Identifiable Information)

The following fields contain PII and **must not be logged**:
- `name` (all components)
- `email`
- `identity_document`
- `phones`
- `addresses`
- `extra_data`

Only log resource IDs and error codes. See [GUIDELINES.md](../docs/GUIDELINES.md) for full security policies.

### Authentication

All API endpoints (except `/health`) require Firebase Authentication JWT tokens in the `Authorization` header:

```
Authorization: Bearer <firebase-id-token>
```

## API Documentation

The API contract is defined in [openapi.yaml](../openapi.yaml). This is the single source of truth for all API specifications.

Key endpoints:
- `GET /health` - Health check (no auth required)
- `POST /clients` - Create client
- `GET /clients` - List clients
- `GET /clients/{id}` - Get client
- `PUT /clients/{id}` - Update client
- `DELETE /clients/{id}` - Delete client (async)

See [WORK-PLAN.md](../WORK-PLAN.md) for the complete API implementation plan.

## Related Documentation

- [Architecture](../docs/ARCHITECTURE.md) - System architecture and tech stack
- [API Design](../docs/API-DESIGN.md) - API conventions and standards
- [Guidelines](../docs/GUIDELINES.md) - Coding guidelines and best practices
- [Specifications](../docs/SPECS.md) - Functional and non-functional requirements

## Project Status

**Current Phase**: Backend Setup (Phase 1)

- [x] Project structure created
- [x] TypeScript configuration
- [x] ESLint and Prettier setup
- [x] Core error classes
- [x] Basic Express app structure
- [x] Seed script implemented
- [ ] API implementation (Phase 2)
- [ ] Testing setup (Phase 4)

See [WORK-PLAN.md](../WORK-PLAN.md) for the complete implementation roadmap.
