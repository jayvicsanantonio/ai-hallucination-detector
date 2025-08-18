# CertaintyAI - AI Hallucination Detection System

CertaintyAI is an enterprise AI hallucination detection system that acts as a verification layer for AI-generated content. The system integrates into existing workflows to catch factual errors, logical inconsistencies, and compliance violations before they reach clients or regulators.

## Features

- **Real-time verification** of AI outputs within 2 seconds
- **Multi-industry support** for legal, financial, healthcare, and insurance sectors
- **Complete audit trails** for regulatory compliance and risk management
- **Domain-specific learning** that improves accuracy over time through feedback

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL 13+
- Redis 6+

### Installation

1. Clone the repository
2. Install dependencies:

   ```bash
   npm install
   ```

3. Copy environment configuration:

   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your database and Redis configurations

5. Start the development server:
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Compile TypeScript to JavaScript
- `npm test` - Run all tests
- `npm run test:unit` - Run unit tests only
- `npm run test:integration` - Run integration tests
- `npm run test:e2e` - Run end-to-end tests
- `npm run test:coverage` - Generate test coverage report
- `npm run lint` - Run ESLint for code quality

## API Endpoints

### Health Check

```
GET /health
```

### Verification

```
POST /api/v1/verify
POST /api/v1/verify/batch
GET /api/v1/results/{verificationId}
POST /api/v1/feedback
```

## Project Structure

```
src/
├── api/                      # API Gateway and routes
├── services/                 # Core business services
├── modules/                  # Verification modules
├── models/                   # Data models and interfaces
├── database/                 # Database schemas and migrations
└── utils/                    # Shared utilities
```

## Architecture

The system follows a microservices pattern with:

- **API Gateway**: Entry point with authentication and rate limiting
- **Verification Engine**: Orchestrates all verification modules
- **Domain Modules**: Industry-specific validation (legal, financial, healthcare)
- **Knowledge Base**: Factual information for verification
- **Audit Logger**: Comprehensive compliance tracking

## Contributing

1. Follow the existing code style and patterns
2. Write tests for new functionality
3. Update documentation as needed
4. Ensure all tests pass before submitting

## License

MIT License - see LICENSE file for details
