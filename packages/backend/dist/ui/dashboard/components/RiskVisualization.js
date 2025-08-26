"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RiskVisualization = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const RiskVisualization = ({ riskLevel, issues, }) => {
    const getRiskColor = (level) => {
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
    const getRiskDescription = (level) => {
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
    const getRiskIcon = (level) => {
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
    }, {});
    const totalIssues = issues.length;
    const criticalIssues = severityCounts.critical || 0;
    const highIssues = severityCounts.high || 0;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "risk-visualization", children: [(0, jsx_runtime_1.jsx)("div", { className: "risk-header", children: (0, jsx_runtime_1.jsx)("h3", { children: "Risk Assessment" }) }), (0, jsx_runtime_1.jsxs)("div", { className: "risk-indicator", children: [(0, jsx_runtime_1.jsx)("div", { className: "risk-circle", style: { backgroundColor: getRiskColor(riskLevel) }, children: (0, jsx_runtime_1.jsx)("span", { className: "risk-icon", children: getRiskIcon(riskLevel) }) }), (0, jsx_runtime_1.jsxs)("div", { className: "risk-details", children: [(0, jsx_runtime_1.jsx)("div", { className: "risk-level", children: (0, jsx_runtime_1.jsxs)("span", { className: "risk-badge", style: { backgroundColor: getRiskColor(riskLevel) }, children: [riskLevel.toUpperCase(), " RISK"] }) }), (0, jsx_runtime_1.jsx)("div", { className: "risk-description", children: getRiskDescription(riskLevel) })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "risk-breakdown", children: [(0, jsx_runtime_1.jsxs)("div", { className: "breakdown-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "breakdown-label", children: "Total Issues" }), (0, jsx_runtime_1.jsx)("span", { className: "breakdown-value", children: totalIssues })] }), criticalIssues > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "breakdown-item critical", children: [(0, jsx_runtime_1.jsx)("span", { className: "breakdown-label", children: "Critical" }), (0, jsx_runtime_1.jsx)("span", { className: "breakdown-value", children: criticalIssues })] })), highIssues > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "breakdown-item high", children: [(0, jsx_runtime_1.jsx)("span", { className: "breakdown-label", children: "High Priority" }), (0, jsx_runtime_1.jsx)("span", { className: "breakdown-value", children: highIssues })] }))] }), (criticalIssues > 0 || highIssues > 0) && ((0, jsx_runtime_1.jsxs)("div", { className: "risk-warning", children: [(0, jsx_runtime_1.jsx)("div", { className: "warning-icon", children: "\u26A0" }), (0, jsx_runtime_1.jsx)("div", { className: "warning-text", children: criticalIssues > 0
                            ? `${criticalIssues} critical issue${criticalIssues > 1 ? 's' : ''} require immediate attention`
                            : `${highIssues} high priority issue${highIssues > 1 ? 's' : ''} should be addressed promptly` })] })), (0, jsx_runtime_1.jsxs)("div", { className: "risk-chart", children: [(0, jsx_runtime_1.jsx)("div", { className: "chart-title", children: "Issue Distribution" }), (0, jsx_runtime_1.jsx)("div", { className: "chart-bars", children: Object.entries(severityCounts).map(([severity, count]) => {
                            const percentage = (count / totalIssues) * 100;
                            return ((0, jsx_runtime_1.jsxs)("div", { className: "chart-bar", children: [(0, jsx_runtime_1.jsx)("div", { className: "bar-label", children: severity }), (0, jsx_runtime_1.jsx)("div", { className: "bar-container", children: (0, jsx_runtime_1.jsx)("div", { className: "bar-fill", style: {
                                                width: `${percentage}%`,
                                                backgroundColor: getRiskColor(severity),
                                            } }) }), (0, jsx_runtime_1.jsx)("div", { className: "bar-value", children: count })] }, severity));
                        }) })] })] }));
};
exports.RiskVisualization = RiskVisualization;
//# sourceMappingURL=RiskVisualization.js.map