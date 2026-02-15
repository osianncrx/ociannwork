import { NavigateFunction } from 'react-router-dom'

export interface PlanFormValues {
  name: string
  slug: string
  description: string
  price_per_user_per_month: number | string
  price_per_user_per_year: number | string
  billing_cycle: 'monthly' | 'yearly' | 'both'
  max_channels: number | string
  max_storage_mb: number | string | null
  max_message_search_limit: number | string
  allows_private_channels: boolean
  allows_file_sharing: boolean
  allows_video_calls: boolean
  allows_multiple_delete: boolean
  display_order: number | string
  is_default: boolean
  statusSwitch: boolean
}

export type PlanSubmitHandler = (
  values: PlanFormValues,
  isEdit: boolean,
  id: string | undefined,
  navigate: NavigateFunction,
  setSubmitting: (isSubmitting: boolean) => void,
) => void
