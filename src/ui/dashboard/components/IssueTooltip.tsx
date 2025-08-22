import React from 'react';
import { Issue } from '../../../models/core/VerificationResult';

interface IssueTooltipProps {
  issue: Issue;
  onClose: () => void;
}

export const IssueTooltip: React.FC<IssueTooltipProps> = ({
  issue,
  onClose,
}) => {
  const getIssueTypeDescription = (type: string): string => {
    switch (type) {
      case 'factual_error':
        return 'This content contains information that contradicts verified facts or reliable sources.';
      case 'logical_inconsistency':
        return 'The content contains statements that contradict each other or follow invalid logical patterns.';
      case 'compliance_violation':
        return 'This content violates regulatory requirements or industry compliance standards.';
      default:
        return 'An issue was detected in this content that requires attention.';
    }
  };

  const getSeverityDescription = (severity: string): string => {
    switch (severity) {
      case 'critical':
        return 'Immediate action required. This issue poses significant risk and must be addressed before publication.';
      case 'high':
        return 'High priority issue that should be resolved promptly to avoid potential problems.';
      case 'medium':
        return 'Moderate concern that should be reviewed and addressed when possible.';
      case 'low':
        return 'Minor issue that may be addressed as part of routine content review.';
      default:
        return 'This issue requires review and consideration.';
    }
  };

  return (
    <div className="issue-tooltip-overlay" onClick={onClose}>
      <div
        className="issue-tooltip"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tooltip-header">
          <h4>Issue Details</h4>
          <button className="close-button" onClick={onClose}>
            ×
          </button>
        </div>

        <div className="tooltip-content">
          <div className="tooltip-section">
            <h5>Issue Type</h5>
            <p>{getIssueTypeDescription(issue.type)}</p>
          </div>

          <div className="tooltip-section">
            <h5>Severity Level</h5>
            <p>{getSeverityDescription(issue.severity)}</p>
          </div>

          <div className="tooltip-section">
            <h5>Confidence Score</h5>
            <p>
              Our system is {issue.confidence}% confident that this is
              a valid issue. Higher confidence scores indicate more
              reliable detections.
            </p>
          </div>

          {issue.evidence.length > 0 && (
            <div className="tooltip-section">
              <h5>Supporting Evidence</h5>
              <ul>
                {issue.evidence.map((evidence, index) => (
                  <li key={index}>{evidence}</li>
                ))}
              </ul>
            </div>
          )}

          {issue.suggestedFix && (
            <div className="tooltip-section">
              <h5>Recommended Action</h5>
              <p>{issue.suggestedFix}</p>
            </div>
          )}

          <div className="tooltip-section">
            <h5>Location Information</h5>
            <p>
              Found at line {issue.location.line}, characters{' '}
              {issue.location.start} to {issue.location.end}.
            </p>
          </div>
        </div>

        <div className="tooltip-actions">
          <button className="action-button primary" onClick={onClose}>
            Understood
          </button>
        </div>
      </div>
    </div>
  );
};
