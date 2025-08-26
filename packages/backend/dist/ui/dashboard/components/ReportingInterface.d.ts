import React from 'react';
export interface ReportingData {
    totalVerifications: number;
    averageConfidence: number;
    riskDistribution: Record<string, number>;
    issueTypes: Record<string, number>;
    timeRange: {
        start: Date;
        end: Date;
    };
    trends: {
        date: string;
        verifications: number;
        averageConfidence: number;
        issuesFound: number;
    }[];
}
interface ReportingInterfaceProps {
    onDataRefresh?: () => void;
}
export declare const ReportingInterface: React.FC<ReportingInterfaceProps>;
export {};
//# sourceMappingURL=ReportingInterface.d.ts.map