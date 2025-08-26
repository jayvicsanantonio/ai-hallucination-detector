import React from 'react';
import { ReportingData } from './ReportingInterface';

interface ExecutiveSummaryReportProps {
  data: ReportingData;
}

export const ExecutiveSummaryReport: React.FC<
  ExecutiveSummaryReportProps
> = ({ data }) => {
  const formatNumber = (num: number): string => {
    return new Intl.NumberFormat().format(num);
  };

  const formatPercentage = (num: number): string => {
    return `${num.toFixed(1)}%`;
  };

  const getRiskLevelColor = (level: string): string => {
    switch (level) {
      case 'low':
        return '#22c55e';
      case 'medium':
        return '#f59e0b';
      case 'high':
        return '#ef4444';
      case 'critical':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const getIssueTypeColor = (type: string): string => {
    switch (type) {
      case 'factual_error':
        return '#ef4444';
      case 'logical_inconsistency':
        return '#f59e0b';
      case 'compliance_violation':
        return '#dc2626';
      default:
        return '#6b7280';
    }
  };

  const totalIssues = Object.values(data.issueTypes).reduce(
    (sum, count) => sum + count,
    0
  );
  const totalRiskItems = Object.values(data.riskDistribution).reduce(
    (sum, count) => sum + count,
    0
  );

  return (
    <div className="executive-summary-report">
      <div className="summary-header">
        <h2>Executive Summary</h2>
        <div className="report-period">
          {data.timeRange.start.toLocaleDateString()} -{' '}
          {data.timeRange.end.toLocaleDateString()}
        </div>
      </div>

      <div className="key-metrics">
        <div className="metric-card primary">
          <div className="metric-value">
            {formatNumber(data.totalVerifications)}
          </div>
          <div className="metric-label">Total Verifications</div>
          <div className="metric-description">
            Documents processed during this period
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">
            {formatPercentage(data.averageConfidence)}
          </div>
          <div className="metric-label">Average Confidence</div>
          <div className="metric-description">
            Mean confidence score across all verifications
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">
            {formatNumber(totalIssues)}
          </div>
          <div className="metric-label">Issues Detected</div>
          <div className="metric-description">
            Total issues found across all documents
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-value">
            {totalIssues > 0
              ? formatPercentage(
                  (totalIssues / data.totalVerifications) * 100
                )
              : '0%'}
          </div>
          <div className="metric-label">Issue Rate</div>
          <div className="metric-description">
            Percentage of documents with issues
          </div>
        </div>
      </div>

      <div className="summary-sections">
        <div className="summary-section">
          <h3>Risk Distribution</h3>
          <div className="risk-breakdown">
            {Object.entries(data.riskDistribution).map(
              ([level, count]) => {
                const percentage =
                  totalRiskItems > 0
                    ? (count / totalRiskItems) * 100
                    : 0;
                return (
                  <div key={level} className="risk-item">
                    <div className="risk-header">
                      <span
                        className="risk-indicator"
                        style={{
                          backgroundColor: getRiskLevelColor(level),
                        }}
                      />
                      <span className="risk-level">
                        {level.charAt(0).toUpperCase() +
                          level.slice(1)}{' '}
                        Risk
                      </span>
                      <span className="risk-count">
                        {formatNumber(count)}
                      </span>
                    </div>
                    <div className="risk-bar">
                      <div
                        className="risk-fill"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: getRiskLevelColor(level),
                        }}
                      />
                    </div>
                    <div className="risk-percentage">
                      {formatPercentage(percentage)}
                    </div>
                  </div>
                );
              }
            )}
          </div>
        </div>

        <div className="summary-section">
          <h3>Issue Types</h3>
          <div className="issue-breakdown">
            {Object.entries(data.issueTypes).map(([type, count]) => {
              const percentage =
                totalIssues > 0 ? (count / totalIssues) * 100 : 0;
              const typeLabel = type
                .split('_')
                .map(
                  (word) =>
                    word.charAt(0).toUpperCase() + word.slice(1)
                )
                .join(' ');

              return (
                <div key={type} className="issue-item">
                  <div className="issue-header">
                    <span
                      className="issue-indicator"
                      style={{
                        backgroundColor: getIssueTypeColor(type),
                      }}
                    />
                    <span className="issue-type">{typeLabel}</span>
                    <span className="issue-count">
                      {formatNumber(count)}
                    </span>
                  </div>
                  <div className="issue-bar">
                    <div
                      className="issue-fill"
                      style={{
                        width: `${percentage}%`,
                        backgroundColor: getIssueTypeColor(type),
                      }}
                    />
                  </div>
                  <div className="issue-percentage">
                    {formatPercentage(percentage)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="summary-insights">
        <h3>Key Insights</h3>
        <div className="insights-list">
          {data.averageConfidence >= 90 && (
            <div className="insight positive">
              <span className="insight-icon">✓</span>
              <span className="insight-text">
                High system confidence (
                {formatPercentage(data.averageConfidence)}) indicates
                reliable verification results.
              </span>
            </div>
          )}

          {data.averageConfidence < 70 && (
            <div className="insight warning">
              <span className="insight-icon">⚠</span>
              <span className="insight-text">
                Lower confidence scores (
                {formatPercentage(data.averageConfidence)}) may
                require additional review processes.
              </span>
            </div>
          )}

          {(data.riskDistribution.critical || 0) > 0 && (
            <div className="insight critical">
              <span className="insight-icon">⚠</span>
              <span className="insight-text">
                {formatNumber(data.riskDistribution.critical)}{' '}
                critical risk items require immediate attention.
              </span>
            </div>
          )}

          {totalIssues === 0 && (
            <div className="insight positive">
              <span className="insight-icon">✓</span>
              <span className="insight-text">
                No issues detected during this period - excellent
                content quality.
              </span>
            </div>
          )}

          {totalIssues / data.totalVerifications > 0.5 && (
            <div className="insight warning">
              <span className="insight-icon">⚠</span>
              <span className="insight-text">
                High issue rate (
                {formatPercentage(
                  (totalIssues / data.totalVerifications) * 100
                )}
                ) suggests need for improved content review processes.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
