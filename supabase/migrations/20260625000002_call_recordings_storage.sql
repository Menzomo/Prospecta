-- Bucket privado para gravações de chamadas
-- Cron (service role) faz upload; usuários acessam via URL assinada gerada no servidor.

INSERT INTO storage.buckets (id, name, public)
VALUES ('call-recordings', 'call-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Usuários autenticados podem ler apenas suas próprias gravações.
-- O caminho é {user_id}/{call_id}.mp3, então o primeiro segmento é o user_id.
CREATE POLICY "Usuários leem próprias gravações"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'call-recordings'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
