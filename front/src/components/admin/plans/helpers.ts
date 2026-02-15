import { Plan } from '../../../types'

const formatLabel = (value: string): string =>
  value
    .replace(/[_-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase())

export const resolveCurrencyCode = (plan: Plan | undefined): string => {
  if (!plan?.features) {
    return 'USD'
  }

  const possibleKeys = ['currency_code', 'currencyCode', 'currency']
  for (const key of possibleKeys) {
    const raw = plan.features[key]
    if (typeof raw === 'string' && raw.trim()) {
      return raw.trim().toUpperCase()
    }
  }

  return 'USD'
}

export const formatPlanPrice = (amount: number, currency: string): string => {
  const fallback = `${currency} ${Number(amount ?? 0).toFixed(2)}`

  if (Number.isNaN(amount)) {
    return fallback
  }

  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(Number(amount ?? 0))
  } catch (error) {
    return fallback
  }
}

export const getYearlyPrice = (plan: Plan | undefined): number => {
  if (!plan) return 0
  if (plan.price_per_user_per_year != null && Number(plan.price_per_user_per_year) > 0) {
    return Number(plan.price_per_user_per_year)
  }
  const monthly = Number(plan.price_per_user_per_month ?? 0)
  if (!monthly) return 0
  return Number((monthly * 12 * 0.8).toFixed(2))
}

export const getAvailableBillingCycles = (plan: Plan | undefined): Array<'monthly' | 'yearly'> => {
  if (!plan) return ['monthly']
  const cycle = (plan.billing_cycle || 'monthly').toLowerCase()
  if (cycle === 'both') {
    return ['monthly', 'yearly']
  }
  if (cycle === 'yearly') {
    return ['yearly']
  }
  return ['monthly']
}

export const buildPlanFeatures = (plan: Plan | undefined): string[] => {
  if (!plan) return []

  const features = new Set<string>()

  // Member and team limits
  if (plan.max_members) {
    features.add(`${plan.max_members.toLocaleString()} member limit`)
  }
  if (plan.max_channels) {
    features.add(`${plan.max_channels.toLocaleString()} channels`)
  }

  // Storage limits
  // Check for max_storage_mb (per team storage)
  if (plan.max_storage_mb !== undefined) {
    if (plan.max_storage_mb === null) {
      features.add('Unlimited team storage')
    } else {
      const storageGB = (plan.max_storage_mb / 1024).toFixed(2)
      features.add(`${storageGB}GB team storage`)
    }
  }
  if (plan.max_storage_per_user_mb) {
    features.add(`${plan.max_storage_per_user_mb.toLocaleString()}MB storage per member`)
  }

  // Message limits
  if (plan.max_message_search_limit) {
    features.add(`${plan.max_message_search_limit.toLocaleString()} searchable messages`)
  }

  // Trial period
  if (plan.trial_period_days) {
    features.add(`${plan.trial_period_days}-day trial`)
  }

  // Feature flags
  if (plan.allows_private_channels) {
    features.add('Private channels')
  }
  if (plan.allows_file_sharing) {
    features.add('File sharing')
  }
  if (plan.allows_video_calls) {
    features.add('Video calls')
  }
  if (plan.allows_team_analytics) {
    features.add('Team analytics')
  }

  if (plan.allows_multiple_delete) {
    features.add('Bulk delete')
  }

  // Additional features from the features JSON field
  if (plan.features && typeof plan.features === 'object') {
    Object.entries(plan.features).forEach(([key, value]) => {
      // Skip currency-related fields as they're not features
      if (['currency_code', 'currencyCode', 'currency'].includes(key.toLowerCase())) {
        return
      }

      if (value === null || value === undefined) {
        return
      }

      if (typeof value === 'boolean') {
        if (value) {
          features.add(formatLabel(key))
        }
        return
      }

      if (typeof value === 'number' || typeof value === 'string') {
        const label = formatLabel(key)
        const normalizedValue = typeof value === 'number' ? value.toLocaleString() : value
        features.add(`${label}: ${normalizedValue}`)
      }
    })
  }

  return Array.from(features)
}

export interface FeatureStatus {
  label: string
  available: boolean
  value?: string | number
}

export const getAllPlanFeatures = (plan: Plan | undefined): FeatureStatus[] => {
  if (!plan) return []

  const features: FeatureStatus[] = []

  // Member and team limits
  features.push({
    label: 'Channels',
    available: !!plan.max_channels,
    value: plan.max_channels ? `${plan.max_channels.toLocaleString()} channels` : undefined,
  })

  // Storage limits
  if (plan.max_storage_mb !== undefined) {
    features.push({
      label: 'Team storage',
      available: true,
      value: plan.max_storage_mb === null ? 'Unlimited' : `${(plan.max_storage_mb / 1024).toFixed(2)}GB`,
    })
  } else {
    features.push({
      label: 'Team storage',
      available: false,
    })
  }

  // Message limits
  features.push({
    label: 'Searchable messages',
    available: !!plan.max_message_search_limit,
    value: plan.max_message_search_limit ? `${plan.max_message_search_limit.toLocaleString()} messages` : undefined,
  })

  // Feature flags
  features.push({
    label: 'Private channels',
    available: !!plan.allows_private_channels,
  })

  features.push({
    label: 'File sharing',
    available: !!plan.allows_file_sharing,
  })

  features.push({
    label: 'Video calls',
    available: !!plan.allows_video_calls,
  })

  features.push({
    label: 'Bulk delete',
    available: !!plan.allows_multiple_delete,
  })

  // Additional features from the features JSON field
  if (plan.features && typeof plan.features === 'object') {
    Object.entries(plan.features).forEach(([key, value]) => {
      // Skip currency-related fields as they're not features
      if (['currency_code', 'currencyCode', 'currency'].includes(key.toLowerCase())) {
        return
      }

      if (value === null || value === undefined) {
        return
      }

      const label = formatLabel(key)
      const isAvailable = typeof value === 'boolean' ? value : true
      const featureValue =
        typeof value === 'number' ? value.toLocaleString() : typeof value === 'string' ? value : undefined

      // Check if feature already exists
      const existingIndex = features.findIndex((f) => f.label.toLowerCase() === label.toLowerCase())
      if (existingIndex === -1) {
        features.push({
          label,
          available: isAvailable,
          value: featureValue,
        })
      }
    })
  }

  return features
}
