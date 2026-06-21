'use server'

import { checkAndSendBetaNotification } from '@/services/betaNotificationService'

export async function notifyBetaAction(userId: string): Promise<void> {
  await checkAndSendBetaNotification(userId)
}
