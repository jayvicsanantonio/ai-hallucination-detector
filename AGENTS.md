# Repository Guidelines

## Project Structure & Module Organization
The TypeScript backend lives in `src/`, with `api/` for Express routers, `services/` for orchestration, `modules/` for domain verifiers, `database/` for data access, `models/` for typed contracts, `utils/` shared helpers, and `ui/` for dashboard surfaces. Tests sit under `tests/` split into `unit`, `integration`, `e2e`, and `smoke`; `tests/setup.ts` seeds Jest globals. Deployment assets reside in `docker/` and `k8s/`, reference docs in `docs/`, and generated artifacts in `dist/` and `coverage/`. Prefer path aliases such as `@/services/...` defined in `tsconfig.json`.

## Build, Test, and Development Commands
Run `npm install` once, then `npm run dev` for a hot-reloading server via `ts-node-dev`. Use `npm run build` to emit production code in `dist/`, followed by `npm start` when validating the compiled bundle. Quality gates include `npm run lint` / `npm run lint:fix`. Targeted tests: `npm run test:unit`, `npm run test:integration`, `npm run test:e2e`, plus specialty suites (`npm run test:performance`, `npm run test:security`, `npm run test:workflows`, `npm run test:smoke`). Capture reports with `npm run test:coverage`.

## Coding Style & Naming Conventions
The project is strict TypeScript (`strict` compiler mode). Follow two-space indentation, trailing commas per ESLint, and prefer immutable patterns (`const` over `let`). Use `PascalCase` for classes, `camelCase` for functions/variables, `UPPER_SNAKE_CASE` for environment keys. File names mirror exported types (`VerificationService.ts`, `jwt.ts`). Import modules via the `@/` aliases to keep relative paths shallow.

## Testing Guidelines
Jest with `ts-jest` is the primary framework; new tests belong beside the feature in `/tests/<layer>` using `*.test.ts` naming. Ensure deterministic mocks with `nock` for HTTP and `supertest` for API surfaces, configured through `tests/setup.ts`. Keep coverage steady by running `npm run test:coverage`; investigate regressions whenever HTML coverage in `coverage/index.html` drops below current baselines.

## Commit & Pull Request Guidelines
Commits use descriptive sentence-style summaries, e.g. `Fix potential null reference in compliance sorting logic`, and should scope to a single change set. Reference tickets with `Refs #123` when relevant. Pull requests must describe intent, list validation commands, note schema or config updates, and attach screenshots for UI-facing changes. Request reviews from domain owners (`api`, `verification-engine`) and confirm CI status before merging.

## Security & Configuration
Never commit secrets; use `.env` (copied from `.env.example`) and rely on Docker Compose for local stacks. When touching auth or data handling, update the corresponding guidance in `docs/` and flag for security review.
