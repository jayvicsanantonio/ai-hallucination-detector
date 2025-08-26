"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueBreakdown = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const IssueTooltip_1 = require("./IssueTooltip");
const IssueBreakdown = ({ issues, verificationId, }) => {
    const [selectedIssue, setSelectedIssue] = (0, react_1.useState)(null);
    const [filterType, setFilterType] = (0, react_1.useState)('all');
    const [filterSeverity, setFilterSeverity] = (0, react_1.useState)('all');
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
    const getSeverityColor = (severity) => {
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
    const getIssueTypeLabel = (type) => {
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
        const typeMatch = filterType === 'all' || issue.type === filterType;
        const severityMatch = filterSeverity === 'all' || issue.severity === filterSeverity;
        return typeMatch && severityMatch;
    });
    const issueTypeCounts = issues.reduce((acc, issue) => {
        acc[issue.type] = (acc[issue.type] || 0) + 1;
        return acc;
    }, {});
    const severityCounts = issues.reduce((acc, issue) => {
        acc[issue.severity] = (acc[issue.severity] || 0) + 1;
        return acc;
    }, {});
    const handleIssueClick = (issue) => {
        setSelectedIssue(selectedIssue?.location.start === issue.location.start
            ? null
            : issue);
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "issue-breakdown", children: [(0, jsx_runtime_1.jsxs)("div", { className: "breakdown-header", children: [(0, jsx_runtime_1.jsxs)("h3", { children: ["Issue Analysis (", issues.length, " issues found)"] }), (0, jsx_runtime_1.jsxs)("div", { className: "breakdown-filters", children: [(0, jsx_runtime_1.jsxs)("select", { value: filterType, onChange: (e) => setFilterType(e.target.value), className: "filter-select", children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "All Types" }), (0, jsx_runtime_1.jsx)("option", { value: "factual_error", children: "Factual Errors" }), (0, jsx_runtime_1.jsx)("option", { value: "logical_inconsistency", children: "Logical Inconsistencies" }), (0, jsx_runtime_1.jsx)("option", { value: "compliance_violation", children: "Compliance Violations" })] }), (0, jsx_runtime_1.jsxs)("select", { value: filterSeverity, onChange: (e) => setFilterSeverity(e.target.value), className: "filter-select", children: [(0, jsx_runtime_1.jsx)("option", { value: "all", children: "All Severities" }), (0, jsx_runtime_1.jsx)("option", { value: "critical", children: "Critical" }), (0, jsx_runtime_1.jsx)("option", { value: "high", children: "High" }), (0, jsx_runtime_1.jsx)("option", { value: "medium", children: "Medium" }), (0, jsx_runtime_1.jsx)("option", { value: "low", children: "Low" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "breakdown-summary", children: [(0, jsx_runtime_1.jsxs)("div", { className: "summary-section", children: [(0, jsx_runtime_1.jsx)("h4", { children: "By Type" }), (0, jsx_runtime_1.jsx)("div", { className: "summary-items", children: Object.entries(issueTypeCounts).map(([type, count]) => ((0, jsx_runtime_1.jsxs)("div", { className: "summary-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "summary-indicator", style: { backgroundColor: getIssueTypeColor(type) } }), (0, jsx_runtime_1.jsx)("span", { className: "summary-label", children: getIssueTypeLabel(type) }), (0, jsx_runtime_1.jsx)("span", { className: "summary-count", children: count })] }, type))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "summary-section", children: [(0, jsx_runtime_1.jsx)("h4", { children: "By Severity" }), (0, jsx_runtime_1.jsx)("div", { className: "summary-items", children: Object.entries(severityCounts).map(([severity, count]) => ((0, jsx_runtime_1.jsxs)("div", { className: "summary-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "summary-indicator", style: {
                                                backgroundColor: getSeverityColor(severity),
                                            } }), (0, jsx_runtime_1.jsx)("span", { className: "summary-label", children: severity.charAt(0).toUpperCase() +
                                                severity.slice(1) }), (0, jsx_runtime_1.jsx)("span", { className: "summary-count", children: count })] }, severity))) })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "issues-list", children: filteredIssues.length === 0 ? ((0, jsx_runtime_1.jsx)("div", { className: "no-issues", children: (0, jsx_runtime_1.jsx)("p", { children: "No issues match the current filters." }) })) : (filteredIssues.map((issue, index) => ((0, jsx_runtime_1.jsxs)("div", { className: `issue-item ${selectedIssue === issue ? 'selected' : ''}`, onClick: () => handleIssueClick(issue), children: [(0, jsx_runtime_1.jsxs)("div", { className: "issue-header", children: [(0, jsx_runtime_1.jsxs)("div", { className: "issue-type-badge", children: [(0, jsx_runtime_1.jsx)("span", { className: "type-indicator", style: {
                                                backgroundColor: getIssueTypeColor(issue.type),
                                            } }), (0, jsx_runtime_1.jsx)("span", { className: "type-label", children: getIssueTypeLabel(issue.type) })] }), (0, jsx_runtime_1.jsx)("div", { className: "issue-severity", children: (0, jsx_runtime_1.jsx)("span", { className: "severity-badge", style: {
                                            backgroundColor: getSeverityColor(issue.severity),
                                            color: 'white',
                                        }, children: issue.severity.toUpperCase() }) }), (0, jsx_runtime_1.jsxs)("div", { className: "issue-confidence", children: [issue.confidence, "% confidence"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "issue-content", children: [(0, jsx_runtime_1.jsx)("p", { className: "issue-description", children: issue.description }), (0, jsx_runtime_1.jsxs)("div", { className: "issue-location", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Location:" }), " Line", ' ', issue.location.line, ", Characters", ' ', issue.location.start, "-", issue.location.end] }), issue.evidence.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "issue-evidence", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Evidence:" }), (0, jsx_runtime_1.jsx)("ul", { children: issue.evidence.map((evidence, evidenceIndex) => ((0, jsx_runtime_1.jsx)("li", { children: evidence }, evidenceIndex))) })] })), issue.suggestedFix && ((0, jsx_runtime_1.jsxs)("div", { className: "issue-suggestion", children: [(0, jsx_runtime_1.jsx)("strong", { children: "Suggested Fix:" }), (0, jsx_runtime_1.jsx)("p", { children: issue.suggestedFix })] }))] }), selectedIssue === issue && ((0, jsx_runtime_1.jsx)(IssueTooltip_1.IssueTooltip, { issue: issue, onClose: () => setSelectedIssue(null) }))] }, index)))) })] }));
};
exports.IssueBreakdown = IssueBreakdown;
//# sourceMappingURL=IssueBreakdown.js.map