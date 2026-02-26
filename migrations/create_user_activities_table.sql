-- Migration: Create user_activities table for audit logging
-- This table stores all user activities in the platform for audit purposes

-- Create user_activities table
CREATE TABLE IF NOT EXISTS user_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  activity_type TEXT NOT NULL,
  activity_description TEXT NOT NULL,
  entity_type TEXT, -- 'project', 'indicator', 'user', 'system'
  entity_id UUID, -- ID da entidade afetada
  entity_name TEXT, -- Nome da entidade para facilitar visualização
  metadata JSONB DEFAULT '{}', -- Dados adicionais (ex: campos alterados)
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_activities_user_id ON user_activities(user_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_activity_type ON user_activities(activity_type);
CREATE INDEX IF NOT EXISTS idx_user_activities_created_at ON user_activities(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_activities_entity ON user_activities(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_user_activities_user_email ON user_activities(user_email);

-- Enable RLS
ALTER TABLE user_activities ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Only authorized users (by email) can view activities
-- This will be configured with specific emails in the policy
CREATE POLICY "Authorized users can view activities" ON user_activities
  FOR SELECT USING (
    -- Check if current user's email is in the authorized list
    EXISTS (
      SELECT 1 FROM auth.users 
      WHERE id = auth.uid() 
      AND email IN (
        'admin@example.com', -- Replace with actual authorized email 1
        'auditor@example.com' -- Replace with actual authorized email 2
      )
    )
    OR
    -- Allow users to see their own activities
    user_id = auth.uid()
  );

-- RLS Policy: System can insert activities (via service layer)
-- Note: This allows the service layer to insert, but we'll restrict via application logic
CREATE POLICY "Service can insert activities" ON user_activities
  FOR INSERT WITH CHECK (true);

-- Function to check if user is authorized to view audit logs
CREATE OR REPLACE FUNCTION is_audit_authorized(p_user_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_user_email IN (
    -- Replace with actual authorized emails
    'admin@example.com', -- Replace with actual authorized email 1
    'auditor@example.com' -- Replace with actual authorized email 2
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add comment to table
COMMENT ON TABLE user_activities IS 'Audit log table for tracking user activities in the platform';
COMMENT ON COLUMN user_activities.activity_type IS 'Type of activity: LOGIN, LOGOUT, PROJECT_CREATE, PROJECT_UPDATE, PROJECT_DELETE, INDICATOR_CREATE, INDICATOR_UPDATE, INDICATOR_DELETE';
COMMENT ON COLUMN user_activities.entity_type IS 'Type of entity affected: project, indicator, user, system';
COMMENT ON COLUMN user_activities.metadata IS 'Additional data about the activity in JSON format';
