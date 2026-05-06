-- Migration 0063: Friends & Friend Requests
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(sender_id, receiver_id)
);

ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend requests"
    ON public.friend_requests FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create friend requests"
    ON public.friend_requests FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can accept or reject requests sent to them"
    ON public.friend_requests FOR UPDATE
    USING (auth.uid() = receiver_id);

-- trigger update_at
CREATE TRIGGER handle_updated_at_friend_requests
BEFORE UPDATE ON public.friend_requests
FOR EACH ROW
EXECUTE FUNCTION moddatetime(updated_at);
