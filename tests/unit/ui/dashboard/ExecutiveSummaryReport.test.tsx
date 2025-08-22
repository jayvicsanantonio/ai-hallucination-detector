import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ExecutiveSummaryReport } from '../../../../src/ui/dashboard/components/ExecutiveSummaryReport';

const mockReportingData = {
  totalVerifications: 1250,
  averageConfidence: 87.5,
  riskDistribution: {
    low: 800,
    medium: 350,
    high: 80,
    critical: 20,
  },
  issueTypes: {
    factual_error: 45,
    logical_inconsistency: 32,
    compliance_violation: 18,
  },
  timeRange: {
    start: new Date('2024-01-01'),
    end: new Date('2024-01-07'),
  },
  trends: [],
};

describe('ExecutiveSummaryReport', () => {
  it('renders executive summary with key metrics', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    expect(screen.getByText('Executive Summary')).toBeInTheDocument();
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Total verifications
    expect(screen.getByText('87.5%')).toBeInTheDocument(); // Average confidence
  });

  it('displays risk distribution correctly', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    expect(screen.getByText('Risk Distribution')).toBeInTheDocument();
    expect(screen.getByText('Low Risk')).toBeInTheDocument();
    expect(screen.getByText('Medium Risk')).toBeInTheDocument();
    expect(screen.getByText('High Risk')).toBeInTheDocument();
    expect(screen.getByText('Critical Risk')).toBeInTheDocument();
  });

  it('shows issue types breakdown', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    expect(screen.getByText('Issue Types')).toBeInTheDocument();
    expect(screen.getByText('Factual Error')).toBeInTheDocument();
    expect(
      screen.getByText('Logical Inconsistency')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Compliance Violation')
    ).toBeInTheDocument();
  });

  it('calculates issue rate correctly', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    // Total issues: 45 + 32 + 18 = 95
    // Issue rate: (95 / 1250) * 100 = 7.6%
    expect(screen.getByText('7.6%')).toBeInTheDocument();
  });

  it('displays key insights based on data', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    expect(screen.getByText('Key Insights')).toBeInTheDocument();

    // Should show critical risk warning
    expect(
      screen.getByText(
        /20 critical risk items require immediate attention/
      )
    ).toBeInTheDocument();
  });

  it('shows positive insight for high confidence', () => {
    const highConfidenceData = {
      ...mockReportingData,
      averageConfidence: 95.2,
    };

    render(<ExecutiveSummaryReport data={highConfidenceData} />);

    expect(
      screen.getByText(
        /High system confidence.*indicates reliable verification results/
      )
    ).toBeInTheDocument();
  });

  it('shows warning for low confidence', () => {
    const lowConfidenceData = {
      ...mockReportingData,
      averageConfidence: 65.8,
    };

    render(<ExecutiveSummaryReport data={lowConfidenceData} />);

    expect(
      screen.getByText(
        /Lower confidence scores.*may require additional review/
      )
    ).toBeInTheDocument();
  });

  it('shows positive insight when no issues found', () => {
    const noIssuesData = {
      ...mockReportingData,
      issueTypes: {},
    };

    render(<ExecutiveSummaryReport data={noIssuesData} />);

    expect(
      screen.getByText(/No issues detected during this period/)
    ).toBeInTheDocument();
  });

  it('formats numbers correctly', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    // Should format large numbers with commas
    expect(screen.getByText('1,250')).toBeInTheDocument();
  });

  it('displays report period correctly', () => {
    render(<ExecutiveSummaryReport data={mockReportingData} />);

    expect(
      screen.getByText('1/1/2024 - 1/7/2024')
    ).toBeInTheDocument();
  });
});
