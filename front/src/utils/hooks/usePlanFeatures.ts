import { useMemo } from 'react'
import { useAppSelector } from '../../store/hooks'
import { Plan } from '../../types'

type NumericValue = number | null

const coerceNumber = (value: unknown): NumericValue => {
  if (typeof value === 'number' && !Number.isNaN(value)) return value
  const parsed = Number(value)
  return Number.isNaN(parsed) ? null : parsed
}

export const usePlanFeatures = () => {
  const { subscription, isActive, daysRemaining } = useAppSelector((state) => state.subscription)
  const plan = subscription?.plan as Plan | undefined

  const featureFlags = useMemo(() => plan?.features ?? {}, [plan?.features])
  const hasActiveSubscription = Boolean(plan && isActive)

  const isFeatureEnabled = (featureKey: keyof Plan | string, fallback = true): boolean => {
    if (!plan) return fallback

    const directValue = (plan as any)[featureKey]
    if (typeof directValue === 'boolean') {
      return directValue
    }

    if (directValue !== undefined && directValue !== null) {
      return true
    }

    const featureValue = (featureFlags as Record<string, unknown>)[featureKey]
    if (typeof featureValue === 'boolean') {
      return featureValue
    }

    return featureValue !== null && featureValue !== undefined ? true : fallback
  }

  const getNumericLimit = (key: keyof Plan | string): NumericValue => {
    const directValue = (plan as any)[key]
    const directNumber = coerceNumber(directValue)
    if (directNumber !== null) return directNumber

    const featureValue = (featureFlags as Record<string, unknown>)[key]
    const featureNumber = coerceNumber(featureValue)
    return featureNumber
  }

  const withinLimit = (key: keyof Plan | string, currentValue: number): boolean => {
    const limit = getNumericLimit(key)
    if (limit === null) return true
    return currentValue < limit
  }

  // Helper methods for specific plan limits
  const canCreateChannel = (currentChannelCount: number): boolean => {
    return withinLimit('max_channels', currentChannelCount)
  }

  const canAddChannelMember = (currentMemberCount: number): boolean => {
    return withinLimit('max_members', currentMemberCount)
  }

  const canSearchMessages = (currentSearchLimit: number): boolean => {
    const limit = getNumericLimit('max_message_search_limit')
    if (limit === null) return true
    return currentSearchLimit <= limit
  }

  const getMaxChannels = (): NumericValue => {
    return getNumericLimit('max_channels')
  }

  const getMaxChannelMembers = (): NumericValue => {
    return getNumericLimit('max_members')
  }

  const getMaxMessageSearchLimit = (): NumericValue => {
    return getNumericLimit('max_message_search_limit')
  }

  // Commonly-used derived feature flags
  const allowsFileSharing = (): boolean => {
    if (!hasActiveSubscription) return false
    return isFeatureEnabled('allows_file_sharing', false)
  }

  const allowsVideoCalls = (): boolean => {
    if (!hasActiveSubscription) return false
    return isFeatureEnabled('allows_video_calls', false)
  }

  const allowsMultipleDelete = (): boolean => {
    return isFeatureEnabled('allows_multiple_delete', false)
  }

  return {
    subscription,
    plan,
    isActive,
    hasActiveSubscription,
    daysRemaining,
    isFeatureEnabled,
    getNumericLimit,
    withinLimit,
    canCreateChannel,
    canAddChannelMember,
    canSearchMessages,
    getMaxChannels,
    getMaxChannelMembers,
    getMaxMessageSearchLimit,
    allowsFileSharing,
    allowsVideoCalls,
    allowsMultipleDelete,
  }
}

export default usePlanFeatures
