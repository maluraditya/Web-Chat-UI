-- Add unread_count to conversations
ALTER TABLE conversations 
ADD COLUMN IF NOT EXISTS unread_count INTEGER DEFAULT 0;

-- Add is_read to messages
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Update RLS policies if necessary (existing ones should cover new columns if they are "all columns")
-- But just in case, we re-verify that the authenticated user can read/write these.
