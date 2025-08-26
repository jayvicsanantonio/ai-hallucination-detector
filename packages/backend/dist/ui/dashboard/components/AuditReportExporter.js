"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditReportExporter = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const AuditReportExporter = ({ data, timeRange }) => {
    const [exportFormat, setExportFormat] = (0, react_1.useState)('pdf');
    const [reportType, setReportType] = (0, react_1.useState)('summary');
    const [isExporting, setIsExporting] = (0, react_1.useState)(false);
    const [exportStatus, setExportStatus] = (0, react_1.useState)(null);
    const handleExport = async () => {
        setIsExporting(true);
        setExportStatus(null);
        try {
            const response = await fetch('/api/v1/reports/export', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    format: exportFormat,
                    type: reportType,
                    timeRange,
                    data,
                }),
            });
            if (!response.ok) {
                throw new Error(`Export failed: ${response.statusText}`);
            }
            // Handle file download
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const filename = `verification-report-${reportType}-${timeRange}.${exportFormat}`;
            link.download = filename;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            setExportStatus('Export completed successfully');
        }
        catch (error) {
            setExportStatus(error instanceof Error ? error.message : 'Export failed');
        }
        finally {
            setIsExporting(false);
        }
    };
    const getReportDescription = (type) => {
        switch (type) {
            case 'summary':
                return 'High-level overview with key metrics and insights for executive review.';
            case 'detailed':
                return 'Comprehensive report including all verification results and detailed analysis.';
            case 'audit':
                return 'Complete audit trail with compliance information for regulatory purposes.';
            default:
                return '';
        }
    };
    const getFormatDescription = (format) => {
        switch (format) {
            case 'pdf':
                return 'Professional formatted document suitable for sharing and archiving.';
            case 'excel':
                return 'Spreadsheet format with multiple sheets for data analysis and manipulation.';
            case 'csv':
                return 'Raw data format suitable for importing into other systems or tools.';
            default:
                return '';
        }
    };
    const estimateFileSize = () => {
        const baseSize = data.totalVerifications * 0.1; // KB per verification
        const multiplier = reportType === 'audit' ? 3 : reportType === 'detailed' ? 2 : 1;
        const formatMultiplier = exportFormat === 'pdf'
            ? 1.5
            : exportFormat === 'excel'
                ? 1.2
                : 0.8;
        const sizeKB = baseSize * multiplier * formatMultiplier;
        if (sizeKB < 1024) {
            return `~${Math.round(sizeKB)} KB`;
        }
        else {
            return `~${(sizeKB / 1024).toFixed(1)} MB`;
        }
    };
    return ((0, jsx_runtime_1.jsxs)("div", { className: "audit-report-exporter", children: [(0, jsx_runtime_1.jsxs)("div", { className: "exporter-header", children: [(0, jsx_runtime_1.jsx)("h2", { children: "Export Reports" }), (0, jsx_runtime_1.jsx)("p", { children: "Generate and download verification reports in multiple formats" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "export-configuration", children: [(0, jsx_runtime_1.jsxs)("div", { className: "config-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Report Type" }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-group", children: [(0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "reportType", value: "summary", checked: reportType === 'summary', onChange: (e) => setReportType(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "Executive Summary" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getReportDescription('summary') })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "reportType", value: "detailed", checked: reportType === 'detailed', onChange: (e) => setReportType(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "Detailed Analysis" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getReportDescription('detailed') })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "reportType", value: "audit", checked: reportType === 'audit', onChange: (e) => setReportType(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "Audit Trail" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getReportDescription('audit') })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "config-section", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Export Format" }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-group", children: [(0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "exportFormat", value: "pdf", checked: exportFormat === 'pdf', onChange: (e) => setExportFormat(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "PDF Document" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getFormatDescription('pdf') })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "exportFormat", value: "excel", checked: exportFormat === 'excel', onChange: (e) => setExportFormat(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "Excel Spreadsheet" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getFormatDescription('excel') })] })] }), (0, jsx_runtime_1.jsxs)("label", { className: "radio-option", children: [(0, jsx_runtime_1.jsx)("input", { type: "radio", name: "exportFormat", value: "csv", checked: exportFormat === 'csv', onChange: (e) => setExportFormat(e.target.value) }), (0, jsx_runtime_1.jsxs)("div", { className: "radio-content", children: [(0, jsx_runtime_1.jsx)("div", { className: "radio-title", children: "CSV Data" }), (0, jsx_runtime_1.jsx)("div", { className: "radio-description", children: getFormatDescription('csv') })] })] })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "export-preview", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Export Preview" }), (0, jsx_runtime_1.jsxs)("div", { className: "preview-details", children: [(0, jsx_runtime_1.jsxs)("div", { className: "preview-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-label", children: "Report Type:" }), (0, jsx_runtime_1.jsx)("span", { className: "preview-value", children: reportType.charAt(0).toUpperCase() +
                                            reportType.slice(1) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preview-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-label", children: "Format:" }), (0, jsx_runtime_1.jsx)("span", { className: "preview-value", children: exportFormat.toUpperCase() })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preview-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-label", children: "Time Range:" }), (0, jsx_runtime_1.jsx)("span", { className: "preview-value", children: timeRange })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preview-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-label", children: "Data Points:" }), (0, jsx_runtime_1.jsxs)("span", { className: "preview-value", children: [data.totalVerifications, " verifications"] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "preview-item", children: [(0, jsx_runtime_1.jsx)("span", { className: "preview-label", children: "Estimated Size:" }), (0, jsx_runtime_1.jsx)("span", { className: "preview-value", children: estimateFileSize() })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "export-actions", children: [(0, jsx_runtime_1.jsx)("button", { onClick: handleExport, disabled: isExporting, className: "export-button primary", children: isExporting
                            ? 'Generating Report...'
                            : 'Generate & Download Report' }), exportStatus && ((0, jsx_runtime_1.jsx)("div", { className: `export-status ${exportStatus.includes('success') ? 'success' : 'error'}`, children: exportStatus }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "export-info", children: [(0, jsx_runtime_1.jsx)("h3", { children: "Additional Information" }), (0, jsx_runtime_1.jsxs)("div", { className: "info-grid", children: [(0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Compliance Standards" }), (0, jsx_runtime_1.jsx)("p", { children: "All exported reports meet SOX, GDPR, and industry-specific compliance requirements." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Data Retention" }), (0, jsx_runtime_1.jsx)("p", { children: "Audit reports are automatically retained for 7 years as per regulatory requirements." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Security" }), (0, jsx_runtime_1.jsx)("p", { children: "All exports are encrypted and include digital signatures for authenticity verification." })] }), (0, jsx_runtime_1.jsxs)("div", { className: "info-item", children: [(0, jsx_runtime_1.jsx)("h4", { children: "Scheduling" }), (0, jsx_runtime_1.jsx)("p", { children: "Set up automated report generation and delivery through the system settings." })] })] })] })] }));
};
exports.AuditReportExporter = AuditReportExporter;
//# sourceMappingURL=AuditReportExporter.js.map