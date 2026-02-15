import { Params } from '../api'

export type PlanStatus = 'active' | 'inactive'
export type BillingCycle = 'monthly' | 'yearly' | 'both'

export interface PlanFeatures {
  [key: string]: string | number | boolean | null
}

export interface Plan {
  id: number
  name: string
  slug: string
  description?: string | null
  status: PlanStatus
  price_per_user_per_month: number
  price_per_user_per_year: number | null
  billing_cycle: BillingCycle
  max_members: number
  max_storage_per_user_mb?: number
  max_storage_mb?: number | null
  max_message_search_limit: number
  max_channels: number
  allows_private_channels: boolean
  allows_file_sharing: boolean
  allows_video_calls: boolean
  allows_team_analytics: boolean
  allows_multiple_delete?: boolean
  features: PlanFeatures
  display_order: number
  is_default: boolean
  trial_period_days: number
  created_at?: string
  updated_at?: string
}

export interface PlanListResponse {
  message: string
  data: {
    plans: Plan[]
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface PlanResponse {
  message: string
  data: Plan
}

export type BillingCycleChoice = 'monthly' | 'yearly'

export interface SubscriptionQuotePayload {
  plan_id: number
  member_count: number
  billing_cycle: BillingCycleChoice
}

export interface SubscriptionQuote {
  plan_name: string
  member_count: number
  price_per_user: string
  billing_cycle: BillingCycleChoice
  total_amount: string
  subscription_date: string
  expiry_date: string
}

export interface SubscriptionQuoteResponse {
  message: string
  data: SubscriptionQuote
}

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled'

export interface TeamSubscription {
  id: number
  team_id: number
  plan_id: number
  member_count: number
  amount_paid: number
  billing_cycle: BillingCycleChoice
  subscription_date: string
  expiry_date: string
  status: SubscriptionStatus
  payment_source: string
  wallet_transaction_id?: number | null
  created_at?: string
  updated_at?: string
  plan?: Plan
}

export interface SubscribePayload extends SubscriptionQuotePayload {}

export interface SubscribeResponse {
  message: string
  data: {
    subscription: TeamSubscription
    wallet_balance: number
    amount_deducted: number
  }
}

export interface CurrentSubscriptionResponse {
  message: string
  data: {
    subscription: TeamSubscription
    days_remaining: number
    is_active: boolean
  }
}

export interface SubscriptionHistoryParams extends Params {
  page?: number
  limit?: number
  status?: SubscriptionStatus
}

export interface SubscriptionHistoryResponse {
  message: string
  subscriptions: TeamSubscription[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CancelSubscriptionResponse {
  message: string
  data: TeamSubscription
}

export interface PlanChangePayload {
  new_plan_id: number
  new_member_count: number
}

export interface PlanChangePreviewResponse {
  message: string
  data: {
    current_plan: {
      name: string
      member_count: number
      billing_cycle: BillingCycleChoice
      expiry_date: string
    }
    new_plan: {
      name: string
      member_count: number
      price_per_user: string
      billing_cycle: BillingCycleChoice
    }
    proration: {
      days_remaining: number
      unused_amount: number
      new_period_cost: number
      charge_or_refund: number
      type: 'charge' | 'refund'
    }
    wallet: {
      current_balance: string
      balance_after_change: string
      sufficient_balance: boolean
    }
    change_type: 'upgrade' | 'downgrade' | 'increase_seats' | 'decrease_seats'
  }
}

export interface PlanChangeResponse {
  message: string
  data: {
    change_type: 'upgrade' | 'downgrade' | 'increase_seats' | 'decrease_seats'
    subscription: TeamSubscription
    proration: {
      days_remaining: number
      amount_charged: number
      amount_refunded: number
    }
    wallet_balance: string
    previous_subscription_id: number
  }
}

export interface PlanCardProps {
  plan: Plan
  currentSubscription?: TeamSubscription | null
  onSubscribe: (plan: Plan) => void
  onChangePlan?: (plan: Plan) => void
  selectedBillingCycle?: BillingCycleChoice
}

export interface PlanChangeModalProps {
  isOpen: boolean
  onClose: () => void
  plan: Plan | null
  currentSubscription: TeamSubscription | null
  onSuccess: () => void
}
 