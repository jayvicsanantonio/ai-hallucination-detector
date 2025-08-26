import {
  SOC2ComplianceService,
  SOC2Category,
} from '../../../../src/services/compliance/SOC2ComplianceService';

describe('SOC2ComplianceService', () => {
  let soc2Service: SOC2ComplianceService;

  beforeEach(() => {
    soc2Service = new SOC2ComplianceService();
    // Reset environment variables
    delete process.env.TLS_MIN_VERSION;
    delete process.env.DATA_ENCRYPTION_ENABLED;
    delete process.env.MFA_REQUIRED;
    delete process.env.MONITORING_ENABLED;
    delete process.env.AUDIT_LOGGING_ENABLED;
  });

  describe('initialization', () => {
    it('should initialize with standard SOC 2 controls', () => {
      const controls = soc2Service.getControlStatus();

      expect(controls.length).toBeGreaterThan(0);
      expect(controls.some((c) => c.id === 'CC6.7')).toBe(true); // Data transmission
      expect(controls.some((c) => c.id === 'CC6.8')).toBe(true); // Data at rest
      expect(controls.some((c) => c.id === 'CC6.1')).toBe(true); // Access controls
    });

    it('should have all controls in not-tested status initially', () => {
      const controls = soc2Service.getControlStatus();

      controls.forEach((control) => {
        expect(control.status).toBe('not-tested');
        expect(control.lastTested).toBeUndefined();
      });
    });

    it('should categorize controls correctly', () => {
      const controls = soc2Service.getControlStatus();

      const securityControls = controls.filter(
        (c) => c.category === SOC2Category.SECURITY
      );
      const availabilityControls = controls.filter(
        (c) => c.category === SOC2Category.AVAILABILITY
      );

      expect(securityControls.length).toBeGreaterThan(0);
      expect(availabilityControls.length).toBeGreaterThan(0);
    });
  });

  describe('performAutomatedAssessment', () => {
    it('should perform assessment and update control statuses', async () => {
      // Set up compliant environment
      process.env.TLS_MIN_VERSION = 'TLSv1.3';
      process.env.DATA_ENCRYPTION_ENABLED = 'true';
      process.env.MFA_REQUIRED = 'true';
      process.env.MONITORING_ENABLED = 'true';
      process.env.AUDIT_LOGGING_ENABLED = 'true';

      const assessment =
        await soc2Service.performAutomatedAssessment();

      expect(assessment).toHaveProperty('assessmentId');
      expect(assessment).toHaveProperty('timestamp');
      expect(assessment).toHaveProperty('controls');
      expect(assessment).toHaveProperty('overallStatus');
      expect(assessment).toHaveProperty('findings');
      expect(assessment).toHaveProperty('recommendations');

      // Check that controls were tested
      const controls = soc2Service.getControlStatus();
      controls.forEach((control) => {
        expect(control.lastTested).toBeDefined();
        expect(['compliant', 'non-compliant']).toContain(
          control.status
        );
      });
    });

    it('should identify non-compliant controls', async () => {
      // Set up non-compliant environment
      process.env.TLS_MIN_VERSION = 'TLSv1.2';
      process.env.DATA_ENCRYPTION_ENABLED = 'false';
      process.env.MFA_REQUIRED = 'false';

      const assessment =
        await soc2Service.performAutomatedAssessment();

      expect(assessment.overallStatus).not.toBe('compliant');
      expect(assessment.findings.length).toBeGreaterThan(0);

      const criticalFindings = assessment.findings.filter(
        (f) => f.severity === 'critical'
      );
      expect(criticalFindings.length).toBeGreaterThan(0);
    });

    it('should generate appropriate recommendations', async () => {
      process.env.DATA_ENCRYPTION_ENABLED = 'false';

      const assessment =
        await soc2Service.performAutomatedAssessment();

      expect(assessment.recommendations.length).toBeGreaterThan(0);
      expect(
        assessment.recommendations.some((r) =>
          r.includes('control deficiencies')
        )
      ).toBe(true);
    });

    it('should store assessment in history', async () => {
      await soc2Service.performAutomatedAssessment();

      const history = soc2Service.getAssessmentHistory();
      expect(history.length).toBe(1);

      const latest = soc2Service.getLatestAssessment();
      expect(latest).toBeDefined();
      expect(latest!.assessmentId).toBe(history[0].assessmentId);
    });
  });

  describe('control testing', () => {
    it('should test TLS configuration correctly', async () => {
      process.env.TLS_MIN_VERSION = 'TLSv1.3';

      const assessment =
        await soc2Service.performAutomatedAssessment();
      const tlsControl = assessment.controls.find(
        (c) => c.id === 'CC6.7'
      );

      expect(tlsControl?.status).toBe('compliant');
    });

    it('should detect non-compliant TLS configuration', async () => {
      process.env.TLS_MIN_VERSION = 'TLSv1.1';

      const assessment =
        await soc2Service.performAutomatedAssessment();
      const tlsControl = assessment.controls.find(
        (c) => c.id === 'CC6.7'
      );

      expect(tlsControl?.status).toBe('non-compliant');

      const tlsFinding = assessment.findings.find(
        (f) => f.controlId === 'CC6.7'
      );
      expect(tlsFinding?.severity).toBe('high');
    });

    it('should test encryption at rest', async () => {
      process.env.DATA_ENCRYPTION_ENABLED = 'true';

      const assessment =
        await soc2Service.performAutomatedAssessment();
      const encryptionControl = assessment.controls.find(
        (c) => c.id === 'CC6.8'
      );

      expect(encryptionControl?.status).toBe('compliant');
    });

    it('should detect missing encryption at rest', async () => {
      process.env.DATA_ENCRYPTION_ENABLED = 'false';

      const assessment =
        await soc2Service.performAutomatedAssessment();
      const encryptionControl = assessment.controls.find(
        (c) => c.id === 'CC6.8'
      );

      expect(encryptionControl?.status).toBe('non-compliant');

      const encryptionFinding = assessment.findings.find(
        (f) => f.controlId === 'CC6.8'
      );
      expect(encryptionFinding?.severity).toBe('critical');
    });
  });

  describe('updateControl', () => {
    it('should update control implementation', () => {
      const success = soc2Service.updateControl('CC6.7', {
        implementation:
          'Updated TLS implementation with additional security measures',
      });

      expect(success).toBe(true);

      const controls = soc2Service.getControlStatus();
      const updatedControl = controls.find((c) => c.id === 'CC6.7');
      expect(updatedControl?.implementation).toContain(
        'Updated TLS implementation'
      );
    });

    it('should return false for non-existent control', () => {
      const success = soc2Service.updateControl('INVALID', {
        implementation: 'Test',
      });

      expect(success).toBe(false);
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate comprehensive compliance report', async () => {
      // Perform assessment first
      await soc2Service.performAutomatedAssessment();

      const report = soc2Service.generateComplianceReport();

      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('controlsByCategory');
      expect(report).toHaveProperty('criticalFindings');
      expect(report).toHaveProperty('recommendations');

      expect(report.summary.totalControls).toBeGreaterThan(0);
      expect(
        report.summary.compliancePercentage
      ).toBeGreaterThanOrEqual(0);
      expect(report.summary.compliancePercentage).toBeLessThanOrEqual(
        100
      );
    });

    it('should categorize controls by SOC 2 categories', async () => {
      await soc2Service.performAutomatedAssessment();

      const report = soc2Service.generateComplianceReport();

      expect(
        report.controlsByCategory[SOC2Category.SECURITY]
      ).toBeGreaterThan(0);
      expect(
        report.controlsByCategory[SOC2Category.AVAILABILITY]
      ).toBeGreaterThan(0);
    });

    it('should identify critical findings', async () => {
      // Set up environment with critical issues
      process.env.DATA_ENCRYPTION_ENABLED = 'false';

      await soc2Service.performAutomatedAssessment();
      const report = soc2Service.generateComplianceReport();

      expect(report.criticalFindings.length).toBeGreaterThan(0);
      expect(report.criticalFindings[0].severity).toBe('critical');
    });
  });

  describe('error handling', () => {
    it('should handle assessment errors gracefully', async () => {
      // This test ensures the service doesn't crash on unexpected errors
      const assessment =
        await soc2Service.performAutomatedAssessment();

      expect(assessment).toBeDefined();
      expect(assessment.assessmentId).toBeDefined();
    });
  });

  describe('compliance scoring', () => {
    it('should calculate compliance percentage correctly', async () => {
      // Set up fully compliant environment
      process.env.TLS_MIN_VERSION = 'TLSv1.3';
      process.env.DATA_ENCRYPTION_ENABLED = 'true';
      process.env.MFA_REQUIRED = 'true';
      process.env.MONITORING_ENABLED = 'true';
      process.env.AUDIT_LOGGING_ENABLED = 'true';

      await soc2Service.performAutomatedAssessment();
      const report = soc2Service.generateComplianceReport();

      expect(report.summary.compliancePercentage).toBeGreaterThan(80);
    });

    it('should show low compliance for non-compliant environment', async () => {
      // Set up non-compliant environment
      process.env.TLS_MIN_VERSION = 'TLSv1.1';
      process.env.DATA_ENCRYPTION_ENABLED = 'false';
      process.env.MFA_REQUIRED = 'false';
      process.env.MONITORING_ENABLED = 'false';
      process.env.AUDIT_LOGGING_ENABLED = 'false';

      await soc2Service.performAutomatedAssessment();
      const report = soc2Service.generateComplianceReport();

      expect(report.summary.compliancePercentage).toBeLessThan(50);
    });
  });
});
