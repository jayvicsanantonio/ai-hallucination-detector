#!/bin/bash

# Script to run core tests that are working
# This excludes tests that require external services (Redis, PostgreSQL)

echo "🧪 Running core CertaintyAI tests..."

# Run model tests (these are working well)
echo "📋 Running model tests..."
pnpm test --testPathPattern=tests/unit/models --verbose

# Run some service tests that don't require external connections
echo "📋 Running service tests (selected)..."
pnpm test --testPathPattern=tests/unit/services/audit-logger --verbose
pnpm test --testPathPattern=tests/unit/services/learning --verbose

# Run module tests
echo "📋 Running module tests..."
pnpm test --testPathPattern=tests/unit/modules/fact-checker/SourceCredibilityScorer.test.ts --verbose
pnpm test --testPathPattern=tests/unit/modules/fact-checker/MockKnowledgeBase.test.ts --verbose

echo "✅ Core tests completed!"