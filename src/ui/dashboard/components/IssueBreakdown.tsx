import React, { useState } from 'react';
import { Issue } from '../../../models/core/VerificationResult';
import { IssueTooltip } from './IssueTooltip';

interface IssueBreakdownProps {
  issues: Issue[];
  verificationId: string;
}

export const IssueBreakdown: React.FC<IssueBreakdownProps> = ({
  issues,
  verificationId,
}) => {
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(
    null
  );
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

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

  const getSeverityColor = (severity: string): string => {
    switch (severity) {
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

  const getIssueTypeLabel = (type: string): string => {
    switch (type) {
      case 'factual_error':
        return 'Factual Error';
      case 'logical_inconsistency':
        return 'Logical Inconsistency';
      case 'compliance_violation':
        return 'Compliance Violation';
      default:
        return type;
    }
  };

  const filteredIssues = issues.filter((issue) => {
    const typeMatch =
      filterType === 'all' || issue.type === filterType;
    const severityMatch =
      filterSeverity === 'all' || issue.severity === filterSeverity;
    return typeMatch && severityMatch;
  });

  const issueTypeCounts = issues.reduce((acc, issue) => {
    acc[issue.type] = (acc[issue.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const severityCounts = issues.reduce((acc, issue) => {
    acc[issue.severity] = (acc[issue.severity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleIssueClick = (issue: Issue) => {
    setSelectedIssue(
      selectedIssue?.location.start === issue.location.start
        ? null
        : issue
    );
  };

  return (
    <div className="issue-breakdown">
      <div className="breakdown-header">
        <h3>Issue Analysis ({issues.length} issues found)</h3>

        <div className="breakdown-filters">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Types</option>
            <option value="factual_error">Factual Errors</option>
            <option value="logical_inconsistency">
              Logical Inconsistencies
            </option>
            <option value="compliance_violation">
              Compliance Violations
            </option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="breakdown-summary">
        <div className="summary-section">
          <h4>By Type</h4>
          <div className="summary-items">
            {Object.entries(issueTypeCounts).map(([type, count]) => (
              <div key={type} className="summary-item">
                <span
                  className="summary-indicator"
                  style={{ backgroundColor: getIssueTypeColor(type) }}
                />
                <span className="summary-label">
                  {getIssueTypeLabel(type)}
                </span>
                <span className="summary-count">{count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="summary-section">
          <h4>By Severity</h4>
          <div className="summary-items">
            {Object.entries(severityCounts).map(
              ([severity, count]) => (
                <div key={severity} className="summary-item">
                  <span
                    className="summary-indicator"
                    style={{
                      backgroundColor: getSeverityColor(severity),
                    }}
                  />
                  <span className="summary-label">
                    {severity.charAt(0).toUpperCase() +
                      severity.slice(1)}
                  </span>
                  <span className="summary-count">{count}</span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <div className="issues-list">
        {filteredIssues.length === 0 ? (
          <div className="no-issues">
            <p>No issues match the current filters.</p>
          </div>
        ) : (
          filteredIssues.map((issue, index) => (
            <div
              key={index}
              className={`issue-item ${
                selectedIssue === issue ? 'selected' : ''
              }`}
              onClick={() => handleIssueClick(issue)}
            >
              <div className="issue-header">
                <div className="issue-type-badge">
                  <span
                    className="type-indicator"
                    style={{
                      backgroundColor: getIssueTypeColor(issue.type),
                    }}
                  />
                  <span className="type-label">
                    {getIssueTypeLabel(issue.type)}
                  </span>
                </div>

                <div className="issue-severity">
                  <span
                    className="severity-badge"
                    style={{
                      backgroundColor: getSeverityColor(
                        issue.severity
                      ),
                      color: 'white',
                    }}
                  >
                    {issue.severity.toUpperCase()}
                  </span>
                </div>

                <div className="issue-confidence">
                  {issue.confidence}% confidence
                </div>
              </div>

              <div className="issue-content">
                <p className="issue-description">
                  {issue.description}
                </p>

                <div className="issue-location">
                  <strong>Location:</strong> Line{' '}
                  {issue.location.line}, Characters{' '}
                  {issue.location.start}-{issue.location.end}
                </div>

                {issue.evidence.length > 0 && (
                  <div className="issue-evidence">
                    <strong>Evidence:</strong>
                    <ul>
                      {issue.evidence.map(
                        (evidence, evidenceIndex) => (
                          <li key={evidenceIndex}>{evidence}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}

                {issue.suggestedFix && (
                  <div className="issue-suggestion">
                    <strong>Suggested Fix:</strong>
                    <p>{issue.suggestedFix}</p>
                  </div>
                )}
              </div>

              {selectedIssue === issue && (
                <IssueTooltip
                  issue={issue}
                  onClose={() => setSelectedIssue(null)}
                />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
