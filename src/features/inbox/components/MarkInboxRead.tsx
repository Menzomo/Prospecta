'use client'

import { useEffect } from 'react'
import { markLeadInboxReadAction } from '../actions'

type Props = {
  leadId?: string | null
  userLeadId?: string | null
}

export function MarkInboxRead({ leadId, userLeadId }: Props) {
  useEffect(() => {
    markLeadInboxReadAction(leadId ?? null, userLeadId ?? null)
  }, [leadId, userLeadId])

  return null
}
