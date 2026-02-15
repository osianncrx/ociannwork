export const isChatMuted = (
  mutedChats: Record<string, { muted_until: string | null; duration: string }>,
  chatId: string | number,
  chatType: string,
): boolean => {
  const chatKey = `${chatType}_${chatId}`
  const muteInfo = mutedChats[chatKey]

  if (!muteInfo || !muteInfo.muted_until) {
    return false
  }

  const now = new Date()
  const mutedUntil = new Date(muteInfo.muted_until)

  return mutedUntil > now
}

export const getMuteDurationText = (duration: string): string => {
  const durationMap: Record<string, string> = {
    '1h': '1 hour',
    '8h': '8 hours',
    '1w': '1 week',
    forever: 'Forever',
  }

  return durationMap[duration] || duration
}

export const getRemainingMuteTime = (mutedUntil: string): string => {
  const now = new Date()
  const mutedUntilDate = new Date(mutedUntil)
  const diffMs = mutedUntilDate.getTime() - now.getTime()

  if (diffMs <= 0) return 'Expired'

  const diffMinutes = Math.floor(diffMs / (1000 * 60))
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffDays > 0) {
    return `${diffDays}d`
  } else if (diffHours > 0) {
    return `${diffHours}h`
  } else {
    return `${diffMinutes}m`
  }
}
