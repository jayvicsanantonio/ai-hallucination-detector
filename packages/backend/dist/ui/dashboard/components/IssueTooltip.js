"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IssueTooltip = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const IssueTooltip = ({ issue, onClose, }) => {
    const getIssueTypeDescription = (type) => {
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
    const getSeverityDescription = (severity) => {
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
    return ((0, jsx_runtime_1.jsx)("div", { className: "issue-tooltip-overlay", onClick: onClose, children: (0, jsx_runtime_1.jsxs)("div", { className: "issue-tooltip", onClick: (e) => e.stopPropagation(), children: [(0, jsx_runtime_1.jsxs)("div", { className: "tooltip-header", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Issue Details" }), (0, jsx_runtime_1.jsx)("button", { className: "close-button", onClick: onClose, children: "\u00D7" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "tooltip-content", children: [(0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Issue Type" }), (0, jsx_runtime_1.jsx)("p", { children: getIssueTypeDescription(issue.type) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Severity Level" }), (0, jsx_runtime_1.jsx)("p", { children: getSeverityDescription(issue.severity) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Confidence Score" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Our system is ", issue.confidence, "% confident that this is a valid issue. Higher confidence scores indicate more reliable detections."] })] }), issue.evidence.length > 0 && ((0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Supporting Evidence" }), (0, jsx_runtime_1.jsx)("ul", { children: issue.evidence.map((evidence, index) => ((0, jsx_runtime_1.jsx)("li", { children: evidence }, index))) })] })), issue.suggestedFix && ((0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Recommended Action" }), (0, jsx_runtime_1.jsx)("p", { children: issue.suggestedFix })] })), (0, jsx_runtime_1.jsxs)("div", { className: "tooltip-section", children: [(0, jsx_runtime_1.jsx)("h5", { children: "Location Information" }), (0, jsx_runtime_1.jsxs)("p", { children: ["Found at line ", issue.location.line, ", characters", ' ', issue.location.start, " to ", issue.location.end, "."] })] })] }), (0, jsx_runtime_1.jsx)("div", { className: "tooltip-actions", children: (0, jsx_runtime_1.jsx)("button", { className: "action-button primary", onClick: onClose, children: "Understood" }) })] }) }));
};
exports.IssueTooltip = IssueTooltip;
//# sourceMappingURL=IssueTooltip.js.map