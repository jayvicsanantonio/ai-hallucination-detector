"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportingInterface = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const ExecutiveSummaryReport_1 = require("./ExecutiveSummaryReport");
const TrendAnalysis_1 = require("./TrendAnalysis");
const AuditReportExporter_1 = require("./AuditReportExporter");
const ReportingInterface = ({ onDataRefresh }) => {
    const [reportingData, setReportingData] = (0, react_1.useState)(null);
    const [loading, setLoading] = (0, react_1.useState)(false);
    const [error, setError] = (0, react_1.useState)(null);
    const [selectedTimeRange, setSelectedTimeRange] = (0, react_1.useState)('7d');
    const [activeTab, setActiveTab] = (0, react_1.useState)('summary');
    (0, react_1.useEffect)(() => {
        fetchReportingData();
    }, [selectedTimeRange]);
    const fetchReportingData = async () => {
        setLoading(true);
        setError(null);
        try {
            const response = await fetch(`/api/v1/reports/analytics?timeRange=${selectedTimeRange}`);
            if (!response.ok) {
                throw new Error(`Failed to fetch reporting data: ${response.statusText}`);
            }
            const data = await response.json();
            setReportingData(data);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error occurred');
        }
        finally {
            setLoading(false);
        }
    };
    const handleTimeRangeChange = (range) => {
        setSelectedTimeRange(range);
    };
    const handleRefresh = () => {
        fetchReportingData();
        onDataRefresh?.();
    };
    if (loading) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "reporting-interface loading", children: (0, jsx_runtime_1.jsx)("div", { className: "loading-spinner", children: "Loading analytics data..." }) }));
    }
    if (error) {
        return ((0, jsx_runtime_1.jsx)("div", { className: "reporting-interface error", children: (0, jsx_runtime_1.jsxs)("div", { className: "error-message", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Error Loading Analytics" }), (0, jsx_runtime_1.jsx)("p", { children: error }), (0, jsx_runtime_1.jsx)("button", { onClick: handleRefresh, children: "Retry" })] }) }));
    }
    return ((0, jsx_runtime_1.jsxs)("div", { className: "reporting-interface", children: [(0, jsx_runtime_1.jsxs)("header", { className: "reporting-header", children: [(0, jsx_runtime_1.jsx)("h1", { children: "Analytics & Reporting" }), (0, jsx_runtime_1.jsxs)("div", { className: "reporting-controls", children: [(0, jsx_runtime_1.jsxs)("div", { className: "time-range-selector", children: [(0, jsx_runtime_1.jsx)("label", { htmlFor: "timeRange", children: "Time Range:" }), (0, jsx_runtime_1.jsxs)("select", { id: "timeRange", value: selectedTimeRange, onChange: (e) => handleTimeRangeChange(e.target.value), children: [(0, jsx_runtime_1.jsx)("option", { value: "1d", children: "Last 24 Hours" }), (0, jsx_runtime_1.jsx)("option", { value: "7d", children: "Last 7 Days" }), (0, jsx_runtime_1.jsx)("option", { value: "30d", children: "Last 30 Days" }), (0, jsx_runtime_1.jsx)("option", { value: "90d", children: "Last 90 Days" }), (0, jsx_runtime_1.jsx)("option", { value: "1y", children: "Last Year" })] })] }), (0, jsx_runtime_1.jsx)("button", { onClick: handleRefresh, className: "refresh-btn", children: "Refresh Data" })] })] }), (0, jsx_runtime_1.jsxs)("nav", { className: "reporting-tabs", children: [(0, jsx_runtime_1.jsx)("button", { className: `tab-button ${activeTab === 'summary' ? 'active' : ''}`, onClick: () => setActiveTab('summary'), children: "Executive Summary" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-button ${activeTab === 'trends' ? 'active' : ''}`, onClick: () => setActiveTab('trends'), children: "Trend Analysis" }), (0, jsx_runtime_1.jsx)("button", { className: `tab-button ${activeTab === 'export' ? 'active' : ''}`, onClick: () => setActiveTab('export'), children: "Export Reports" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "reporting-content", children: [reportingData && ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [activeTab === 'summary' && ((0, jsx_runtime_1.jsx)(ExecutiveSummaryReport_1.ExecutiveSummaryReport, { data: reportingData })), activeTab === 'trends' && ((0, jsx_runtime_1.jsx)(TrendAnalysis_1.TrendAnalysis, { data: reportingData })), activeTab === 'export' && ((0, jsx_runtime_1.jsx)(AuditReportExporter_1.AuditReportExporter, { data: reportingData, timeRange: selectedTimeRange }))] })), !reportingData && !loading && ((0, jsx_runtime_1.jsxs)("div", { className: "no-data", children: [(0, jsx_runtime_1.jsx)("h2", { children: "No Analytics Data Available" }), (0, jsx_runtime_1.jsx)("p", { children: "No verification data found for the selected time range." })] }))] })] }));
};
exports.ReportingInterface = ReportingInterface;
//# sourceMappingURL=ReportingInterface.js.map