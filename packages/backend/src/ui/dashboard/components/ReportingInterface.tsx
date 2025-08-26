import React, { useState, useEffect } from 'react';
import { ExecutiveSummaryReport } from './ExecutiveSummaryReport';
import { TrendAnalysis } from './TrendAnalysis';
import { AuditReportExporter } from './AuditReportExporter';

export interface ReportingData {
  totalVerifications: number;
  averageConfidence: number;
  riskDistribution: Record<string, number>;
  issueTypes: Record<string, number>;
  timeRange: {
    start: Date;
    end: Date;
  };
  trends: {
    date: string;
    verifications: number;
    averageConfidence: number;
    issuesFound: number;
  }[];
}

interface ReportingInterfaceProps {
  onDataRefresh?: () => void;
}

export const ReportingInterface: React.FC<
  ReportingInterfaceProps
> = ({ onDataRefresh }) => {
  const [reportingData, setReportingData] =
    useState<ReportingData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTimeRange, setSelectedTimeRange] =
    useState<string>('7d');
  const [activeTab, setActiveTab] = useState<
    'summary' | 'trends' | 'export'
  >('summary');

  useEffect(() => {
    fetchReportingData();
  }, [selectedTimeRange]);

  const fetchReportingData = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/v1/reports/analytics?timeRange=${selectedTimeRange}`
      );
      if (!response.ok) {
        throw new Error(
          `Failed to fetch reporting data: ${response.statusText}`
        );
      }

      const data = await response.json();
      setReportingData(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleTimeRangeChange = (range: string) => {
    setSelectedTimeRange(range);
  };

  const handleRefresh = () => {
    fetchReportingData();
    onDataRefresh?.();
  };

  if (loading) {
    return (
      <div className="reporting-interface loading">
        <div className="loading-spinner">
          Loading analytics data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="reporting-interface error">
        <div className="error-message">
          <h3>Error Loading Analytics</h3>
          <p>{error}</p>
          <button onClick={handleRefresh}>Retry</button>
        </div>
      </div>
    );
  }

  return (
    <div className="reporting-interface">
      <header className="reporting-header">
        <h1>Analytics & Reporting</h1>

        <div className="reporting-controls">
          <div className="time-range-selector">
            <label htmlFor="timeRange">Time Range:</label>
            <select
              id="timeRange"
              value={selectedTimeRange}
              onChange={(e) => handleTimeRangeChange(e.target.value)}
            >
              <option value="1d">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="1y">Last Year</option>
            </select>
          </div>

          <button onClick={handleRefresh} className="refresh-btn">
            Refresh Data
          </button>
        </div>
      </header>

      <nav className="reporting-tabs">
        <button
          className={`tab-button ${
            activeTab === 'summary' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('summary')}
        >
          Executive Summary
        </button>
        <button
          className={`tab-button ${
            activeTab === 'trends' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('trends')}
        >
          Trend Analysis
        </button>
        <button
          className={`tab-button ${
            activeTab === 'export' ? 'active' : ''
          }`}
          onClick={() => setActiveTab('export')}
        >
          Export Reports
        </button>
      </nav>

      <div className="reporting-content">
        {reportingData && (
          <>
            {activeTab === 'summary' && (
              <ExecutiveSummaryReport data={reportingData} />
            )}

            {activeTab === 'trends' && (
              <TrendAnalysis data={reportingData} />
            )}

            {activeTab === 'export' && (
              <AuditReportExporter
                data={reportingData}
                timeRange={selectedTimeRange}
              />
            )}
          </>
        )}

        {!reportingData && !loading && (
          <div className="no-data">
            <h2>No Analytics Data Available</h2>
            <p>
              No verification data found for the selected time range.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
