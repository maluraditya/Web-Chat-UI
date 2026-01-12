-- Drop existing policies
drop policy if exists "Enable read access for authenticated users" on conversations;
drop policy if exists "Enable insert access for authenticated users" on conversations;
drop policy if exists "Enable update access for authenticated users" on conversations;

drop policy if exists "Enable read access for authenticated users" on messages;
drop policy if exists "Enable insert access for authenticated users" on messages;

-- Create permissive policies for testing (allow anon/public access)
create policy "Allow all access for conversations" on conversations
  for all using (true) with check (true);

create policy "Allow all access for messages" on messages
  for all using (true) with check (true);
