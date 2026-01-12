-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create conversations table
create table conversations (
  id uuid primary key default uuid_generate_v4(),
  phone text not null unique,
  name text,
  status text not null default 'bot' check (status in ('bot', 'human', 'closed')),
  last_message text,
  updated_at timestamp with time zone default now()
);

-- Create messages table
create table messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid references conversations(id) on delete cascade not null,
  sender text not null check (sender in ('user', 'bot', 'human')),
  message text not null,
  created_at timestamp with time zone default now()
);

-- Enable Row Level Security (RLS)
alter table conversations enable row level security;
alter table messages enable row level security;

-- Create policies (Allow all for simplicity in this MVP, but in production restrict more)
-- For conversations
create policy "Enable read access for authenticated users" on conversations
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on conversations
  for insert with check (auth.role() = 'authenticated');

create policy "Enable update access for authenticated users" on conversations
  for update using (auth.role() = 'authenticated');

-- For messages
create policy "Enable read access for authenticated users" on messages
  for select using (auth.role() = 'authenticated');

create policy "Enable insert access for authenticated users" on messages
  for insert with check (auth.role() = 'authenticated');

-- Create function to update updated_at on conversations
create or replace function update_updated_at_column()
returns trigger as $$
begin
    new.updated_at = now();
    return new;
end;
$$ language 'plpgsql';

create trigger update_conversations_updated_at
before update on conversations
for each row
execute procedure update_updated_at_column();
