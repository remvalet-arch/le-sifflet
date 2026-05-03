-- 0047 : Realtime fiable sur alert_signals (filtres RLS sur colonnes non-PK)
-- Nécessite REPLICA IDENTITY FULL pour que les clients passifs reçoivent les payloads.

ALTER TABLE public.alert_signals REPLICA IDENTITY FULL;
