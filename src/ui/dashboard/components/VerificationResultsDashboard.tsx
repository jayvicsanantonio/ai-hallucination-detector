import React, { useState, useEffect } from 'react';
import {
  VerificationResult,
  Issue,
} from '../../../models/core/VerificationResult';
import { ConfidenceIndicator } from './ConfidenceIndicator';
import { IssueBreakdown } from './IssueBreakdown';
import { RiskVisualization } from './RiskVisualization';

interface VerificationResultsDashboardProps {
  verificationId?: string;
  results?: VerificationResult[];
  onRefresh?: () => void;
}

export const VerificationResultsDashboard: React.FC<
  VerificationResultsDashboardProps
> = ({ verificationId, results = [], onRefresh }) => {
  const [selectedResult, setSelectedResult] =
    useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (verificationId && !selectedResult) {
      fetchVerificationResult(verificationId);
    }
  }, [verificationId]);

  const fetchVerificationResult = async (id: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/v1/results/${id}`);
      if (!response.ok) {
        throw new Error(
          `Failed to fetch verification result: ${response.statusText}`
        );
      }

      const result = await response.json();
      setSelectedResult(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Unknown error occurred'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResultSelect = (result: VerificationResult) => {
    setSelectedResult(result);
  };

  const getRiskColor = (riskLevel: string): string => {
    switch (riskLevel) {
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

  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return '#22c55e';
    if (confidence >= 70) return '#f59e0b';
    if (confidence >= 50) return '#ef4444';
    return '#dc2626';
  };

  if (loading) {
    return (
      <div className="dashboard-container loading">
        <div className="loading-spinner">
          Loading verification results...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container error">
        <div className="error-message">
          <h3>Error Loading Results</h3>
          <p>{error}</p>
          <button onClick={() => onRefresh?.()}>Retry</button>
        </div>
      </div>
    );
  }

  const displayResults = selectedResult ? [selectedResult] : results;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Verification Results Dashboard</h1>
        <div className="dashboard-actions">
          <button onClick={onRefresh} className="refresh-btn">
            Refresh
          </button>
        </div>
      </header>

      <div className="dashboard-content">
        {results.length > 1 && (
          <div className="results-list">
            <h2>Recent Verifications</h2>
            <div className="results-grid">
              {results.map((result) => (
                <div
                  key={result.verificationId}
                  className={`result-card ${
                    selectedResult?.verificationId ===
                    result.verificationId
                      ? 'selected'
                      : ''
                  }`}
                  onClick={() => handleResultSelect(result)}
                >
                  <div className="result-header">
                    <span className="verification-id">
                      {result.verificationId}
                    </span>
                    <ConfidenceIndicator
                      confidence={result.overallConfidence}
                      size="small"
                    />
                  </div>
                  <div className="result-summary">
                    <span
                      className="risk-badge"
                      style={{
                        backgroundColor: getRiskColor(
                          result.riskLevel
                        ),
                      }}
                    >
                      {result.riskLevel.toUpperCase()}
                    </span>
                    <span className="issue-count">
                      {result.issues.length} issues found
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {displayResults.length > 0 && (
          <div className="result-details">
            {displayResults.map((result) => (
              <div
                key={result.verificationId}
                className="result-detail-card"
              >
                <div className="result-overview">
                  <div className="overview-header">
                    <h2>
                      Verification Result: {result.verificationId}
                    </h2>
                    <div className="processing-time">
                      Processed in {result.processingTime}ms
                    </div>
                  </div>

                  <div className="overview-metrics">
                    <ConfidenceIndicator
                      confidence={result.overallConfidence}
                      size="large"
                    />

                    <RiskVisualization
                      riskLevel={result.riskLevel}
                      issues={result.issues}
                    />
                  </div>
                </div>

                <IssueBreakdown
                  issues={result.issues}
                  verificationId={result.verificationId}
                />

                {result.recommendations.length > 0 && (
                  <div className="recommendations">
                    <h3>Recommendations</h3>
                    <ul>
                      {result.recommendations.map(
                        (recommendation, index) => (
                          <li key={index}>{recommendation}</li>
                        )
                      )}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {displayResults.length === 0 && (
          <div className="empty-state">
            <h2>No Verification Results</h2>
            <p>
              No verification results to display. Upload a document to
              get started.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
