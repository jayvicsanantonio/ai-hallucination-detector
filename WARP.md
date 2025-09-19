# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

Repository: CertaintyAI – AI hallucination detection system (TypeScript/Node.js)

Quick commands
- Install deps
  - npm install
- Start development (hot reload, ts-node-dev with path aliases)
  - npm run dev
- Type-check and build
  - npm run build
- Run compiled bundle
  - npm start
- Lint
  - npm run lint
  - npm run lint:fix
- Run all tests
  - npm test
- Targeted test suites
  - Unit: npm run test:unit
  - Integration: npm run test:integration
  - E2E (Jest pattern): npm run test:e2e
  - E2E orchestrator (TypeScript runner): npm run test:e2e:run
  - Performance: npm run test:performance
  - Security: npm run test:security
  - Workflows: npm run test:workflows
  - Smoke: npm run test:smoke
- Coverage
  - npm run test:coverage
- Run a single test file
  - npx jest tests/unit/models/core/ParsedContent.test.ts
- Run tests matching a name
  - npx jest -t "should handle invalid input"
- Run tests in a directory
  - npx jest --testPathPattern=tests/integration/modules/fact-checker

Environment and local services
- Copy and edit environment config
  - cp .env.example .env
- Minimum versions
  - Node.js 18+, PostgreSQL 13+, Redis 6+
- Start local infra for integration tests (recommended)
  - docker compose up -d postgres redis
  - Note: docker-compose.yml also defines app services (api-gateway, verification-engine, content-processor) and monitoring (nginx, prometheus, grafana). For local dev you typically only need postgres and redis.

Project architecture (big picture)
- Entry point and HTTP surface
  - src/index.ts bootstraps an Express app (createApp from src/api/gateway/server.ts). Health is exposed under /api/v1/health. Rate limiting, Helmet, CORS, JSON parsing are applied globally.
  - src/api/gateway/server.ts mounts route modules: /api/v1/verify, /api/v1/results, /api/v1/feedback, and a health router. It inserts authentication and request validation middleware for protected routes.
  - Authentication & authorization: src/api/middleware/auth.ts supports either JWT (Authorization: Bearer ...) or X-API-Key. Helpers authorize([...]) and requireRole([...]) gate endpoints. JWT secret is read from env. In tests/dev there are mock API keys.
  - Validation: src/api/middleware/validation.ts uses Joi schemas to validate payloads for verify and feedback. Additional schemas live in src/api/validation/schemas.ts.
  - Optional HTTPS server: src/api/gateway/SecureServer.ts wires a TLS 1.3-only configuration via src/api/security/TLSConfig.ts (self-signed for dev if no certs). Not used by the default dev entrypoint.
- Core verification flow
  - Content processing: src/services/content-processing/ContentProcessingService.ts (and parsers under src/services/content-processing/parsers/) normalize and parse input documents (text, PDF, DOCX, JSON), extract entities, and attach processing metadata. Batch APIs and sanitization helpers are included.
  - Orchestration: src/services/verification-engine/VerificationEngine.ts coordinates domain modules (implements interfaces/VerificationEngine). It tracks active verification status, runs modules with timeouts, aggregates issues, and delegates to ResultsProcessor for caching/aggregation.
  - Domain intelligence modules live under src/modules/
    - logic-analyzer: contradiction, fallacy, numerical consistency, coherence validators (LogicAnalyzer aggregates and converts detections into issues)
    - fact-checker: claim extraction, knowledge-base and external source checks, credibility scoring (FactChecker)
    - compliance-validator and domain-specific directories (financial, healthcare, legal) encapsulate domain rule checks and reporting flows
  - Results access: src/api/routes/results.ts serves verification results (via ResultsCache) and basic history endpoints (history is currently mocked in code).
  - Feedback loop: src/api/routes/feedback.ts uses FeedbackService (src/services/learning) to ingest user feedback, compute stats, and analyze patterns.
- Persistence and caching
  - PostgreSQL access via src/database/ConnectionPool.ts (pg). It configures timeouts, prepared statements, transactions, and exposes health/stats helpers. Migrations exist as SQL files in src/database/migrations/ and are mounted by docker-compose on first DB init.
  - Redis caching under src/services/cache/ with a thin CacheManager and RedisCache implementation used by results and performance monitoring.
- Models and shared types
  - src/models/* contains typed contracts for core verification results, content structure, audit entries, and domain-specific types used across modules and services.
  - src/utils/Logger.ts provides a simple timestamped logger used broadly.
- UI surface (in-repo)
  - src/ui/dashboard/* contains React components and styles for reporting/visualization (Recharts). These are tested, but this repo does not include a web bundler or app server for the UI; components are intended for integration into a host UI or for test-driven rendering.

How things fit together (request-to-result)
1) Client sends POST /api/v1/verify with { content, contentType, domain, urgency, metadata }
2) Middleware: rate limit -> JWT/API key auth -> Joi validation
3) ContentProcessingService parses/extracts entities and normalizes text
4) VerificationEngine runs domain module(s) in parallel with timeouts; logic-analyzer and fact-checker provide cross-cutting validations
5) ResultsProcessor aggregates module outputs into a VerificationResult, caches, and returns verificationId
6) Client polls /api/v1/results/:verificationId; optional audit trail and recommendations are included
7) Client posts /api/v1/feedback to improve models; learning services compute stats/patterns over time

Testing
- Jest with ts-jest; tests are organized in tests/{unit,integration,e2e,smoke,load}. Global setup is tests/setup.ts (mocks console noise and seeds env vars for tests).
- Path aliases in tests use moduleNameMapper: ^@/(.*)$ -> <rootDir>/src/$1, mirroring tsconfig paths.
- UI .tsx tests exist (tests/ui/**). The default Jest environment is node. If DOM APIs are required, run with jsdom for those tests, e.g.: npx jest tests/ui --env=jsdom

CI/CD highlights (GitHub Actions)
- code-quality job: ESLint, tsc --noEmit, npm audit
- test job: unit + integration, coverage, uploads lcov to Coveralls; services spin up Postgres and Redis
- e2e/performance/security jobs: call npm run test:e2e:run or dedicated jest files; jobs reference docker-compose.test.yml to provision test infra
- build-image job: multi-arch Docker image push to GHCR and SBOM generation
- deploy-staging/production jobs: expect k8s manifests under k8s/ and perform rollout checks; smoke tests run against staging URL

Repo-specific notes for Warp
- tsconfig path aliases are required during dev (ts-node-dev uses tsconfig-paths/register). When running ad hoc scripts with ts-node, include -r tsconfig-paths/register.
- Health check path: the Express app mounts /api/v1/health, while src/index.ts logs a /health URL. Use /api/v1/health unless running the SecureServer which exposes /health.
- Some CI/test references point to files not present in this repo:
  - docker-compose.test.yml is referenced by CI and tests/e2e/test-runner.ts but is not in the repository. For local E2E/perf/security runs, either create it or adapt commands to use docker compose up -f docker-compose.yml with the needed services.
  - docker/nginx/* and docker/prometheus/* are referenced by docker-compose.yml but those files/dirs are not present. Add them or remove the services for local-only stacks.
  - The UI test files may require jsdom; default jest.config.js sets testEnvironment to 'node'. Use --env=jsdom selectively if tests depend on DOM.
- Database migrations: there is a placeholder npm script (db:migrate:test). In Compose, the SQL files in src/database/migrations/ are mounted into the Postgres init directory and applied on first boot.

Conventions and paths (from repo rules)
- Strict TypeScript; two-space indentation and ESLint enforcement
- Prefer immutable patterns (const over let)
- File layout:
  - src/ for implementation (api/, services/, modules/, models/, database/, utils/, ui/)
  - tests/ split into unit, integration, e2e, smoke, load
- Use path aliases '@/...' from tsconfig.json instead of deep relative imports