"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExecutiveSummaryReport = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ExecutiveSummaryReport = ({ data }) => {
    const formatNumber = (num) => {
        return new Intl.NumberFormat().format(num);
    };
    const formatPercentage = (num) => {
        return `${num.toFixed(1)}%`;
    };
    const getRiskLevelColor = (level) => {
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
    const getIssueTypeColor = (type) => {
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
    const totalIssues = Object.values(data.issueTypes).reduce((sum, count) => sum + count, 0);
    const totalRiskItems = Object.values(data.riskDistribution).reduce((sum, count) => sum + count, 0);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "executive-summary-report", children: [(0, jsx_runtime_1.jsxs)("div", { className: "summary-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Executive Summary" }), (0, jsx_runtime_1.jsxs)("div", { className: "report-period", children: [data.timeRange.start.toLocaleDateString(), " -", ' ', data.timeRange.end.toLocaleDateString()] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "key-metrics", children: [(0, jsx_runtime_1.jsxs)("div", { className: "metric-card primary", children: [(0, jsx_runtime_1.jsx)("div", { className: "metric-value", children: formatNumber(data.totalVerifications) }), (0, jsx_runtime_1.jsx)("div", { className: "metric-label", children: "Total Verifications" }), (0, jsx_runtime_1.jsx)("div", { className: "metric-description", children: "Documents processed during this period" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "metric-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "metric-value", children: formatPercentage(data.averageConfidence) }), (0, jsx_runtime_1.jsx)("div", { className: "metric-label", children: "Average Confidence" }), (0, jsx_runtime_1.jsx)("div", { className: "metric-description", children: "Mean confidence score across all verifications" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "metric-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "metric-value", children: formatNumber(totalIssues) }), (0, jsx_runtime_1.jsx)("div", { className: "metric-label", children: "Issues Detected" }), (0, jsx_runtime_1.jsx)("div", { className: "metric-description", children: "Total issues found across all documents" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "metric-card", children: [(0, jsx_runtime_1.jsx)("div", { className: "metric-value", children: totalIssues > 0
                                    ? formatPercentage((totalIssues / data.totalVerifications) * 100)
                                    : '0%' }), (0, jsx_runtime_1.jsx)("div", { className: "metric-label", children: "Issue Rate" }), (0, jsx_runtime_1.jsx)("div", { className: "metric-description", children: "Percentage of documents with issues" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "summary-sections", children: [(0, jsx_runtime_1.jsxs)("div", { className: "summary-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Risk Distribution" }), (0, jsx_runtime_1.jsx)("div", { className: "risk-breakdown", children: Object.entries(data.riskDistribution).map(([level, count]) => {
                                    const percentage = totalRiskItems > 0
                                        ? (count / totalRiskItems) * 100
                                        : 0;
                                    return ((0, jsx_runtime_1.jsxs)("div", { className: "risk-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "risk-header", children: [(0, jsx_runtime_1.jsx)("span", { className: "risk-indicator", style: {
                                                            backgroundColor: getRiskLevelColor(level),
                                                        } }), (0, jsx_runtime_1.jsxs)("span", { className: "risk-level", children: [level.charAt(0).toUpperCase() +
                                                                level.slice(1), ' ', "Risk"] }), (0, jsx_runtime_1.jsx)("span", { className: "risk-count", children: formatNumber(count) })] }), (0, jsx_runtime_1.jsx)("div", { className: "risk-bar", children: (0, jsx_runtime_1.jsx)("div", { className: "risk-fill", style: {
                                                        width: `${percentage}%`,
                                                        backgroundColor: getRiskLevelColor(level),
                                                    } }) }), (0, jsx_runtime_1.jsx)("div", { className: "risk-percentage", children: formatPercentage(percentage) })] }, level));
                                }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "summary-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Issue Types" }), (0, jsx_runtime_1.jsx)("div", { className: "issue-breakdown", children: Object.entries(data.issueTypes).map(([type, count]) => {
                                    const percentage = totalIssues > 0 ? (count / totalIssues) * 100 : 0;
                                    const typeLabel = type
                                        .split('_')
                                        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                        .join(' ');
                                    return ((0, jsx_runtime_1.jsxs)("div", { className: "issue-item", children: [(0, jsx_runtime_1.jsxs)("div", { className: "issue-header", children: [(0, jsx_runtime_1.jsx)("span", { className: "issue-indicator", style: {
                                                            backgroundColor: getIssueTypeColor(type),
                                                        } }), (0, jsx_runtime_1.jsx)("span", { className: "issue-type", children: typeLabel }), (0, jsx_runtime_1.jsx)("span", { className: "issue-count", children: formatNumber(count) })] }), (0, jsx_runtime_1.jsx)("div", { className: "issue-bar", children: (0, jsx_runtime_1.jsx)("div", { className: "issue-fill", style: {
                                                        width: `${percentage}%`,
                                                        backgroundColor: getIssueTypeColor(type),
                                                    } }) }), (0, jsx_runtime_1.jsx)("div", { className: "issue-percentage", children: formatPercentage(percentage) })] }, type));
                                }) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "summary-insights", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Key Insights" }), (0, jsx_runtime_1.jsxs)("div", { className: "insights-list", children: [data.averageConfidence >= 90 && ((0, jsx_runtime_1.jsxs)("div", { className: "insight positive", children: [(0, jsx_runtime_1.jsx)("span", { className: "insight-icon", children: "\u2713" }), (0, jsx_runtime_1.jsxs)("span", { className: "insight-text", children: ["High system confidence (", formatPercentage(data.averageConfidence), ") indicates reliable verification results."] })] })), data.averageConfidence < 70 && ((0, jsx_runtime_1.jsxs)("div", { className: "insight warning", children: [(0, jsx_runtime_1.jsx)("span", { className: "insight-icon", children: "\u26A0" }), (0, jsx_runtime_1.jsxs)("span", { className: "insight-text", children: ["Lower confidence scores (", formatPercentage(data.averageConfidence), ") may require additional review processes."] })] })), (data.riskDistribution.critical || 0) > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "insight critical", children: [(0, jsx_runtime_1.jsx)("span", { className: "insight-icon", children: "\u26A0" }), (0, jsx_runtime_1.jsxs)("span", { className: "insight-text", children: [formatNumber(data.riskDistribution.critical), ' ', "critical risk items require immediate attention."] })] })), totalIssues === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "insight positive", children: [(0, jsx_runtime_1.jsx)("span", { className: "insight-icon", children: "\u2713" }), (0, jsx_runtime_1.jsx)("span", { className: "insight-text", children: "No issues detected during this period - excellent content quality." })] })), totalIssues / data.totalVerifications > 0.5 && ((0, jsx_runtime_1.jsxs)("div", { className: "insight warning", children: [(0, jsx_runtime_1.jsx)("span", { className: "insight-icon", children: "\u26A0" }), (0, jsx_runtime_1.jsxs)("span", { className: "insight-text", children: ["High issue rate (", formatPercentage((totalIssues / data.totalVerifications) * 100), ") suggests need for improved content review processes."] })] }))] })] })] }));
};
exports.ExecutiveSummaryReport = ExecutiveSummaryReport;
//# sourceMappingURL=ExecutiveSummaryReport.js.map