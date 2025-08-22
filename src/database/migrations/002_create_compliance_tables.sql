-- Create compliance rules table
CREATE TABLE compliance_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_text TEXT NOT NULL,
    regulation VARCHAR(255) NOT NULL,
    jurisdiction VARCHAR(100) NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('legal', 'financial', 'healthcare', 'insurance')),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    examples JSONB DEFAULT '[]',
    keywords JSONB DEFAULT '[]',
    patterns JSONB DEFAULT '[]',
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create compliance violations table for audit trail
CREATE TABLE compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_session_id UUID NOT NULL,
    rule_id UUID NOT NULL REFERENCES compliance_rules(id),
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN ('keyword_match', 'pattern_match', 'semantic_match')),
    location_start INTEGER NOT NULL,
    location_end INTEGER NOT NULL,
    location_text TEXT NOT NULL,
    confidence DECIMAL(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    description TEXT NOT NULL,
    suggested_fix TEXT,
    regulatory_reference TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX idx_compliance_rules_domain ON compliance_rules(domain);
CREATE INDEX idx_compliance_rules_jurisdiction ON compliance_rules(jurisdiction);
CREATE INDEX idx_compliance_rules_regulation ON compliance_rules(regulation);
CREATE INDEX idx_compliance_rules_active ON compliance_rules(is_active);
CREATE INDEX idx_compliance_violations_session ON compliance_violations(verification_session_id);
CREATE INDEX idx_compliance_violations_rule ON compliance_violations(rule_id);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_compliance_rules_updated_at 
    BEFORE UPDATE ON compliance_rules 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();