-- Run this in Supabase SQL Editor after creating the two Auth users.
-- It replaces the current memory policies with policies that restrict access
-- to Caleb and Cassie and prevent either account from impersonating the other.

alter table public.memories enable row level security;

-- Remove the earlier policies from the setup walkthrough.
drop policy if exists "Authenticated users can read memories" on public.memories;
drop policy if exists "Authenticated users can add memories" on public.memories;
drop policy if exists "Authenticated users can update memories" on public.memories;
drop policy if exists "Authenticated users can delete memories" on public.memories;
drop policy if exists "Only our two accounts can read memories" on public.memories;
drop policy if exists "Only our two accounts can add memories" on public.memories;
drop policy if exists "Only our two accounts can update memories" on public.memories;
drop policy if exists "Only our two accounts can delete memories" on public.memories;

create policy "Couple can read memories"
on public.memories for select to authenticated
using (auth.uid() in (
  '3b76df6d-cf06-4344-b636-7270cbf43b89'::uuid,
  'e03dee0d-9e3c-47e9-a415-4209e3a53212'::uuid
));

create policy "Each partner can add their own memories"
on public.memories for insert to authenticated
with check (
  (auth.uid() = '3b76df6d-cf06-4344-b636-7270cbf43b89'::uuid and author = 'caleb')
  or
  (auth.uid() = 'e03dee0d-9e3c-47e9-a415-4209e3a53212'::uuid and author = 'cassie')
);

create policy "Each partner can update their own memories"
on public.memories for update to authenticated
using (
  (auth.uid() = '3b76df6d-cf06-4344-b636-7270cbf43b89'::uuid and author = 'caleb')
  or
  (auth.uid() = 'e03dee0d-9e3c-47e9-a415-4209e3a53212'::uuid and author = 'cassie')
)
with check (
  (auth.uid() = '3b76df6d-cf06-4344-b636-7270cbf43b89'::uuid and author = 'caleb')
  or
  (auth.uid() = 'e03dee0d-9e3c-47e9-a415-4209e3a53212'::uuid and author = 'cassie')
);

create policy "Each partner can delete their own memories"
on public.memories for delete to authenticated
using (
  (auth.uid() = '3b76df6d-cf06-4344-b636-7270cbf43b89'::uuid and author = 'caleb')
  or
  (auth.uid() = 'e03dee0d-9e3c-47e9-a415-4209e3a53212'::uuid and author = 'cassie')
);
