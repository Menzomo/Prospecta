import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  getTotalLeads,
  getSentEmailsCount,
  getReceivedRepliesCount,
  getPendingFollowupsCount,
  getInterestedLeadsCount,
  getRecentReplies,
  getNextFollowups,
  type RecentReply,
  type NextFollowup,
} from '../repositories/dashboardRepository'

export type { RecentReply, NextFollowup }

export type DashboardKpis = {
  totalLeads: number
  sentEmails: number
  receivedReplies: number
  pendingFollowups: number
  interestedLeads: number
}

export type DashboardData = {
  kpis: DashboardKpis
  recentReplies: RecentReply[]
  nextFollowups: NextFollowup[]
}

export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<DashboardData> {
  const [
    totalLeads,
    sentEmails,
    receivedReplies,
    pendingFollowups,
    interestedLeads,
    recentReplies,
    nextFollowups,
  ] = await Promise.all([
    getTotalLeads(supabase, userId),
    getSentEmailsCount(supabase, userId),
    getReceivedRepliesCount(supabase, userId),
    getPendingFollowupsCount(supabase, userId),
    getInterestedLeadsCount(supabase, userId),
    getRecentReplies(supabase, userId),
    getNextFollowups(supabase, userId),
  ])

  return {
    kpis: { totalLeads, sentEmails, receivedReplies, pendingFollowups, interestedLeads },
    recentReplies,
    nextFollowups,
  }
}
