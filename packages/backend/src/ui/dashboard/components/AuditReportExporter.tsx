import React, { useState } from 'react';
import { ReportingData } from './ReportingInterface';

interface AuditReportExporterProps {
  data: ReportingData;
  timeRange: string;
}

export const AuditReportExporter: React.FC<
  AuditReportExporterProps
> = ({ data, timeRange }) => {
  const [exportFormat, setExportFormat] = useState<
    'pdf' | 'excel' | 'csv'
  >('pdf');
  const [reportType, setReportType] = useState<
    'summary' | 'detailed' | 'audit'
  >('summary');
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string | null>(
    null
  );

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
    } catch (error) {
      setExportStatus(
        error instanceof Error ? error.message : 'Export failed'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const getReportDescription = (type: string): string => {
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

  const getFormatDescription = (format: string): string => {
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

  const estimateFileSize = (): string => {
    const baseSize = data.totalVerifications * 0.1; // KB per verification
    const multiplier =
      reportType === 'audit' ? 3 : reportType === 'detailed' ? 2 : 1;
    const formatMultiplier =
      exportFormat === 'pdf'
        ? 1.5
        : exportFormat === 'excel'
        ? 1.2
        : 0.8;

    const sizeKB = baseSize * multiplier * formatMultiplier;

    if (sizeKB < 1024) {
      return `~${Math.round(sizeKB)} KB`;
    } else {
      return `~${(sizeKB / 1024).toFixed(1)} MB`;
    }
  };

  return (
    <div className="audit-report-exporter">
      <div className="exporter-header">
        <h2>Export Reports</h2>
        <p>
          Generate and download verification reports in multiple
          formats
        </p>
      </div>

      <div className="export-configuration">
        <div className="config-section">
          <h3>Report Type</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="reportType"
                value="summary"
                checked={reportType === 'summary'}
                onChange={(e) => setReportType(e.target.value as any)}
              />
              <div className="radio-content">
                <div className="radio-title">Executive Summary</div>
                <div className="radio-description">
                  {getReportDescription('summary')}
                </div>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="reportType"
                value="detailed"
                checked={reportType === 'detailed'}
                onChange={(e) => setReportType(e.target.value as any)}
              />
              <div className="radio-content">
                <div className="radio-title">Detailed Analysis</div>
                <div className="radio-description">
                  {getReportDescription('detailed')}
                </div>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="reportType"
                value="audit"
                checked={reportType === 'audit'}
                onChange={(e) => setReportType(e.target.value as any)}
              />
              <div className="radio-content">
                <div className="radio-title">Audit Trail</div>
                <div className="radio-description">
                  {getReportDescription('audit')}
                </div>
              </div>
            </label>
          </div>
        </div>

        <div className="config-section">
          <h3>Export Format</h3>
          <div className="radio-group">
            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="pdf"
                checked={exportFormat === 'pdf'}
                onChange={(e) =>
                  setExportFormat(e.target.value as any)
                }
              />
              <div className="radio-content">
                <div className="radio-title">PDF Document</div>
                <div className="radio-description">
                  {getFormatDescription('pdf')}
                </div>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="excel"
                checked={exportFormat === 'excel'}
                onChange={(e) =>
                  setExportFormat(e.target.value as any)
                }
              />
              <div className="radio-content">
                <div className="radio-title">Excel Spreadsheet</div>
                <div className="radio-description">
                  {getFormatDescription('excel')}
                </div>
              </div>
            </label>

            <label className="radio-option">
              <input
                type="radio"
                name="exportFormat"
                value="csv"
                checked={exportFormat === 'csv'}
                onChange={(e) =>
                  setExportFormat(e.target.value as any)
                }
              />
              <div className="radio-content">
                <div className="radio-title">CSV Data</div>
                <div className="radio-description">
                  {getFormatDescription('csv')}
                </div>
              </div>
            </label>
          </div>
        </div>
      </div>

      <div className="export-preview">
        <h3>Export Preview</h3>
        <div className="preview-details">
          <div className="preview-item">
            <span className="preview-label">Report Type:</span>
            <span className="preview-value">
              {reportType.charAt(0).toUpperCase() +
                reportType.slice(1)}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Format:</span>
            <span className="preview-value">
              {exportFormat.toUpperCase()}
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Time Range:</span>
            <span className="preview-value">{timeRange}</span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Data Points:</span>
            <span className="preview-value">
              {data.totalVerifications} verifications
            </span>
          </div>
          <div className="preview-item">
            <span className="preview-label">Estimated Size:</span>
            <span className="preview-value">
              {estimateFileSize()}
            </span>
          </div>
        </div>
      </div>

      <div className="export-actions">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className="export-button primary"
        >
          {isExporting
            ? 'Generating Report...'
            : 'Generate & Download Report'}
        </button>

        {exportStatus && (
          <div
            className={`export-status ${
              exportStatus.includes('success') ? 'success' : 'error'
            }`}
          >
            {exportStatus}
          </div>
        )}
      </div>

      <div className="export-info">
        <h3>Additional Information</h3>
        <div className="info-grid">
          <div className="info-item">
            <h4>Compliance Standards</h4>
            <p>
              All exported reports meet SOX, GDPR, and
              industry-specific compliance requirements.
            </p>
          </div>
          <div className="info-item">
            <h4>Data Retention</h4>
            <p>
              Audit reports are automatically retained for 7 years as
              per regulatory requirements.
            </p>
          </div>
          <div className="info-item">
            <h4>Security</h4>
            <p>
              All exports are encrypted and include digital signatures
              for authenticity verification.
            </p>
          </div>
          <div className="info-item">
            <h4>Scheduling</h4>
            <p>
              Set up automated report generation and delivery through
              the system settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
