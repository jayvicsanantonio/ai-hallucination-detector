-- Migration: Create audit and session tables
-- Version: 001
-- Description: Initial audit logging and session tracking tables

-- Create verification_sessions table
CREATE TABLE IF NOT EXISTS verification_sessions (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) NOT NULL,
    content_id VARCHAR(255) NOT NULL,
    domain VARCHAR(50) NOT NULL CHECK (domain IN ('legal', 'financial', 'healthcare', 'insurance')),
    status VARCHAR(50) NOT NULL CHECK (status IN ('processing', 'completed', 'failed')),
    results JSONB,
    feedback JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    
    -- Constraints
    CONSTRAINT chk_completed_at_after_created CHECK (completed_at IS NULL OR completed_at >= created_at),
    CONSTRAINT chk_completed_status CHECK (
        (status = 'completed' AND (results IS NOT NULL OR error_message IS NOT NULL)) OR
        (status = 'failed' AND error_message IS NOT NULL) OR
        status = 'processing'
    )
);

-- Create indexes for verification_sessions
CREATE INDEX IF NOT EXISTS idx_verification_sessions_user_id ON verification_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_organization_id ON verification_sessions(organization_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_content_id ON verification_sessions(content_id);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_domain ON verification_sessions(domain);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_status ON verification_sessions(status);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_created_at ON verification_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_verification_sessions_completed_at ON verification_sessions(completed_at);

-- Create audit_entries table
CREATE TABLE IF NOT EXISTS audit_entries (
    id VARCHAR(255) PRIMARY KEY,
    session_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    action VARCHAR(100) NOT NULL CHECK (action IN (
        'session_created', 'content_uploaded', 'content_parsed', 'verification_started',
        'verification_completed', 'verification_failed', 'issue_detected', 'feedback_submitted',
        'results_accessed', 'export_requested', 'user_authenticated', 'user_authorized',
        'configuration_changed', 'system_error', 'security_event'
    )),
    component VARCHAR(255) NOT NULL,
    details JSONB NOT NULL DEFAULT '{}',
    user_id VARCHAR(255),
    organization_id VARCHAR(255),
    ip_address INET,
    user_agent TEXT,
    duration INTEGER CHECK (duration >= 0),
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    severity VARCHAR(50) NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    
    -- Foreign key constraint
    CONSTRAINT fk_audit_entries_session_id FOREIGN KEY (session_id) REFERENCES verification_sessions(id) ON DELETE CASCADE,
    
    -- Constraint for failed entries
    CONSTRAINT chk_failed_entries_have_error CHECK (success = true OR error_message IS NOT NULL)
);

-- Create indexes for audit_entries
CREATE INDEX IF NOT EXISTS idx_audit_entries_session_id ON audit_entries(session_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_timestamp ON audit_entries(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_entries_action ON audit_entries(action);
CREATE INDEX IF NOT EXISTS idx_audit_entries_component ON audit_entries(component);
CREATE INDEX IF NOT EXISTS idx_audit_entries_user_id ON audit_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_organization_id ON audit_entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_audit_entries_success ON audit_entries(success);
CREATE INDEX IF NOT EXISTS idx_audit_entries_severity ON audit_entries(severity);

-- Create composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_entries_org_timestamp ON audit_entries(organization_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entries_user_timestamp ON audit_entries(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entries_session_timestamp ON audit_entries(session_id, timestamp);

-- Create feedback_data table
CREATE TABLE IF NOT EXISTS feedback_data (
    id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
    verification_id VARCHAR(255) NOT NULL,
    user_feedback VARCHAR(50) NOT NULL CHECK (user_feedback IN ('correct', 'incorrect', 'partial')),
    corrections TEXT,
    expert_notes TEXT,
    user_id VARCHAR(255) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    issue_id VARCHAR(255),
    confidence DECIMAL(3,2) CHECK (confidence >= 0 AND confidence <= 1),
    
    -- Foreign key constraint
    CONSTRAINT fk_feedback_data_verification_id FOREIGN KEY (verification_id) REFERENCES verification_sessions(id) ON DELETE CASCADE,
    
    -- Constraint for feedback requiring corrections
    CONSTRAINT chk_feedback_corrections CHECK (
        (user_feedback = 'correct') OR
        (user_feedback = 'partial' AND corrections IS NOT NULL) OR
        (user_feedback = 'incorrect' AND (corrections IS NOT NULL OR expert_notes IS NOT NULL))
    )
);

-- Create indexes for feedback_data
CREATE INDEX IF NOT EXISTS idx_feedback_data_verification_id ON feedback_data(verification_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_user_id ON feedback_data(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_data_timestamp ON feedback_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_feedback_data_user_feedback ON feedback_data(user_feedback);
CREATE INDEX IF NOT EXISTS idx_feedback_data_issue_id ON feedback_data(issue_id);

-- Create audit retention policy table
CREATE TABLE IF NOT EXISTS audit_retention_policies (
    id SERIAL PRIMARY KEY,
    organization_id VARCHAR(255) NOT NULL,
    retention_years INTEGER NOT NULL DEFAULT 7 CHECK (retention_years > 0),
    auto_archive BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    UNIQUE(organization_id)
);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for audit_retention_policies
CREATE TRIGGER update_audit_retention_policies_updated_at 
    BEFORE UPDATE ON audit_retention_policies 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create view for audit summary statistics
CREATE OR REPLACE VIEW audit_summary_stats AS
SELECT 
    organization_id,
    DATE_TRUNC('day', timestamp) as date,
    COUNT(*) as total_entries,
    COUNT(*) FILTER (WHERE success = true) as successful_actions,
    COUNT(*) FILTER (WHERE success = false) as failed_actions,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(DISTINCT session_id) as unique_sessions,
    jsonb_object_agg(action, action_count) as action_counts,
    jsonb_object_agg(severity, severity_count) as severity_counts
FROM (
    SELECT 
        organization_id,
        timestamp,
        success,
        user_id,
        session_id,
        action,
        severity,
        COUNT(*) OVER (PARTITION BY organization_id, DATE_TRUNC('day', timestamp), action) as action_count,
        COUNT(*) OVER (PARTITION BY organization_id, DATE_TRUNC('day', timestamp), severity) as severity_count
    FROM audit_entries
    WHERE organization_id IS NOT NULL
) subq
GROUP BY organization_id, DATE_TRUNC('day', timestamp);

-- Create function for audit cleanup based on retention policy
CREATE OR REPLACE FUNCTION cleanup_old_audit_data()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER := 0;
    policy_record RECORD;
BEGIN
    FOR policy_record IN 
        SELECT organization_id, retention_years 
        FROM audit_retention_policies 
        WHERE auto_archive = true
    LOOP
        -- Delete old audit entries
        WITH deleted AS (
            DELETE FROM audit_entries 
            WHERE organization_id = policy_record.organization_id 
            AND timestamp < NOW() - INTERVAL '1 year' * policy_record.retention_years
            RETURNING 1
        )
        SELECT COUNT(*) INTO deleted_count FROM deleted;
        
        -- Delete old verification sessions (cascade will handle related data)
        DELETE FROM verification_sessions 
        WHERE organization_id = policy_record.organization_id 
        AND created_at < NOW() - INTERVAL '1 year' * policy_record.retention_years;
        
    END LOOP;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Create comments for documentation
COMMENT ON TABLE verification_sessions IS 'Tracks verification sessions with complete lifecycle information';
COMMENT ON TABLE audit_entries IS 'Comprehensive audit log for all system activities with 7-year retention';
COMMENT ON TABLE feedback_data IS 'User feedback on verification results for continuous learning';
COMMENT ON TABLE audit_retention_policies IS 'Organization-specific data retention policies';
COMMENT ON VIEW audit_summary_stats IS 'Daily aggregated audit statistics by organization';
COMMENT ON FUNCTION cleanup_old_audit_data() IS 'Automated cleanup function for expired audit data based on retention policies';