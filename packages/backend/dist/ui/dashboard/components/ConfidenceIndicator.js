"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfidenceIndicator = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ConfidenceIndicator = ({ confidence, size = 'medium', showLabel = true }) => {
    const getConfidenceColor = (confidence) => {
        if (confidence >= 90)
            return '#22c55e'; // Green
        if (confidence >= 70)
            return '#f59e0b'; // Yellow
        if (confidence >= 50)
            return '#ef4444'; // Orange
        return '#dc2626'; // Red
    };
    const getConfidenceText = (confidence) => {
        if (confidence >= 90)
            return 'High Confidence';
        if (confidence >= 70)
            return 'Medium Confidence';
        if (confidence >= 50)
            return 'Low Confidence';
        return 'Very Low Confidence';
    };
    const getSizeClasses = (size) => {
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
    const strokeDashoffset = circumference - (confidence / 100) * circumference;
    return ((0, jsx_runtime_1.jsxs)("div", { className: `confidence-indicator ${getSizeClasses(size)}`, children: [(0, jsx_runtime_1.jsxs)("div", { className: "confidence-circle", children: [(0, jsx_runtime_1.jsxs)("svg", { width: "100", height: "100", viewBox: "0 0 100 100", children: [(0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "45", fill: "none", stroke: "#e5e7eb", strokeWidth: "8" }), (0, jsx_runtime_1.jsx)("circle", { cx: "50", cy: "50", r: "45", fill: "none", stroke: color, strokeWidth: "8", strokeLinecap: "round", strokeDasharray: strokeDasharray, strokeDashoffset: strokeDashoffset, transform: "rotate(-90 50 50)", className: "confidence-progress" })] }), (0, jsx_runtime_1.jsx)("div", { className: "confidence-text", children: (0, jsx_runtime_1.jsxs)("span", { className: "confidence-percentage", children: [confidence, "%"] }) })] }), showLabel && ((0, jsx_runtime_1.jsx)("div", { className: "confidence-label", children: (0, jsx_runtime_1.jsx)("span", { className: "confidence-status", style: { color }, children: getConfidenceText(confidence) }) }))] }));
};
exports.ConfidenceIndicator = ConfidenceIndicator;
//# sourceMappingURL=ConfidenceIndicator.js.map