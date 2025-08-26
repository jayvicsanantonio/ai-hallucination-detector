"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MedicalAccuracyValidator = void 0;
class MedicalAccuracyValidator {
    constructor() {
        this.rules = new Map();
        this.knownMedications = new Set();
        this.knownConditions = new Set();
        this.initializeMedicalRules();
        this.initializeKnownMedications();
        this.initializeKnownConditions();
    }
    async validateMedicalAccuracy(content, medicalData) {
        const issues = [];
        // Validate medications and dosages
        issues.push(...this.validateMedications(medicalData, content));
        // Validate medical conditions
        issues.push(...this.validateMedicalConditions(medicalData, content));
        // Validate vital signs
        issues.push(...this.validateVitalSigns(medicalData, content));
        // Validate medical procedures
        issues.push(...this.validateMedicalProcedures(content));
        // Check for contraindications
        issues.push(...this.checkContraindications(medicalData, content));
        return issues;
    }
    async validateMedicalData(medicalData) {
        const startTime = Date.now();
        const issues = [];
        for (const data of medicalData) {
            switch (data.type) {
                case 'medication':
                    if (data.medication &&
                        !this.knownMedications.has(data.medication.toLowerCase())) {
                        issues.push({
                            id: `unknown-medication-${data.id}`,
                            type: 'factual_error',
                            severity: 'high',
                            location: data.location,
                            description: `Unknown or potentially misspelled medication: ${data.medication}`,
                            evidence: [data.value],
                            confidence: 80,
                            moduleSource: 'medical-accuracy-validator',
                        });
                    }
                    break;
                case 'medical_condition':
                    if (!this.knownConditions.has(data.value.toLowerCase())) {
                        issues.push({
                            id: `unknown-condition-${data.id}`,
                            type: 'factual_error',
                            severity: 'medium',
                            location: data.location,
                            description: `Unknown or potentially misspelled medical condition: ${data.value}`,
                            evidence: [data.value],
                            confidence: 70,
                            moduleSource: 'medical-accuracy-validator',
                        });
                    }
                    break;
                case 'vital_sign':
                    if (data.numericValue !== undefined) {
                        const vitalIssue = this.validateVitalSignRange(data);
                        if (vitalIssue) {
                            issues.push(vitalIssue);
                        }
                    }
                    break;
            }
        }
        const processingTime = Math.max(1, Date.now() - startTime);
        const confidence = issues.length === 0
            ? 95
            : Math.max(20, 95 - issues.length * 15);
        return {
            moduleId: 'medical-accuracy-validator',
            issues,
            confidence,
            processingTime,
        };
    }
    async updateRules(newRules) {
        for (const rule of newRules) {
            this.rules.set(rule.id, rule);
        }
    }
    validateMedications(medicalData, content) {
        const issues = [];
        const medications = medicalData.filter((d) => d.type === 'medication');
        for (const medication of medications) {
            // Check if medication name is recognized
            if (medication.medication &&
                !this.knownMedications.has(medication.medication.toLowerCase())) {
                issues.push({
                    id: `unknown-medication-${medication.id}`,
                    type: 'factual_error',
                    severity: 'high',
                    location: medication.location,
                    description: `Unknown or potentially misspelled medication: ${medication.medication}`,
                    evidence: [medication.value],
                    confidence: 80,
                    moduleSource: 'medical-accuracy-validator',
                });
            }
            // Validate dosage ranges
            if (medication.dosage) {
                const dosageIssue = this.validateDosageRange(medication);
                if (dosageIssue) {
                    issues.push(dosageIssue);
                }
            }
        }
        return issues;
    }
    validateMedicalConditions(medicalData, content) {
        const issues = [];
        const conditions = medicalData.filter((d) => d.type === 'medical_condition');
        for (const condition of conditions) {
            // Check if condition is recognized
            if (!this.knownConditions.has(condition.value.toLowerCase())) {
                issues.push({
                    id: `unknown-condition-${condition.id}`,
                    type: 'factual_error',
                    severity: 'medium',
                    location: condition.location,
                    description: `Unknown or potentially misspelled medical condition: ${condition.value}`,
                    evidence: [condition.value],
                    confidence: 70,
                    moduleSource: 'medical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    validateVitalSigns(medicalData, content) {
        const issues = [];
        const vitalSigns = medicalData.filter((d) => d.type === 'vital_sign');
        for (const vital of vitalSigns) {
            if (vital.numericValue !== undefined) {
                const vitalIssue = this.validateVitalSignRange(vital);
                if (vitalIssue) {
                    issues.push(vitalIssue);
                }
            }
        }
        return issues;
    }
    validateMedicalProcedures(content) {
        const issues = [];
        const text = content.extractedText.toLowerCase();
        // Check for potentially dangerous procedure combinations
        const dangerousCombinations = [
            {
                procedures: ['surgery', 'anesthesia'],
                warning: 'Ensure proper anesthesia protocols',
            },
            {
                procedures: ['radiation', 'chemotherapy'],
                warning: 'Monitor for combined toxicity',
            },
        ];
        for (const combination of dangerousCombinations) {
            const hasAllProcedures = combination.procedures.every((proc) => text.includes(proc));
            if (hasAllProcedures) {
                issues.push({
                    id: `procedure-combination-${Date.now()}`,
                    type: 'compliance_violation',
                    severity: 'medium',
                    location: { start: 0, end: 100, line: 1, column: 1 },
                    description: `Potentially risky procedure combination detected: ${combination.procedures.join(', ')}`,
                    evidence: combination.procedures,
                    confidence: 75,
                    moduleSource: 'medical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    checkContraindications(medicalData, content) {
        const issues = [];
        const medications = medicalData.filter((d) => d.type === 'medication');
        // Check for known drug interactions
        const knownInteractions = [
            {
                drugs: ['warfarin', 'aspirin'],
                severity: 'high',
                description: 'Increased bleeding risk',
            },
            {
                drugs: ['digoxin', 'furosemide'],
                severity: 'medium',
                description: 'Electrolyte imbalance risk',
            },
        ];
        for (const interaction of knownInteractions) {
            const presentDrugs = medications.filter((med) => interaction.drugs.some((drug) => med.medication?.toLowerCase().includes(drug.toLowerCase())));
            if (presentDrugs.length >= 2) {
                issues.push({
                    id: `drug-interaction-${Date.now()}`,
                    type: 'compliance_violation',
                    severity: interaction.severity,
                    location: { start: 0, end: 100, line: 1, column: 1 },
                    description: `Potential drug interaction: ${interaction.description}`,
                    evidence: presentDrugs.map((drug) => drug.value),
                    confidence: 85,
                    moduleSource: 'medical-accuracy-validator',
                });
            }
        }
        return issues;
    }
    validateDosageRange(medication) {
        if (!medication.dosage || !medication.medication)
            return null;
        // Extract numeric value and unit from dosage
        const dosageMatch = medication.dosage.match(/(\d+(?:\.\d+)?)\s*(mg|g|ml|mcg|units?)/i);
        if (!dosageMatch)
            return null;
        const value = parseFloat(dosageMatch[1]);
        const unit = dosageMatch[2].toLowerCase();
        // Define safe dosage ranges for common medications
        const dosageRanges = {
            aspirin: { mg: { min: 81, max: 1000 } },
            ibuprofen: { mg: { min: 200, max: 800 } },
            acetaminophen: { mg: { min: 325, max: 1000 } },
            metformin: { mg: { min: 500, max: 2000 } },
        };
        const medicationName = medication.medication.toLowerCase();
        const ranges = dosageRanges[medicationName];
        if (ranges && ranges[unit]) {
            const range = ranges[unit];
            if (value < range.min || value > range.max) {
                return {
                    id: `dosage-range-${medication.id}`,
                    type: 'factual_error',
                    severity: value > range.max ? 'high' : 'medium',
                    location: medication.location,
                    description: `Dosage outside safe range for ${medication.medication}: ${medication.dosage}`,
                    evidence: [
                        `Safe range: ${range.min}-${range.max} ${unit}`,
                        `Actual: ${value} ${unit}`,
                    ],
                    confidence: 90,
                    moduleSource: 'medical-accuracy-validator',
                };
            }
        }
        return null;
    }
    validateVitalSignRange(vital) {
        if (!vital.vitalType || vital.numericValue === undefined)
            return null;
        // Define normal ranges for vital signs
        const normalRanges = {
            blood_pressure: { min: 90, max: 180, unit: 'mmHg (systolic)' },
            heart_rate: { min: 60, max: 100, unit: 'bpm' },
            temperature: { min: 36, max: 38, unit: '°C' },
            weight: { min: 2, max: 300, unit: 'kg' },
        };
        const range = normalRanges[vital.vitalType];
        if (!range)
            return null;
        const value = vital.numericValue;
        let severity = 'low';
        // Determine severity based on how far outside normal range
        if (value < range.min * 0.5 || value > range.max * 2) {
            severity = 'critical';
        }
        else if (value < range.min * 0.7 || value > range.max * 1.5) {
            severity = 'high';
        }
        else if (value < range.min || value > range.max) {
            severity = 'medium';
        }
        else {
            return null; // Within normal range
        }
        return {
            id: `vital-range-${vital.id}`,
            type: 'factual_error',
            severity,
            location: vital.location,
            description: `${vital.vitalType.replace('_', ' ')} outside normal range: ${vital.value}`,
            evidence: [
                `Normal range: ${range.min}-${range.max} ${range.unit}`,
                `Actual: ${value}`,
            ],
            confidence: 85,
            moduleSource: 'medical-accuracy-validator',
        };
    }
    initializeMedicalRules() {
        const medicalRules = [
            {
                id: 'medical-001',
                name: 'medication-accuracy',
                description: 'Medications must be correctly spelled and recognized',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'medical-002',
                name: 'dosage-safety',
                description: 'Medication dosages must be within safe ranges',
                severity: 'critical',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
            {
                id: 'medical-003',
                name: 'vital-signs-validation',
                description: 'Vital signs must be within physiologically possible ranges',
                severity: 'high',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date(),
            },
        ];
        medicalRules.forEach((rule) => this.rules.set(rule.id, rule));
    }
    initializeKnownMedications() {
        // Common medications - in a real implementation, this would be a comprehensive database
        const medications = [
            'aspirin',
            'ibuprofen',
            'acetaminophen',
            'paracetamol',
            'metformin',
            'lisinopril',
            'atorvastatin',
            'amlodipine',
            'omeprazole',
            'levothyroxine',
            'warfarin',
            'digoxin',
            'furosemide',
            'insulin',
            'prednisone',
            'amoxicillin',
            'azithromycin',
            'ciprofloxacin',
            'doxycycline',
            'penicillin',
        ];
        medications.forEach((med) => this.knownMedications.add(med.toLowerCase()));
    }
    initializeKnownConditions() {
        // Common medical conditions - in a real implementation, this would be a comprehensive database
        const conditions = [
            'diabetes',
            'hypertension',
            'asthma',
            'copd',
            'pneumonia',
            'myocardial infarction',
            'stroke',
            'cancer',
            'depression',
            'anxiety',
            'arthritis',
            'osteoporosis',
            'alzheimer',
            'parkinson',
            'epilepsy',
            'migraine',
            'bronchitis',
            'sinusitis',
            'gastritis',
            'colitis',
        ];
        conditions.forEach((condition) => this.knownConditions.add(condition.toLowerCase()));
    }
}
exports.MedicalAccuracyValidator = MedicalAccuracyValidator;
//# sourceMappingURL=MedicalAccuracyValidator.js.map