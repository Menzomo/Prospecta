'use client'

import { useEffect } from 'react'
import { markLeadInboxReadAction } from '../actions'

type Props = {
  leadId: string
}

export function MarkInboxRead({ leadId }: Props) {
  useEffect(() => {
    markLeadInboxReadAction(leadId)
  }, [leadId])

  return null
}
