# CertaintyAI Monorepo

Enterprise AI hallucination detection system organized as a monorepo with backend and frontend packages.

## Project Structure

```
/
├── packages/
│   └── backend/                  # API service (moved from root)
│       ├── src/                  # Source code
│       ├── tests/                # Test suites
│       ├── k8s/                  # Kubernetes configs
│       ├── docker/               # Docker configs
│       ├── package.json          # Backend dependencies
│       └── tsconfig.json         # Backend TypeScript config
├── package.json                  # Root workspace configuration
├── tsconfig.json                 # Shared TypeScript base config
├── .eslintrc.js                  # Shared ESLint configuration
├── .prettierrc                   # Shared Prettier configuration
└── .kiro/                        # Kiro configuration
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 8+

### Installation

```bash
# Install all dependencies for all packages
npm install
```

### Development

```bash
# Start backend development server
npm run dev:backend

# Build all packages
npm run build

# Build specific package
npm run build:backend

# Run tests for all packages
npm run test

# Run tests for specific package
npm run test:backend

# Lint all packages
npm run lint

# Lint and fix all packages
npm run lint:fix
```

### Workspace Commands

The monorepo uses npm workspaces. You can run commands in specific packages:

```bash
# Run command in specific workspace
npm run <command> --workspace=@certaintyai/backend

# Install dependency in specific workspace
npm install <package> --workspace=@certaintyai/backend
```

## Packages

### @certaintyai/backend

The main API service providing AI hallucination detection capabilities.

- **Location**: `packages/backend/`
- **Port**: 3000 (development)
- **Technologies**: Node.js, TypeScript, Express, PostgreSQL, Redis

## Shared Configuration

- **TypeScript**: Base configuration in root `tsconfig.json`
- **ESLint**: Shared rules in root `.eslintrc.js`
- **Prettier**: Code formatting rules in root `.prettierrc`

## Next Steps

This monorepo is ready for frontend package addition. The next task will be to create the React frontend application in `packages/frontend/`.
