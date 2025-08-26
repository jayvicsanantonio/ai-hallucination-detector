import React from 'react';
import { Issue } from '../../../models/core/VerificationResult';

interface RiskVisualizationProps {
  riskLevel: string;
  issues: Issue[];
}

export const RiskVisualization: React.FC<RiskVisualizationProps> = ({
  riskLevel,
  issues,
}) => {
  const getRiskColor = (level: string): string => {
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

  const getRiskDescription = (level: string): string => {
    switch (level) {
      case 'low':
        return 'Content appears reliable with minimal concerns';
      case 'medium':
        return 'Some issues detected that may require attention';
      case 'high':
        return 'Significant issues found that should be addressed';
      case 'critical':
        return 'Critical issues detected - immediate action required';
      default:
        return 'Risk level assessment unavailable';
    }
  };

  const getRiskIcon = (level: string): string => {
    switch (level) {
      case 'low':
        return '✓';
      case 'medium':
        return '⚠';
      case 'high':
        return '⚠';
      case 'critical':
        return '⚠';
      default:
        return '?';
    }
  };

  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalIssues = issues.length;
  const criticalIssues = severityCounts.critical || 0;
  const highIssues = severityCounts.high || 0;

  return (
    <div className="risk-visualization">
      <div className="risk-header">
        <h3>Risk Assessment</h3>
      </div>

      <div className="risk-indicator">
        <div
          className="risk-circle"
          style={{ backgroundColor: getRiskColor(riskLevel) }}
        >
          <span className="risk-icon">{getRiskIcon(riskLevel)}</span>
        </div>

        <div className="risk-details">
          <div className="risk-level">
            <span
              className="risk-badge"
              style={{ backgroundColor: getRiskColor(riskLevel) }}
            >
              {riskLevel.toUpperCase()} RISK
            </span>
          </div>

          <div className="risk-description">
            {getRiskDescription(riskLevel)}
          </div>
        </div>
      </div>

      <div className="risk-breakdown">
        <div className="breakdown-item">
          <span className="breakdown-label">Total Issues</span>
          <span className="breakdown-value">{totalIssues}</span>
        </div>

        {criticalIssues > 0 && (
          <div className="breakdown-item critical">
            <span className="breakdown-label">Critical</span>
            <span className="breakdown-value">{criticalIssues}</span>
          </div>
        )}

        {highIssues > 0 && (
          <div className="breakdown-item high">
            <span className="breakdown-label">High Priority</span>
            <span className="breakdown-value">{highIssues}</span>
          </div>
        )}
      </div>

      {(criticalIssues > 0 || highIssues > 0) && (
        <div className="risk-warning">
          <div className="warning-icon">⚠</div>
          <div className="warning-text">
            {criticalIssues > 0
              ? `${criticalIssues} critical issue${
                  criticalIssues > 1 ? 's' : ''
                } require immediate attention`
              : `${highIssues} high priority issue${
                  highIssues > 1 ? 's' : ''
                } should be addressed promptly`}
          </div>
        </div>
      )}

      <div className="risk-chart">
        <div className="chart-title">Issue Distribution</div>
        <div className="chart-bars">
          {Object.entries(severityCounts).map(([severity, count]) => {
            const percentage = (count / totalIssues) * 100;
            return (
              <div key={severity} className="chart-bar">
                <div className="bar-label">{severity}</div>
                <div className="bar-container">
                  <div
                    className="bar-fill"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: getRiskColor(severity),
                    }}
                  />
                </div>
                <div className="bar-value">{count}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
