"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VerificationResultsDashboard = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ConfidenceIndicator_1 = require("./ConfidenceIndicator");
const IssueBreakdown_1 = require("./IssueBreakdown");
const RiskVisualization_1 = require("./RiskVisualization");
const VerificationResultsDashboard = ({ verificationId, results = [], onRefresh }) => {
    const [selectedResult, setSelectedResult] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    (0, react_1.useEffect)(() => {
        if (verificationId && !selectedResult) {
            fetchVerificationResult(verificationId);
        }
    }, [verificationId]);
    const fetchVerificationResult = async (id) => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/v1/results/${id}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch verification result: ${response.statusText}`);
            }
            const result = await response.json();
            setSelectedResult(result);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleResultSelect = (result) => {
        setSelectedResult(result);
    };
    const getRiskColor = (riskLevel) => {
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
    const getConfidenceColor = (confidence) => {
        if (confidence >= 90)
            return '#22c55e';
        if (confidence >= 70)
            return '#f59e0b';
        if (confidence >= 50)
            return '#ef4444';
        return '#dc2626';
    };
    if (loading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "dashboard-container loading", children: (0, jsx_runtime_1.jsx)("div", { className: "loading-spinner", children: "Loading verification results..." }) }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "dashboard-container error", children: (0, jsx_runtime_1.jsxs)("div", { className: "error-message", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Error Loading Results" }), (0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsx)("button", { onClick: () => onRefresh?.(), children: "Retry" })] }) }));
    }
    const displayResults = selectedResult ? [selectedResult] : results;
    return ((0, jsx_runtime_1.jsxs)("div", { className: "dashboard-container", children: [(0, jsx_runtime_1.jsxs)("header", { className: "dashboard-header", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Verification Results Dashboard" }), (0, jsx_runtime_1.jsx)("div", { className: "dashboard-actions", children: (0, jsx_runtime_1.jsx)("button", { onClick: onRefresh, className: "refresh-btn", children: "Refresh" }) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "dashboard-content", children: [results.length > 1 && ((0, jsx_runtime_1.jsxs)("div", { className: "results-list", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Recent Verifications" }), (0, jsx_runtime_1.jsx)("div", { className: "results-grid", children: results.map((result) => ((0, jsx_runtime_1.jsxs)("div", { className: `result-card ${selectedResult?.verificationId ===
                                        result.verificationId
                                        ? 'selected'
                                        : ''}`, onClick: () => handleResultSelect(result), children: [(0, jsx_runtime_1.jsxs)("div", { className: "result-header", children: [(0, jsx_runtime_1.jsx)("span", { className: "verification-id", children: result.verificationId }), (0, jsx_runtime_1.jsx)(ConfidenceIndicator_1.ConfidenceIndicator, { confidence: result.overallConfidence, size: "small" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "result-summary", children: [(0, jsx_runtime_1.jsx)("span", { className: "risk-badge", style: {
                                                        backgroundColor: getRiskColor(result.riskLevel),
                                                    }, children: result.riskLevel.toUpperCase() }), (0, jsx_runtime_1.jsxs)("span", { className: "issue-count", children: [result.issues.length, " issues found"] })] })] }, result.verificationId))) })] })), displayResults.length > 0 && ((0, jsx_runtime_1.jsx)("div", { className: "result-details", children: displayResults.map((result) => ((0, jsx_runtime_1.jsxs)("div", { className: "result-detail-card", children: [(0, jsx_runtime_1.jsxs)("div", { className: "result-overview", children: [(0, jsx_runtime_1.jsxs)("div", { className: "overview-header", children: [(0, jsx_runtime_1.jsxs)("h2", { children: ["Verification Result: ", result.verificationId] }), (0, jsx_runtime_1.jsxs)("div", { className: "processing-time", children: ["Processed in ", result.processingTime, "ms"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "overview-metrics", children: [(0, jsx_runtime_1.jsx)(ConfidenceIndicator_1.ConfidenceIndicator, { confidence: result.overallConfidence, size: "large" }), (0, jsx_runtime_1.jsx)(RiskVisualization_1.RiskVisualization, { riskLevel: result.riskLevel, issues: result.issues })] })] }), (0, jsx_runtime_1.jsx)(IssueBreakdown_1.IssueBreakdown, { issues: result.issues, verificationId: result.verificationId }), result.recommendations.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "recommendations", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Recommendations" }), (0, jsx_runtime_1.jsx)("ul", { children: result.recommendations.map((recommendation, index) => ((0, jsx_runtime_1.jsx)("li", { children: recommendation }, index))) })] }))] }, result.verificationId))) })), displayResults.length === 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "empty-state", children: [(0, jsx_runtime_1.jsx)("h2", { children: "No Verification Results" }), (0, jsx_runtime_1.jsx)("p", { children: "No verification results to display. Upload a document to get started." })] }))] })] }));
};
exports.VerificationResultsDashboard = VerificationResultsDashboard;
//# sourceMappingURL=VerificationResultsDashboard.js.map