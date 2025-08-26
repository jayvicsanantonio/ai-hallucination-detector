import React, { useState } from 'react';
import { ReportingData } from './ReportingInterface';

interface TrendAnalysisProps {
  data: ReportingData;
}

export const TrendAnalysis: React.FC<TrendAnalysisProps> = ({
  data,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<
    'verifications' | 'confidence' | 'issues'
  >('verifications');

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getMetricValue = (trend: any, metric: string): number => {
    switch (metric) {
      case 'verifications':
        return trend.verifications;
      case 'confidence':
        return trend.averageConfidence;
      case 'issues':
        return trend.issuesFound;
      default:
        return 0;
    }
  };

  const getMetricLabel = (metric: string): string => {
    switch (metric) {
      case 'verifications':
        return 'Verifications';
      case 'confidence':
        return 'Avg Confidence (%)';
      case 'issues':
        return 'Issues Found';
      default:
        return '';
    }
  };

  const getMetricColor = (metric: string): string => {
    switch (metric) {
      case 'verifications':
        return '#3b82f6';
      case 'confidence':
        return '#22c55e';
      case 'issues':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const maxValue = Math.max(
    ...data.trends.map((trend) =>
      getMetricValue(trend, selectedMetric)
    )
  );
  const minValue = Math.min(
    ...data.trends.map((trend) =>
      getMetricValue(trend, selectedMetric)
    )
  );

  const calculateTrend = (): {
    direction: 'up' | 'down' | 'stable';
    percentage: number;
  } => {
    if (data.trends.length < 2)
      return { direction: 'stable', percentage: 0 };

    const firstValue = getMetricValue(data.trends[0], selectedMetric);
    const lastValue = getMetricValue(
      data.trends[data.trends.length - 1],
      selectedMetric
    );

    if (firstValue === 0)
      return { direction: 'stable', percentage: 0 };

    const change = ((lastValue - firstValue) / firstValue) * 100;

    if (Math.abs(change) < 5)
      return { direction: 'stable', percentage: change };
    return {
      direction: change > 0 ? 'up' : 'down',
      percentage: Math.abs(change),
    };
  };

  const trend = calculateTrend();

  const detectPatterns = (): string[] => {
    const patterns: string[] = [];

    // Check for consistent growth/decline
    let growthStreak = 0;
    let declineStreak = 0;

    for (let i = 1; i < data.trends.length; i++) {
      const current = getMetricValue(data.trends[i], selectedMetric);
      const previous = getMetricValue(
        data.trends[i - 1],
        selectedMetric
      );

      if (current > previous) {
        growthStreak++;
        declineStreak = 0;
      } else if (current < previous) {
        declineStreak++;
        growthStreak = 0;
      } else {
        growthStreak = 0;
        declineStreak = 0;
      }
    }

    if (growthStreak >= 3) {
      patterns.push(
        `Consistent growth trend over ${growthStreak} periods`
      );
    }

    if (declineStreak >= 3) {
      patterns.push(`Declining trend over ${declineStreak} periods`);
    }

    // Check for volatility
    const values = data.trends.map((trend) =>
      getMetricValue(trend, selectedMetric)
    );
    const avg =
      values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
      values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev > avg * 0.3) {
      patterns.push('High volatility detected in the data');
    }

    // Check for seasonal patterns (if we have enough data)
    if (data.trends.length >= 7) {
      const weeklyPattern = data.trends.slice(-7);
      const weekendValues = [weeklyPattern[5], weeklyPattern[6]].map(
        (trend) => getMetricValue(trend, selectedMetric)
      );
      const weekdayValues = weeklyPattern
        .slice(0, 5)
        .map((trend) => getMetricValue(trend, selectedMetric));

      const weekendAvg =
        weekendValues.reduce((sum, val) => sum + val, 0) /
        weekendValues.length;
      const weekdayAvg =
        weekdayValues.reduce((sum, val) => sum + val, 0) /
        weekdayValues.length;

      if (weekdayAvg > weekendAvg * 1.5) {
        patterns.push('Higher activity during weekdays');
      } else if (weekendAvg > weekdayAvg * 1.5) {
        patterns.push('Higher activity during weekends');
      }
    }

    return patterns;
  };

  const patterns = detectPatterns();

  return (
    <div className="trend-analysis">
      <div className="trend-header">
        <h2>Trend Analysis</h2>
        <div className="metric-selector">
          <label htmlFor="metric">Analyze:</label>
          <select
            id="metric"
            value={selectedMetric}
            onChange={(e) => setSelectedMetric(e.target.value as any)}
          >
            <option value="verifications">Verification Volume</option>
            <option value="confidence">Average Confidence</option>
            <option value="issues">Issues Detected</option>
          </select>
        </div>
      </div>

      <div className="trend-summary">
        <div className="trend-card">
          <div className="trend-title">
            {getMetricLabel(selectedMetric)}
          </div>
          <div className="trend-direction">
            <span className={`trend-icon ${trend.direction}`}>
              {trend.direction === 'up'
                ? '↗'
                : trend.direction === 'down'
                ? '↘'
                : '→'}
            </span>
            <span className="trend-text">
              {trend.direction === 'stable'
                ? 'Stable'
                : `${trend.percentage.toFixed(1)}% ${
                    trend.direction === 'up' ? 'increase' : 'decrease'
                  }`}
            </span>
          </div>
        </div>
      </div>

      <div className="trend-chart">
        <div className="chart-container">
          <div className="chart-y-axis">
            <div className="y-label">{maxValue}</div>
            <div className="y-label">
              {Math.round((maxValue + minValue) / 2)}
            </div>
            <div className="y-label">{minValue}</div>
          </div>

          <div className="chart-area">
            <svg viewBox="0 0 800 300" className="trend-svg">
              {/* Grid lines */}
              <defs>
                <pattern
                  id="grid"
                  width="40"
                  height="30"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 40 0 L 0 0 0 30"
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect width="800" height="300" fill="url(#grid)" />

              {/* Trend line */}
              <polyline
                fill="none"
                stroke={getMetricColor(selectedMetric)}
                strokeWidth="3"
                points={data.trends
                  .map((trend, index) => {
                    const x =
                      (index / (data.trends.length - 1)) * 760 + 20;
                    const value = getMetricValue(
                      trend,
                      selectedMetric
                    );
                    const y =
                      280 -
                      ((value - minValue) / (maxValue - minValue)) *
                        260;
                    return `${x},${y}`;
                  })
                  .join(' ')}
              />

              {/* Data points */}
              {data.trends.map((trend, index) => {
                const x =
                  (index / (data.trends.length - 1)) * 760 + 20;
                const value = getMetricValue(trend, selectedMetric);
                const y =
                  280 -
                  ((value - minValue) / (maxValue - minValue)) * 260;

                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="4"
                    fill={getMetricColor(selectedMetric)}
                    className="data-point"
                  />
                );
              })}
            </svg>
          </div>
        </div>

        <div className="chart-x-axis">
          {data.trends.map((trend, index) => (
            <div key={index} className="x-label">
              {formatDate(trend.date)}
            </div>
          ))}
        </div>
      </div>

      <div className="trend-insights">
        <h3>Pattern Detection</h3>
        {patterns.length > 0 ? (
          <div className="patterns-list">
            {patterns.map((pattern, index) => (
              <div key={index} className="pattern-item">
                <span className="pattern-icon">📊</span>
                <span className="pattern-text">{pattern}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-patterns">
            <p>
              No significant patterns detected in the current data
              set.
            </p>
          </div>
        )}
      </div>

      <div className="trend-data-table">
        <h3>Detailed Data</h3>
        <div className="data-table">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Verifications</th>
                <th>Avg Confidence</th>
                <th>Issues Found</th>
              </tr>
            </thead>
            <tbody>
              {data.trends.map((trend, index) => (
                <tr key={index}>
                  <td>{formatDate(trend.date)}</td>
                  <td>{trend.verifications}</td>
                  <td>{trend.averageConfidence.toFixed(1)}%</td>
                  <td>{trend.issuesFound}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
