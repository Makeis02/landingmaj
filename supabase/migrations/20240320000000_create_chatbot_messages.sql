-- Create chatbot_messages table
create table if not exists public.chatbot_messages (
    id uuid default gen_random_uuid() primary key,
    email text not null,
    message text not null,
    sender text not null check (sender in ('user', 'admin')),
    timestamp timestamptz default now(),
    read boolean default false
);

-- Add RLS policies
alter table public.chatbot_messages enable row level security;

-- Allow anyone to insert messages
create policy "Allow anyone to insert messages"
    on public.chatbot_messages
    for insert
    to public
    with check (true);

-- Allow authenticated users to read messages
create policy "Allow authenticated users to read messages"
    on public.chatbot_messages
    for select
    to authenticated
    using (true);

-- Allow authenticated users to update messages
create policy "Allow authenticated users to update messages"
    on public.chatbot_messages
    for update
    to authenticated
    using (true)
    with check (true);

-- Allow authenticated users to delete messages
create policy "Allow authenticated users to delete messages"
    on public.chatbot_messages
    for delete
    to authenticated
    using (true);

-- Create index for faster queries
create index if not exists chatbot_messages_email_idx on public.chatbot_messages(email);
create index if not exists chatbot_messages_timestamp_idx on public.chatbot_messages(timestamp);

-- Create admin_chat_opened table
create table if not exists public.admin_chat_opened (
    id uuid default gen_random_uuid() primary key,
    user_email text not null,
    admin_email text not null,
    opened_at timestamptz default now()
);

-- Add RLS policies for admin_chat_opened
alter table public.admin_chat_opened enable row level security;

-- Allow anyone to insert records
create policy "Allow anyone to insert chat sessions"
    on public.admin_chat_opened
    for insert
    to public
    with check (true);

-- Allow anyone to read records
create policy "Allow anyone to read chat sessions"
    on public.admin_chat_opened
    for select
    to public
    using (true);

-- Allow anyone to delete records
create policy "Allow anyone to delete chat sessions"
    on public.admin_chat_opened
    for delete
    to public
    using (true);

-- Create index for faster queries
create index if not exists admin_chat_opened_user_email_idx on public.admin_chat_opened(user_email);
create index if not exists admin_chat_opened_admin_email_idx on public.admin_chat_opened(admin_email); 