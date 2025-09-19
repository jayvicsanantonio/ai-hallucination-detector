# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
- `npm run dev` - Start development server with hot reload using ts-node-dev and TypeScript path resolution
- `npm run build` - Compile TypeScript to JavaScript in the dist/ directory
- `npm start` - Run the production build from dist/index.js

### Testing
- `npm test` - Run all tests with Jest
- `npm run test:unit` - Run only unit tests (tests/unit/)
- `npm run test:integration` - Run only integration tests (tests/integration/)
- `npm run test:e2e` - Run only end-to-end tests (tests/e2e/)
- `npm run test:coverage` - Generate test coverage report
- `npm run test:e2e:run` - Run E2E test runner with ts-node
- `npm run test:performance` - Run performance benchmark tests
- `npm run test:security` - Run security penetration tests
- `npm run test:workflows` - Run verification workflow tests
- `npm run test:smoke` - Run smoke tests

### Code Quality
- `npm run lint` - Run ESLint on src/**/*.ts files
- `npm run lint:fix` - Run ESLint with auto-fix

## Project Architecture

### Core Components

**VerificationEngine** (`src/services/verification-engine/VerificationEngine.ts`): The central orchestrator that manages the verification workflow. It coordinates multiple domain modules, handles concurrent verification limits, manages status tracking, and processes results through a results processor.

**API Gateway** (`src/api/gateway/server.ts`): Express-based API server with security middleware (helmet, CORS, rate limiting), authentication, and routing to verification endpoints. Uses a modular middleware approach.

**Domain Modules** (`src/modules/`): Industry-specific verification modules including:
- `compliance-validator/` - Regulatory compliance checking (GDPR, HIPAA, SOX)
- `domain/financial/` - Financial calculation verification and compliance
- `domain/healthcare/` - Medical terminology and HIPAA compliance
- `domain/legal/` - Legal entity recognition and contract validation
- `fact-checker/` - Factual claim verification with external sources
- `logic-analyzer/` - Logical consistency and contradiction detection

### Key Patterns

**Module Registration**: The VerificationEngine uses a Map-based module registry where domain modules implement the `DomainModule` interface and register themselves by domain name.

**Request Flow**:
1. API Gateway validates and routes requests
2. VerificationEngine orchestrates module execution
3. ResultsProcessor aggregates and caches results
4. Comprehensive audit trail tracks all operations

**Path Aliases**: The project uses TypeScript path mapping with `@/` as the base:
- `@/api/*` → `src/api/*`
- `@/services/*` → `src/services/*`
- `@/modules/*` → `src/modules/*`
- `@/models/*` → `src/models/*`
- `@/database/*` → `src/database/*`
- `@/utils/*` → `src/utils/*`

**Error Handling**: Uses centralized error handling middleware with structured error responses and comprehensive audit logging for all operations.

**Caching**: ResultsProcessor includes caching capabilities with configurable TTL for verification results.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- PostgreSQL database connection (DATABASE_URL)
- Redis connection (REDIS_URL)
- JWT authentication secret (JWT_SECRET)
- External knowledge base API credentials

## Testing Strategy

The project follows a comprehensive testing approach:
- **Unit tests** for individual components and utilities
- **Integration tests** for service interactions and database operations
- **E2E tests** for complete verification workflows
- **Performance tests** for benchmarking verification times
- **Security tests** for penetration testing
- **Smoke tests** for basic functionality validation

Test setup includes mocked console methods and environment variables for isolated testing.