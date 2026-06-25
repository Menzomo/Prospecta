-- Pipeline de status da chamada: rastreia cada etapa do fluxo
-- chamada → gravação → transcrição → análise
-- Os resultados da IA ficam em call_analyses (desacoplado).

ALTER TABLE calls
  ADD COLUMN IF NOT EXISTS recording_status       text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS transcription_status   text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS analysis_status        text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS analysis_requested_at  timestamptz,
  ADD COLUMN IF NOT EXISTS transcription_completed_at timestamptz,
  ADD COLUMN IF NOT EXISTS analysis_completed_at      timestamptz;

ALTER TABLE calls
  ADD CONSTRAINT calls_recording_status_values
    CHECK (recording_status IN ('none', 'pending', 'available', 'transferred', 'expired')),
  ADD CONSTRAINT calls_transcription_status_values
    CHECK (transcription_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
  ADD CONSTRAINT calls_analysis_status_values
    CHECK (analysis_status IN ('none', 'pending', 'processing', 'completed', 'failed'));

-- Índice para o cron de transferência de gravações (Fase 4)
CREATE INDEX IF NOT EXISTS calls_recording_pending_idx
  ON calls(recording_status)
  WHERE recording_status = 'pending';

-- Índice para o n8n detectar chamadas prontas para análise
CREATE INDEX IF NOT EXISTS calls_analysis_pending_idx
  ON calls(analysis_status)
  WHERE analysis_status = 'pending';
