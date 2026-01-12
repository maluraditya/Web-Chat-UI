-- Enable replication for Realtime
-- This is often required for the client to receive updates via websockets

begin; 
  -- check if publication exists, if not create it (standard in supabase is supabase_realtime)
  -- We just add the tables to it.
  alter publication supabase_realtime add table conversations;
  alter publication supabase_realtime add table messages;
commit;
