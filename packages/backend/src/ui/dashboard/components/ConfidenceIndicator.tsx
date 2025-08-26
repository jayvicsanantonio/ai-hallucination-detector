import React from 'react';

interface ConfidenceIndicatorProps {
  confidence: number;
  size?: 'small' | 'medium' | 'large';
  showLabel?: boolean;
}

export const ConfidenceIndicator: React.FC<
  ConfidenceIndicatorProps
> = ({ confidence, size = 'medium', showLabel = true }) => {
  const getConfidenceColor = (confidence: number): string => {
    if (confidence >= 90) return '#22c55e'; // Green
    if (confidence >= 70) return '#f59e0b'; // Yellow
    if (confidence >= 50) return '#ef4444'; // Orange
    return '#dc2626'; // Red
  };

  const getConfidenceText = (confidence: number): string => {
    if (confidence >= 90) return 'High Confidence';
    if (confidence >= 70) return 'Medium Confidence';
    if (confidence >= 50) return 'Low Confidence';
    return 'Very Low Confidence';
  };

  const getSizeClasses = (size: string): string => {
    switch (size) {
      case 'small':
        return 'confidence-indicator-small';
      case 'large':
        return 'confidence-indicator-large';
      default:
        return 'confidence-indicator-medium';
    }
  };

  const color = getConfidenceColor(confidence);
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDasharray = circumference;
  const strokeDashoffset =
    circumference - (confidence / 100) * circumference;

  return (
    <div className={`confidence-indicator ${getSizeClasses(size)}`}>
      <div className="confidence-circle">
        <svg width="100" height="100" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 50 50)"
            className="confidence-progress"
          />
        </svg>
        <div className="confidence-text">
          <span className="confidence-percentage">{confidence}%</span>
        </div>
      </div>

      {showLabel && (
        <div className="confidence-label">
          <span className="confidence-status" style={{ color }}>
            {getConfidenceText(confidence)}
          </span>
        </div>
      )}
    </div>
  );
};
