import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/supabase/types'
import {
  getTotalLeads,
  getSentEmailsCount,
  getReceivedRepliesCount,
  getPendingFollowupsCount,
  getInterestedLeadsCount,
  getCallsThisMonthCount,
  getRecentReplies,
  getNextFollowups,
  getConvertedByEmailCount,
  getConvertedByPhoneCount,
  type RecentReply,
  type NextFollowup,
} from '../repositories/dashboardRepository'
import { getCurrentPeriodCredits } from '@/repositories/analysisCreditRepository'

export type { RecentReply, NextFollowup }

export type DashboardKpis = {
  totalLeads: number
  sentEmails: number
  receivedReplies: number
  pendingFollowups: number
  interestedLeads: number
  convertedByEmail: number
  convertedByPhone: number
}

export type CallsKpis = {
  callsThisMonth: number
  creditsUsed: number
  creditsTotal: number
}

export type DashboardData = {
  kpis: DashboardKpis
  callsKpis: CallsKpis
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
    callsThisMonth,
    analysisCredits,
    recentReplies,
    nextFollowups,
    convertedByEmail,
    convertedByPhone,
  ] = await Promise.all([
    getTotalLeads(supabase, userId),
    getSentEmailsCount(supabase, userId),
    getReceivedRepliesCount(supabase, userId),
    getPendingFollowupsCount(supabase, userId),
    getInterestedLeadsCount(supabase, userId),
    getCallsThisMonthCount(supabase, userId),
    getCurrentPeriodCredits(supabase, userId),
    getRecentReplies(supabase, userId),
    getNextFollowups(supabase, userId),
    getConvertedByEmailCount(supabase, userId),
    getConvertedByPhoneCount(supabase, userId),
  ])

  return {
    kpis: { totalLeads, sentEmails, receivedReplies, pendingFollowups, interestedLeads, convertedByEmail, convertedByPhone },
    callsKpis: {
      callsThisMonth,
      creditsUsed: analysisCredits?.credits_used ?? 0,
      creditsTotal: analysisCredits?.credits_total ?? 0,
    },
    recentReplies,
    nextFollowups,
  }
}
