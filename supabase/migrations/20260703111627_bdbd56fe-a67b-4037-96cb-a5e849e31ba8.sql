DROP POLICY IF EXISTS "Authenticated can insert join requests" ON public.group_join_requests;
CREATE POLICY "Authenticated can insert join requests"
ON public.group_join_requests
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id AND status = 'pending');