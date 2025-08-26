"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TrendAnalysis = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const TrendAnalysis = ({ data, }) => {
    const [selectedMetric, setSelectedMetric] = (0, react_1.useState)('verifications');
    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
        });
    };
    const getMetricValue = (trend, metric) => {
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
    const getMetricLabel = (metric) => {
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
    const getMetricColor = (metric) => {
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
    const maxValue = Math.max(...data.trends.map((trend) => getMetricValue(trend, selectedMetric)));
    const minValue = Math.min(...data.trends.map((trend) => getMetricValue(trend, selectedMetric)));
    const calculateTrend = () => {
        if (data.trends.length < 2)
            return { direction: 'stable', percentage: 0 };
        const firstValue = getMetricValue(data.trends[0], selectedMetric);
        const lastValue = getMetricValue(data.trends[data.trends.length - 1], selectedMetric);
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
    const detectPatterns = () => {
        const patterns = [];
        // Check for consistent growth/decline
        let growthStreak = 0;
        let declineStreak = 0;
        for (let i = 1; i < data.trends.length; i++) {
            const current = getMetricValue(data.trends[i], selectedMetric);
            const previous = getMetricValue(data.trends[i - 1], selectedMetric);
            if (current > previous) {
                growthStreak++;
                declineStreak = 0;
            }
            else if (current < previous) {
                declineStreak++;
                growthStreak = 0;
            }
            else {
                growthStreak = 0;
                declineStreak = 0;
            }
        }
        if (growthStreak >= 3) {
            patterns.push(`Consistent growth trend over ${growthStreak} periods`);
        }
        if (declineStreak >= 3) {
            patterns.push(`Declining trend over ${declineStreak} periods`);
        }
        // Check for volatility
        const values = data.trends.map((trend) => getMetricValue(trend, selectedMetric));
        const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) /
            values.length;
        const stdDev = Math.sqrt(variance);
        if (stdDev > avg * 0.3) {
            patterns.push('High volatility detected in the data');
        }
        // Check for seasonal patterns (if we have enough data)
        if (data.trends.length >= 7) {
            const weeklyPattern = data.trends.slice(-7);
            const weekendValues = [weeklyPattern[5], weeklyPattern[6]].map((trend) => getMetricValue(trend, selectedMetric));
            const weekdayValues = weeklyPattern
                .slice(0, 5)
                .map((trend) => getMetricValue(trend, selectedMetric));
            const weekendAvg = weekendValues.reduce((sum, val) => sum + val, 0) /
                weekendValues.length;
            const weekdayAvg = weekdayValues.reduce((sum, val) => sum + val, 0) /
                weekdayValues.length;
            if (weekdayAvg > weekendAvg * 1.5) {
                patterns.push('Higher activity during weekdays');
            }
            else if (weekendAvg > weekdayAvg * 1.5) {
                patterns.push('Higher activity during weekends');
            }
        }
        return patterns;
    };
    const patterns = detectPatterns();
    return ((0, jsx_runtime_1.jsxs)("div", { className: "trend-analysis", children: [(0, jsx_runtime_1.jsxs)("div", { className: "trend-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Trend Analysis" }), (0, jsx_runtime_1.jsxs)("div", { className: "metric-selector", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "metric", children: "Analyze:" }), (0, jsx_runtime_1.jsxs)("select", { id: "metric", value: selectedMetric, onChange: (e) => setSelectedMetric(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "verifications", children: "Verification Volume" }), (0, jsx_runtime_1.jsx)("option", { value: "confidence", children: "Average Confidence" }), (0, jsx_runtime_1.jsx)("option", { value: "issues", children: "Issues Detected" })] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "trend-summary", children: (0, jsx_runtime_1.jsxs)("div", { className: "trend-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "trend-title", children: getMetricLabel(selectedMetric) }), (0, jsx_runtime_1.jsxs)("div", { className: "trend-direction", children: [(0, jsx_runtime_1.jsx)("span", { className: `trend-icon ${trend.direction}`, children: trend.direction === 'up'
                                        ? '↗'
                                        : trend.direction === 'down'
                                            ? '↘'
                                            : '→' }), (0, jsx_runtime_1.jsx)("span", { className: "trend-text", children: trend.direction === 'stable'
                                        ? 'Stable'
                                        : `${trend.percentage.toFixed(1)}% ${trend.direction === 'up' ? 'increase' : 'decrease'}` })] })] }) }), (0, jsx_runtime_1.jsxs)("div", { className: "trend-chart", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chart-container", children: [(0, jsx_runtime_1.jsxs)("div", { className: "chart-y-axis", children: [(0, jsx_runtime_1.jsx)("div", { className: "y-label", children: maxValue }), (0, jsx_runtime_1.jsx)("div", { className: "y-label", children: Math.round((maxValue + minValue) / 2) }), (0, jsx_runtime_1.jsx)("div", { className: "y-label", children: minValue })] }), (0, jsx_runtime_1.jsx)("div", { className: "chart-area", children: (0, jsx_runtime_1.jsxs)("svg", { viewBox: "0 0 800 300", className: "trend-svg", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("pattern", { id: "grid", width: "40", height: "30", patternUnits: "userSpaceOnUse", children: (0, jsx_runtime_1.jsx)("path", { d: "M 40 0 L 0 0 0 30", fill: "none", stroke: "#e5e7eb", strokeWidth: "1" }) }) }), (0, jsx_runtime_1.jsx)("rect", { width: "800", height: "300", fill: "url(#grid)" }), (0, jsx_runtime_1.jsx)("polyline", { fill: "none", stroke: getMetricColor(selectedMetric), strokeWidth: "3", points: data.trends
                                                .map((trend, index) => {
                                                const x = (index / (data.trends.length - 1)) * 760 + 20;
                                                const value = getMetricValue(trend, selectedMetric);
                                                const y = 280 -
                                                    ((value - minValue) / (maxValue - minValue)) *
                                                        260;
                                                return `${x},${y}`;
                                            })
                                                .join(' ') }), data.trends.map((trend, index) => {
                                            const x = (index / (data.trends.length - 1)) * 760 + 20;
                                            const value = getMetricValue(trend, selectedMetric);
                                            const y = 280 -
                                                ((value - minValue) / (maxValue - minValue)) * 260;
                                            return ((0, jsx_runtime_1.jsx)("circle", { cx: x, cy: y, r: "4", fill: getMetricColor(selectedMetric), className: "data-point" }, index));
                                        })] }) })] }), (0, jsx_runtime_1.jsx)("div", { className: "chart-x-axis", children: data.trends.map((trend, index) => ((0, jsx_runtime_1.jsx)("div", { className: "x-label", children: formatDate(trend.date) }, index))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "trend-insights", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Pattern Detection" }), patterns.length > 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "patterns-list", children: patterns.map((pattern, index) => ((0, jsx_runtime_1.jsxs)("div", { className: "pattern-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "pattern-icon", children: "\uD83D\uDCCA" }), (0, jsx_runtime_1.jsx)("span", { className: "pattern-text", children: pattern })] }, index))) })) : ((0, jsx_runtime_1.jsx)("div", { className: "no-patterns", children: (0, jsx_runtime_1.jsx)("p", { children: "No significant patterns detected in the current data set." }) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "trend-data-table", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Detailed Data" }), (0, jsx_runtime_1.jsx)("div", { className: "data-table", children: (0, jsx_runtime_1.jsxs)("table", { children: [(0, jsx_runtime_1.jsx)("thead", { children: (0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("th", { children: "Date" }), (0, jsx_runtime_1.jsx)("th", { children: "Verifications" }), (0, jsx_runtime_1.jsx)("th", { children: "Avg Confidence" }), (0, jsx_runtime_1.jsx)("th", { children: "Issues Found" })] }) }), (0, jsx_runtime_1.jsx)("tbody", { children: data.trends.map((trend, index) => ((0, jsx_runtime_1.jsxs)("tr", { children: [(0, jsx_runtime_1.jsx)("td", { children: formatDate(trend.date) }), (0, jsx_runtime_1.jsx)("td", { children: trend.verifications }), (0, jsx_runtime_1.jsxs)("td", { children: [trend.averageConfidence.toFixed(1), "%"] }), (0, jsx_runtime_1.jsx)("td", { children: trend.issuesFound })] }, index))) })] }) })] })] }));
};
exports.TrendAnalysis = TrendAnalysis;
//# sourceMappingURL=TrendAnalysis.js.map