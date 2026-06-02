import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAttachmentById, deleteAttachment } from '@/repositories/templateAttachmentRepository'

type RouteParams = { params: Promise<{ id: string; attachmentId: string }> }

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { attachmentId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const attachment = await getAttachmentById(supabase, attachmentId)
  if (!attachment || attachment.user_id !== user.id) {
    return NextResponse.json({ error: 'Anexo não encontrado' }, { status: 404 })
  }

  await supabase.storage.from('template-attachments').remove([attachment.file_path])

  const deleted = await deleteAttachment(supabase, attachmentId)
  if (!deleted) {
    return NextResponse.json({ error: 'Falha ao remover anexo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
