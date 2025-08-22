// Jest test setup file
import { config } from 'dotenv';
import '@testing-library/jest-dom';

// Load test environment variables
config({ path: '.env.test' });

// Set test environment variables
process.env.JWT_SECRET = 'test-jwt-secret-for-testing';
process.env.NODE_ENV = 'test';

// Global test setup
beforeAll(async () => {
  // Setup test database, Redis, etc.
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup test resources
  console.log('Cleaning up test environment...');
});

// Mock external services by default
jest.mock('redis', () => ({
  createClient: jest.fn(() => ({
    connect: jest.fn(),
    disconnect: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
  })),
}));

// Global test utilities
(global as any).testUtils = {
  createMockVerificationRequest: () => ({
    content: {
      id: 'test-content-id',
      originalContent: 'Test content',
      extractedText: 'Test content',
      contentType: 'text' as const,
      structure: {
        sections: [],
        tables: [],
        figures: [],
        references: [],
      },
      entities: [],
      metadata: {},
      createdAt: new Date(),
    },
    domain: 'legal' as const,
    urgency: 'medium' as const,
    metadata: {},
  }),
};
