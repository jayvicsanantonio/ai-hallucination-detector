import React from 'react';
import {
  render,
  screen,
  fireEvent,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import { ReportingInterface } from '../../../../src/ui/dashboard/components/ReportingInterface';

// Mock fetch
global.fetch = jest.fn();

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
  trends: [
    {
      date: '2024-01-01',
      verifications: 180,
      averageConfidence: 85.2,
      issuesFound: 12,
    },
    {
      date: '2024-01-02',
      verifications: 195,
      averageConfidence: 87.1,
      issuesFound: 8,
    },
    {
      date: '2024-01-03',
      verifications: 210,
      averageConfidence: 89.3,
      issuesFound: 6,
    },
  ],
};

describe('ReportingInterface', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => mockReportingData,
    } as Response);
  });

  it('renders reporting interface with analytics data', async () => {
    render(<ReportingInterface />);

    expect(
      screen.getByText('Analytics & Reporting')
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText('Executive Summary')
      ).toBeInTheDocument();
    });
  });

  it('displays time range selector', () => {
    render(<ReportingInterface />);

    expect(screen.getByLabelText('Time Range:')).toBeInTheDocument();
    expect(
      screen.getByDisplayValue('Last 7 Days')
    ).toBeInTheDocument();
  });

  it('shows loading state while fetching data', () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    render(<ReportingInterface />);

    expect(
      screen.getByText('Loading analytics data...')
    ).toBeInTheDocument();
  });

  it('handles fetch errors gracefully', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
      new Error('Network error')
    );

    render(<ReportingInterface />);

    await waitFor(() => {
      expect(
        screen.getByText('Error Loading Analytics')
      ).toBeInTheDocument();
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('switches between tabs correctly', async () => {
    render(<ReportingInterface />);

    await waitFor(() => {
      expect(
        screen.getByText('Executive Summary')
      ).toBeInTheDocument();
    });

    // Switch to Trend Analysis tab
    fireEvent.click(screen.getByText('Trend Analysis'));
    expect(screen.getByText('Trend Analysis')).toBeInTheDocument();

    // Switch to Export Reports tab
    fireEvent.click(screen.getByText('Export Reports'));
    expect(screen.getByText('Export Reports')).toBeInTheDocument();
  });

  it('calls onDataRefresh when refresh button is clicked', async () => {
    const mockOnRefresh = jest.fn();
    render(<ReportingInterface onDataRefresh={mockOnRefresh} />);

    await waitFor(() => {
      expect(screen.getByText('Refresh Data')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Refresh Data'));
    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it('updates time range and refetches data', async () => {
    render(<ReportingInterface />);

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/reports/analytics?timeRange=7d'
      );
    });

    const timeRangeSelect = screen.getByLabelText('Time Range:');
    fireEvent.change(timeRangeSelect, { target: { value: '30d' } });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith(
        '/api/v1/reports/analytics?timeRange=30d'
      );
    });
  });

  it('shows no data message when no analytics data available', async () => {
    (fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
      ok: true,
      json: async () => null,
    } as Response);

    render(<ReportingInterface />);

    await waitFor(() => {
      expect(
        screen.getByText('No Analytics Data Available')
      ).toBeInTheDocument();
    });
  });
});
