import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { VerificationResultsDashboard } from '../../../../src/ui/dashboard/components/VerificationResultsDashboard';
import { VerificationResult } from '../../../../src/models/core/VerificationResult';

// Mock fetch
global.fetch = jest.fn();

const mockVerificationResult: VerificationResult = {
  verificationId: 'test-123',
  overallConfidence: 85,
  riskLevel: 'medium',
  processingTime: 1250,
  timestamp: new Date(),
  auditTrail: [],
  issues: [
    {
      id: 'issue-1',
      type: 'factual_error',
      severity: 'high',
      description: 'Statistical claim cannot be verified',
      confidence: 92,
      location: {
        start: 120,
        end: 180,
        line: 5,
      },
      evidence: ['Source data shows different values'],
      suggestedFix:
        'Verify the statistical claim with reliable sources',
      moduleSource: 'fact-checker',
    },
  ],
  recommendations: ['Review statistical claims for accuracy'],
};

describe('VerificationResultsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders dashboard with results', () => {
    render(
      <VerificationResultsDashboard
        results={[mockVerificationResult]}
      />
    );

    expect(
      screen.getByText('Verification Results Dashboard')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Verification Result: test-123')
    ).toBeInTheDocument();
  });

  it('displays confidence indicators correctly', () => {
    render(
      <VerificationResultsDashboard
        results={[mockVerificationResult]}
      />
    );

    expect(screen.getByText('85%')).toBeInTheDocument();
  });

  it('shows issue count correctly', () => {
    render(
      <VerificationResultsDashboard
        results={[mockVerificationResult]}
      />
    );

    expect(screen.getByText(/1.*issues found/)).toBeInTheDocument();
  });

  it('displays recommendations when available', () => {
    render(
      <VerificationResultsDashboard
        results={[mockVerificationResult]}
      />
    );

    expect(screen.getByText('Recommendations')).toBeInTheDocument();
    expect(
      screen.getByText('Review statistical claims for accuracy')
    ).toBeInTheDocument();
  });

  it('shows empty state when no results', () => {
    render(<VerificationResultsDashboard results={[]} />);

    expect(
      screen.getByText('No Verification Results')
    ).toBeInTheDocument();
  });
});
