-- O webhook de status (recording callback) só olha pro CallStatus genérico
-- (sempre "completed" quando a sessão termina normalmente, não diz se o
-- *lead* atendeu) e por isso toda chamada que recebe esse callback é cobrada
-- igual, mesmo caixa postal/toque breve sem conversa real. O callback do
-- <Dial action=...> (POST /api/calls/twiml/completed) já recebe o campo
-- certo pra isso — DialCallStatus (completed/no-answer/busy/failed/canceled)
-- — mas até agora só era logado no console e descartado.
--
-- dial_call_status guarda esse valor pra callService.ts só cobrar quando
-- for realmente 'completed' (dial conectou de verdade) — no-answer/busy/
-- failed/canceled nunca geram cobrança. Também permite fechar o registro da
-- chamada (status + ended_at) imediatamente pra casos de não-atendimento,
-- em vez de ficar travado em 'initiated' pra sempre (não recebe o callback
-- de gravação, que só dispara se a chamada foi atendida).

ALTER TABLE calls ADD COLUMN dial_call_status text;
