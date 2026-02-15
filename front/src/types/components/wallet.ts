import { Params } from '../api'

export type WalletStatus = 'active' | 'suspended' | 'closed'
export type WalletTransactionType = 'credit' | 'debit'
export type WalletReferenceType = 'payment' | 'subscription' | 'refund' | 'adjustment'
export type WalletTransactionStatus = 'pending' | 'completed' | 'failed' | 'reversed'

export interface WalletTeam {
  id: number
  name: string
}

export interface Wallet {
  id: number
  team_id: number
  balance: number
  currency: string
  status: WalletStatus
  created_at?: string
  updated_at?: string
  team?: WalletTeam
}

export interface WalletResponse {
  message: string
  data: Wallet
}

export interface WalletBalanceResponse {
  message: string
  data: {
    balance: number
    currency: string
    status: WalletStatus
  }
}

export interface WalletTransaction {
  id: number
  wallet_id: number
  transaction_type: WalletTransactionType
  amount: number
  balance_before: number
  balance_after: number
  description?: string
  reference_type: WalletReferenceType
  reference_id?: number
  payment_gateway?: string
  gateway_transaction_id?: string
  status: WalletTransactionStatus
  created_at: string
}

export interface WalletTransactionsResponse {
  message: string
  transactions: WalletTransaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface WalletTransactionParams extends Params {
  page?: number
  limit?: number
  transaction_type?: WalletTransactionType | ''
  reference_type?: WalletReferenceType | ''
  start_date?: string
  end_date?: string
}

// Payment types
export type PaymentGateway = 'stripe' | 'paypal' | 'razorpay'
export type PaymentStatus = 'pending' | 'completed' | 'failed'

export interface InitiatePaymentPayload {
  amount: number
  payment_gateway: PaymentGateway
  payment_method?: string
  currency?: string
}

export interface InitiatePaymentResponse {
  success: boolean
  message: string
  data: {
    payment_id: number
    amount: number
    currency: string
    payment_gateway: PaymentGateway
    client_secret?: string
    publishable_key?: string
    order_id?: string
    approval_url?: string
    key_id?: string
    gateway_order_id: string
  }
}

export interface VerifyPaymentPayload {
  payment_id: number
  gateway_payment_id?: string
  gateway_response?: Record<string, any>
  payment_gateway?: PaymentGateway
}

export interface VerifyPaymentResponse {
  success: boolean
  message: string
  data: {
    payment: {
      id: number
      amount: number
      currency: string
      status: PaymentStatus
      payment_gateway: PaymentGateway
    }
    wallet_balance: number
    transaction: WalletTransaction
  }
}

export interface AddFundsModalProps {
  isOpen: boolean
  onClose: () => void
  amountInput: string
  setAmountInput: (value: string) => void
  currency: string
  currencyFormatter: Intl.NumberFormat
  selectedGateway: 'stripe' | 'paypal' | 'razorpay'
  setSelectedGateway: (gateway: 'stripe' | 'paypal' | 'razorpay') => void
  initiatePaymentAsync: any
  verifyPaymentAsync: any
  stripePromise: Promise<any> | null
  setStripePromise: (promise: Promise<any> | null) => void
  stripeOptions: any
  setStripeOptions: (options: any) => void
  clientSecret: string | undefined
  setClientSecret: (secret: string | undefined) => void
  activePaymentId: number | null
  setActivePaymentId: (id: number | null) => void
  initiatedAmount: number | null
  setInitiatedAmount: (amount: number | null) => void
  onSuccess: () => void
}

export interface WalletOverviewCardProps {
  isLoading: boolean
  summary: any
  balance: string
  currency: string
  onAddFunds: () => void
  onRefresh: () => void
}

export interface WalletTransactionsTableProps {
  query: any
  pagination: any
  currencyFormatter: Intl.NumberFormat
}

export interface TransactionFiltersProps {
  filters: any
  setFilters: (filters: any) => void
}

export interface StripePaymentFormProps {
  amountLabel: string
  currency: string
  onBack: () => void
  onPaymentSuccess: (paymentIntent: any) => Promise<void>
}

