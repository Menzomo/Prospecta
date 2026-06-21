import { FollowUpList } from './FollowUpList'
import type { NextFollowup } from '../services/dashboardService'

type Props = {
  followups: NextFollowup[]
}

export function NextFollowups({ followups }: Props) {
  return <FollowUpList followups={followups} />
}
