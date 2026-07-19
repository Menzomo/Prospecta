import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getTemplateById } from '@/repositories/templateRepository'
import { createAttachment, countAttachmentsByTemplate } from '@/repositories/templateAttachmentRepository'
import { hasActiveSubscription } from '@/repositories/profileRepository'

const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'text/plain': 'txt',
}

const MAX_SIZE = 10 * 1024 * 1024 // 10 MB
const MAX_PER_TEMPLATE = 5

type RouteParams = { params: Promise<{ id: string }> }

export async function POST(request: Request, { params }: RouteParams) {
  const { id: templateId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  if (!(await hasActiveSubscription(supabase, user.id))) {
    return NextResponse.json(
      { error: 'Assinatura necessária para gerenciar anexos.', code: 'assinatura_necessaria' },
      { status: 402 }
    )
  }

  const template = await getTemplateById(supabase, templateId)
  if (!template || template.user_id !== user.id) {
    return NextResponse.json({ error: 'Template não encontrado' }, { status: 404 })
  }

  const count = await countAttachmentsByTemplate(supabase, templateId)
  if (count >= MAX_PER_TEMPLATE) {
    return NextResponse.json({ error: `Limite de ${MAX_PER_TEMPLATE} anexos por template atingido` }, { status: 400 })
  }

  let formData: FormData
  try { formData = await request.formData() }
  catch { return NextResponse.json({ error: 'Erro ao ler arquivo' }, { status: 400 }) }

  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json({ error: 'Arquivo excede 10MB' }, { status: 400 })
  }

  const mimeType = file.type
  if (!ALLOWED_TYPES[mimeType]) {
    return NextResponse.json({ error: 'Tipo de arquivo não permitido' }, { status: 400 })
  }

  const ext = ALLOWED_TYPES[mimeType]
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
  const storagePath = `${user.id}/${templateId}/${Date.now()}_${safeName}`

  const fileBuffer = await file.arrayBuffer()
  const { error: uploadError } = await supabase.storage
    .from('template-attachments')
    .upload(storagePath, fileBuffer, { contentType: mimeType, upsert: false })

  if (uploadError) {
    console.error('[attachments upload]', uploadError.message)
    return NextResponse.json({ error: 'Falha ao salvar arquivo' }, { status: 500 })
  }

  const attachment = await createAttachment(supabase, {
    user_id: user.id,
    template_id: templateId,
    file_name: file.name,
    file_path: storagePath,
    file_type: ext,
    file_size: file.size,
  })

  if (!attachment) {
    await supabase.storage.from('template-attachments').remove([storagePath])
    return NextResponse.json({ error: 'Falha ao salvar registro do anexo' }, { status: 500 })
  }

  return NextResponse.json({ attachment }, { status: 201 })
}
