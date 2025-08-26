# Design Document

## Overview

The monorepo conversion will restructure the CertaintyAI codebase into a workspace-based architecture with two main packages: a backend API service and a frontend React application. This design maintains the existing backend functionality while adding a modern web interface that consumes the API endpoints.

## Architecture

### Monorepo Structure

```
/
├── packages/
│   ├── backend/                  # Existing API moved here
│   │   ├── src/                  # Current src/ directory
│   │   ├── tests/                # Current tests/ directory
│   │   ├── k8s/                  # Kubernetes configs
│   │   ├── docker/               # Docker configs
│   │   ├── package.json          # Backend-specific dependencies
│   │   └── tsconfig.json         # Backend TypeScript config
│   └── frontend/                 # New React application
│       ├── src/
│       │   ├── components/       # React components
│       │   ├── pages/            # Page components
│       │   ├── services/         # API client services
│       │   ├── hooks/            # Custom React hooks
│       │   ├── types/            # TypeScript type definitions
│       │   └── utils/            # Utility functions
│       ├── public/               # Static assets
│       ├── package.json          # Frontend dependencies
│       └── tsconfig.json         # Frontend TypeScript config
├── package.json                  # Root workspace configuration
├── tsconfig.json                 # Shared TypeScript base config
├── .eslintrc.js                  # Shared ESLint configuration
├── .prettierrc                   # Shared Prettier configuration
├── docker-compose.yml            # Full-stack development setup
└── .kiro/                        # Kiro configuration (unchanged)
```

### Workspace Management

- **npm workspaces** for dependency management and script execution
- **Shared dependencies** hoisted to root level (TypeScript, ESLint, Prettier)
- **Package-specific dependencies** maintained in individual package.json files
- **Cross-package scripts** for building, testing, and linting all packages

## Components and Interfaces

### Frontend Application Components

#### Core Components

- **DocumentUploader**: File upload interface with drag-and-drop support
- **VerificationResults**: Display verification results with confidence scores
- **ProgressIndicator**: Show verification progress during processing
- **ErrorBoundary**: Handle and display application errors gracefully

#### Layout Components

- **Header**: Navigation and user authentication status
- **Sidebar**: Navigation menu for different sections
- **Layout**: Main application layout wrapper
- **Footer**: Application information and links

#### Feature Components

- **ConfidenceScoreDisplay**: Color-coded confidence indicators (0-100)
- **AuditTrailViewer**: Display audit information and compliance data
- **FeedbackForm**: Allow users to provide feedback on verification results
- **ResultsHistory**: View previous verification sessions

### API Client Services

#### VerificationService

```typescript
interface VerificationService {
  uploadDocument(file: File): Promise<VerificationSession>;
  getResults(sessionId: string): Promise<VerificationResult>;
  submitFeedback(
    sessionId: string,
    feedback: FeedbackData
  ): Promise<void>;
}
```

#### AuthService

```typescript
interface AuthService {
  login(credentials: LoginCredentials): Promise<AuthToken>;
  logout(): Promise<void>;
  refreshToken(): Promise<AuthToken>;
  getCurrentUser(): Promise<User>;
}
```

### State Management

- **React Context** for global application state (user authentication, theme)
- **React Query** for server state management and caching
- **Local state** with useState/useReducer for component-specific state

## Data Models

### Frontend-Specific Types

```typescript
interface UploadState {
  file: File | null;
  progress: number;
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface UIVerificationResult extends VerificationResult {
  displayColor: 'green' | 'yellow' | 'red';
  riskLevel: 'low' | 'medium' | 'high';
}

interface NavigationItem {
  path: string;
  label: string;
  icon: string;
  requiresAuth: boolean;
}
```

### Shared Types

The frontend will import and extend existing backend types:

- `VerificationResult` from backend models
- `AuditEntry` for audit trail display
- `FeedbackData` for user feedback
- `ComplianceRule` for compliance information

## Error Handling

### Frontend Error Handling

- **Error Boundaries** to catch React component errors
- **API Error Interceptors** to handle HTTP errors consistently
- **User-friendly error messages** mapped from backend error codes
- **Retry mechanisms** for transient network failures

### Error Display Strategy

- **Toast notifications** for temporary errors and success messages
- **Inline error messages** for form validation errors
- **Error pages** for critical application errors
- **Loading states** with error fallbacks

## Testing Strategy

### Frontend Testing

- **Unit Tests**: Jest + React Testing Library for component testing
- **Integration Tests**: Test API service integration and user workflows
- **E2E Tests**: Cypress for full application workflow testing
- **Visual Regression Tests**: Storybook + Chromatic for UI consistency

### Monorepo Testing

- **Workspace Scripts**: Run tests for individual packages or all packages
- **Shared Test Configuration**: Common Jest and testing utilities
- **CI/CD Integration**: Test both packages in parallel during builds

### Test Structure

```
packages/
├── backend/
│   └── tests/           # Existing backend tests
└── frontend/
    └── src/
        ├── components/
        │   └── __tests__/   # Component unit tests
        ├── services/
        │   └── __tests__/   # API service tests
        └── __tests__/       # Integration tests
```

## Build and Development

### Development Workflow

- **Concurrent Development**: Run both backend and frontend in development mode
- **Hot Reloading**: Vite for fast frontend development with HMR
- **API Proxy**: Frontend dev server proxies API requests to backend
- **Shared Scripts**: Root-level scripts to start, build, and test all packages

### Build Process

- **Independent Builds**: Each package can be built separately
- **Production Optimization**: Frontend built with Vite for optimal performance
- **Asset Management**: Static assets served efficiently in production
- **Environment Configuration**: Separate configs for development, staging, and production

### Docker Configuration

- **Multi-stage Builds**: Separate build stages for backend and frontend
- **Production Images**: Optimized images for deployment
- **Development Compose**: Full-stack development environment
- **Health Checks**: Container health monitoring for both services
