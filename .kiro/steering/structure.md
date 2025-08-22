# Project Structure

## Directory Organization

```
/
├── src/                          # Source code
│   ├── api/                      # API Gateway and routes
│   │   ├── gateway/              # Express.js API gateway
│   │   ├── routes/               # Route handlers (/verify, /results, /feedback)
│   │   └── middleware/           # Auth, validation, rate limiting
│   ├── services/                 # Core business services
│   │   ├── content-processing/   # Document parsing and extraction
│   │   ├── verification-engine/  # Main orchestration service
│   │   ├── audit-logger/         # Compliance and audit logging
│   │   └── learning/             # Feedback processing and ML training
│   ├── modules/                  # Verification modules
│   │   ├── fact-checker/         # Knowledge base integration
│   │   ├── logic-analyzer/       # Consistency and contradiction detection
│   │   ├── compliance-validator/ # Regulatory compliance checking
│   │   └── domain/               # Industry-specific modules
│   │       ├── legal/            # Legal domain validation
│   │       ├── financial/        # Financial compliance and accuracy
│   │       ├── healthcare/       # Medical accuracy and HIPAA
│   │       └── insurance/        # Insurance policy compliance
│   ├── models/                   # Data models and interfaces
│   │   ├── core/                 # ParsedContent, VerificationResult
│   │   ├── audit/                # AuditEntry, VerificationSession
│   │   └── knowledge/            # FactualClaim, ComplianceRule
│   ├── database/                 # Database schemas and migrations
│   │   ├── migrations/           # PostgreSQL schema migrations
│   │   └── seeds/                # Initial data and test fixtures
│   └── utils/                    # Shared utilities and helpers
├── tests/                        # Test suites
│   ├── unit/                     # Unit tests for individual components
│   ├── integration/              # Service integration tests
│   └── e2e/                      # End-to-end workflow tests
├── docs/                         # Documentation
├── k8s/                          # Kubernetes deployment configs
├── docker/                       # Docker configurations
└── .kiro/                        # Kiro IDE configuration
    ├── specs/                    # Feature specifications
    └── steering/                 # AI assistant guidance rules
```

## Key Architectural Principles

- **Separation of Concerns**: Each module handles a specific verification aspect
- **Domain-Driven Design**: Industry-specific modules for specialized validation
- **Microservice Ready**: Services can be deployed independently
- **Test-Driven**: Comprehensive test coverage at unit, integration, and e2e levels
- **Configuration-Driven**: Environment-specific configs for different deployments

## File Naming Conventions

- **Services**: kebab-case directories, PascalCase classes (`content-processing/ContentProcessor.ts`)
- **Models**: PascalCase for interfaces and classes (`VerificationResult.ts`)
- **Tests**: Match source file names with `.test.ts` suffix
- **Configs**: Environment-specific naming (`config.dev.json`, `config.prod.json`)

## Import Structure

- Absolute imports from `src/` root using TypeScript path mapping
- Domain modules import only from their own directory and shared models
- Services communicate through well-defined interfaces
- No circular dependencies between modules
