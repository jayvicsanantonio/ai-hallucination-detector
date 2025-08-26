export interface SOC2Control {
    id: string;
    category: SOC2Category;
    description: string;
    implementation: string;
    testProcedure: string;
    frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly';
    status: 'compliant' | 'non-compliant' | 'not-tested';
    lastTested?: Date;
    evidence?: string[];
}
export declare enum SOC2Category {
    SECURITY = "security",
    AVAILABILITY = "availability",
    PROCESSING_INTEGRITY = "processing_integrity",
    CONFIDENTIALITY = "confidentiality",
    PRIVACY = "privacy"
}
export interface SOC2Assessment {
    assessmentId: string;
    timestamp: Date;
    controls: SOC2Control[];
    overallStatus: 'compliant' | 'non-compliant' | 'partial';
    findings: SOC2Finding[];
    recommendations: string[];
}
export interface SOC2Finding {
    controlId: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    remediation: string;
    dueDate?: Date;
}
export declare class SOC2ComplianceService {
    private controls;
    private assessmentHistory;
    constructor();
    /**
     * Initialize standard SOC 2 controls
     */
    private initializeControls;
    /**
     * Performs automated testing of SOC 2 controls
     */
    performAutomatedAssessment(): Promise<SOC2Assessment>;
    /**
     * Tests an individual SOC 2 control
     */
    private testControl;
    private testDataTransmissionProtection;
    private testDataAtRestProtection;
    private testAccessControls;
    private testAvailabilityMonitoring;
    private testProcessingIntegrity;
    /**
     * Gets the current status of all controls
     */
    getControlStatus(): SOC2Control[];
    /**
     * Gets assessment history
     */
    getAssessmentHistory(): SOC2Assessment[];
    /**
     * Gets the latest assessment
     */
    getLatestAssessment(): SOC2Assessment | null;
    /**
     * Updates a control's implementation
     */
    updateControl(controlId: string, updates: Partial<SOC2Control>): boolean;
    /**
     * Generates compliance report
     */
    generateComplianceReport(): {
        summary: {
            totalControls: number;
            compliantControls: number;
            nonCompliantControls: number;
            compliancePercentage: number;
        };
        controlsByCategory: Record<SOC2Category, number>;
        criticalFindings: SOC2Finding[];
        recommendations: string[];
    };
}
export declare const soc2ComplianceService: SOC2ComplianceService;
//# sourceMappingURL=SOC2ComplianceService.d.ts.map