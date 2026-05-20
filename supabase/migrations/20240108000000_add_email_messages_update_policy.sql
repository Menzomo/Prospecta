-- email_messages originally had only SELECT and INSERT policies.
-- UPDATE was blocked by RLS, preventing markInboundMessagesAsRead from working.
create policy "email_messages_update_own"
  on public.email_messages for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
