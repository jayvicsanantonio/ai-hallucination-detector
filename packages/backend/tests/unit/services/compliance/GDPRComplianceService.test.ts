import {
  GDPRComplianceService,
  DataCategory,
  GDPRRight,
  ConsentStatus,
} from '../../../../src/services/compliance/GDPRComplianceService';

describe('GDPRComplianceService', () => {
  let gdprService: GDPRComplianceService;

  beforeEach(() => {
    gdprService = new GDPRComplianceService();
  });

  describe('data subject registration', () => {
    it('should register new data subject with consent', () => {
      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      const subject = gdprService.registerDataSubject(
        'user-123',
        'test@example.com',
        consent,
        [
          DataCategory.PERSONAL_IDENTIFIERS,
          DataCategory.CONTACT_INFORMATION,
        ],
        'John Doe'
      );

      expect(subject.id).toBe('user-123');
      expect(subject.email).toBe('test@example.com');
      expect(subject.name).toBe('John Doe');
      expect(subject.consentStatus).toEqual(consent);
      expect(subject.dataCategories).toContain(
        DataCategory.PERSONAL_IDENTIFIERS
      );
    });

    it('should store registered data subject', () => {
      const consent: ConsentStatus = {
        marketing: false,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      gdprService.registerDataSubject(
        'user-456',
        'user456@example.com',
        consent,
        [DataCategory.CONTACT_INFORMATION]
      );

      const subjects = gdprService.getDataSubjects();
      expect(subjects.length).toBe(1);
      expect(subjects[0].id).toBe('user-456');
    });
  });

  describe('consent management', () => {
    beforeEach(() => {
      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      gdprService.registerDataSubject(
        'user-123',
        'test@example.com',
        consent,
        [DataCategory.PERSONAL_IDENTIFIERS]
      );
    });

    it('should update consent for existing data subject', () => {
      const success = gdprService.updateConsent('user-123', {
        marketing: false,
        analytics: false,
      });

      expect(success).toBe(true);

      const subjects = gdprService.getDataSubjects();
      const subject = subjects.find((s) => s.id === 'user-123');
      expect(subject?.consentStatus.marketing).toBe(false);
      expect(subject?.consentStatus.analytics).toBe(false);
      expect(subject?.consentStatus.functional).toBe(true); // Should remain unchanged
    });

    it('should return false for non-existent data subject', () => {
      const success = gdprService.updateConsent('non-existent', {
        marketing: false,
      });

      expect(success).toBe(false);
    });

    it('should update consent date when consent is modified', () => {
      const originalDate = new Date('2023-01-01');

      // First, update to set a specific date
      gdprService.updateConsent('user-123', {
        consentDate: originalDate,
      });

      // Then update consent again
      const success = gdprService.updateConsent('user-123', {
        marketing: false,
      });

      expect(success).toBe(true);

      const subjects = gdprService.getDataSubjects();
      const subject = subjects.find((s) => s.id === 'user-123');
      expect(
        subject?.consentStatus.consentDate.getTime()
      ).toBeGreaterThan(originalDate.getTime());
    });
  });

  describe('data subject rights requests', () => {
    beforeEach(() => {
      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      gdprService.registerDataSubject(
        'user-123',
        'test@example.com',
        consent,
        [
          DataCategory.PERSONAL_IDENTIFIERS,
          DataCategory.CONTACT_INFORMATION,
        ],
        'John Doe'
      );
    });

    it('should process access request (Article 15)', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.ACCESS
      );

      expect(request.requestType).toBe(GDPRRight.ACCESS);
      expect(request.status).toBe('completed');
      expect(request.responseData).toBeDefined();
      expect(request.responseData.personalData).toBeDefined();
      expect(request.responseData.personalData.email).toBe(
        'test@example.com'
      );
    });

    it('should process erasure request (Article 17)', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.ERASURE
      );

      expect(request.requestType).toBe(GDPRRight.ERASURE);
      // Erasure may be rejected due to legal obligations for certain data categories
      expect(['completed', 'rejected']).toContain(request.status);

      if (request.status === 'rejected') {
        expect(request.rejectionReason).toBeDefined();
      }
    });

    it('should process data portability request (Article 20)', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.DATA_PORTABILITY
      );

      expect(request.requestType).toBe(GDPRRight.DATA_PORTABILITY);
      expect(request.status).toBe('completed');
      expect(request.responseData).toBeDefined();
      expect(request.responseData.format).toBe('JSON');
      expect(request.responseData.data).toBeDefined();
    });

    it('should process consent withdrawal', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.WITHDRAW_CONSENT
      );

      expect(request.requestType).toBe(GDPRRight.WITHDRAW_CONSENT);
      expect(request.status).toBe('completed');

      // Check that consent was withdrawn
      const subjects = gdprService.getDataSubjects();
      const subject = subjects.find((s) => s.id === 'user-123');
      expect(subject?.consentStatus.marketing).toBe(false);
      expect(subject?.consentStatus.analytics).toBe(false);
      expect(subject?.consentStatus.necessary).toBe(true); // Should remain true
    });

    it('should reject requests for non-existent data subjects', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'non-existent',
        GDPRRight.ACCESS
      );

      expect(request.status).toBe('rejected');
      expect(request.rejectionReason).toBe('Data subject not found');
    });

    it('should store all requests', async () => {
      await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.ACCESS
      );
      await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.DATA_PORTABILITY
      );

      const requests = gdprService.getDataSubjectRequests();
      expect(requests.length).toBe(2);
    });
  });

  describe('data retention', () => {
    it('should have default retention policies', () => {
      const policies = gdprService.getRetentionPolicies();

      expect(policies.length).toBeGreaterThan(0);
      expect(
        policies.some(
          (p) => p.dataCategory === DataCategory.PERSONAL_IDENTIFIERS
        )
      ).toBe(true);
      expect(
        policies.some(
          (p) => p.dataCategory === DataCategory.CONTACT_INFORMATION
        )
      ).toBe(true);
    });

    it('should perform retention cleanup', async () => {
      // Register data subject with old consent date
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 10); // 10 years ago

      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: oldDate,
      };

      gdprService.registerDataSubject(
        'old-user',
        'old@example.com',
        consent,
        [DataCategory.BEHAVIORAL_DATA], // Has 2-year retention
        'Old User'
      );

      const results = await gdprService.performRetentionCleanup();

      expect(results.processed).toBe(1);
      expect(results.anonymized).toBeGreaterThanOrEqual(0);
      expect(results.deleted).toBeGreaterThanOrEqual(0);
    });

    it('should update retention policy', () => {
      const newPolicy = {
        dataCategory: DataCategory.USAGE_DATA,
        retentionPeriod: 180, // 6 months
        legalBasis: 'Updated legal basis',
        deletionMethod: 'hard_delete' as const,
        reviewFrequency: 'monthly' as const,
      };

      gdprService.updateRetentionPolicy(
        DataCategory.USAGE_DATA,
        newPolicy
      );

      const policies = gdprService.getRetentionPolicies();
      const updatedPolicy = policies.find(
        (p) => p.dataCategory === DataCategory.USAGE_DATA
      );
      expect(updatedPolicy?.retentionPeriod).toBe(180);
      expect(updatedPolicy?.legalBasis).toBe('Updated legal basis');
    });
  });

  describe('compliance reporting', () => {
    beforeEach(() => {
      // Set up test data
      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      gdprService.registerDataSubject(
        'user-1',
        'user1@example.com',
        consent,
        [DataCategory.PERSONAL_IDENTIFIERS]
      );

      gdprService.registerDataSubject(
        'user-2',
        'user2@example.com',
        { ...consent, marketing: false, analytics: false },
        [DataCategory.CONTACT_INFORMATION]
      );
    });

    it('should generate compliance report', () => {
      const report = gdprService.generateComplianceReport();

      expect(report).toHaveProperty('reportId');
      expect(report).toHaveProperty('generatedDate');
      expect(report).toHaveProperty('totalDataSubjects');
      expect(report).toHaveProperty('activeConsents');
      expect(report).toHaveProperty('complianceScore');
      expect(report).toHaveProperty('recommendations');

      expect(report.totalDataSubjects).toBe(2);
      expect(report.activeConsents).toBeGreaterThanOrEqual(1);
      expect(report.complianceScore).toBeGreaterThanOrEqual(0);
      expect(report.complianceScore).toBeLessThanOrEqual(100);
    });

    it('should include recommendations for compliance issues', () => {
      // Create expired data scenario
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 10);

      const oldConsent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: oldDate,
      };

      gdprService.registerDataSubject(
        'expired-user',
        'expired@example.com',
        oldConsent,
        [DataCategory.BEHAVIORAL_DATA]
      );

      const report = gdprService.generateComplianceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(
        report.recommendations.some((r) =>
          r.includes('retention cleanup')
        )
      ).toBe(true);
    });

    it('should calculate compliance score based on issues', () => {
      // Test with clean data
      let report = gdprService.generateComplianceReport();
      const cleanScore = report.complianceScore;

      // Add expired data
      const oldDate = new Date();
      oldDate.setFullYear(oldDate.getFullYear() - 10);

      const oldConsent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: oldDate,
      };

      gdprService.registerDataSubject(
        'expired-user',
        'expired@example.com',
        oldConsent,
        [DataCategory.BEHAVIORAL_DATA]
      );

      report = gdprService.generateComplianceReport();
      expect(report.complianceScore).toBeLessThan(cleanScore);
    });
  });

  describe('error handling', () => {
    it('should handle retention cleanup errors gracefully', async () => {
      const results = await gdprService.performRetentionCleanup();

      expect(results).toHaveProperty('processed');
      expect(results).toHaveProperty('deleted');
      expect(results).toHaveProperty('anonymized');
      expect(results).toHaveProperty('errors');
      expect(Array.isArray(results.errors)).toBe(true);
    });

    it('should handle invalid data subject requests', async () => {
      const request = await gdprService.processDataSubjectRequest(
        'invalid-user',
        GDPRRight.ACCESS
      );

      expect(request.status).toBe('rejected');
      expect(request.rejectionReason).toBeDefined();
    });
  });

  describe('data categories and processing purposes', () => {
    it('should correctly map data categories to processing purposes', async () => {
      const consent: ConsentStatus = {
        marketing: true,
        analytics: true,
        functional: true,
        necessary: true,
        consentDate: new Date(),
      };

      gdprService.registerDataSubject(
        'user-123',
        'test@example.com',
        consent,
        [
          DataCategory.PERSONAL_IDENTIFIERS,
          DataCategory.CONTACT_INFORMATION,
          DataCategory.BEHAVIORAL_DATA,
        ]
      );

      const request = await gdprService.processDataSubjectRequest(
        'user-123',
        GDPRRight.ACCESS
      );

      const purposes = request.responseData.processingPurposes;
      expect(purposes).toContain(
        'User identification and authentication'
      );
      expect(purposes).toContain(
        'Communication and customer service'
      );
      expect(purposes).toContain('Service improvement and analytics');
    });
  });
});
