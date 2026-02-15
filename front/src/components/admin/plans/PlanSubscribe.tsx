import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Alert, Badge, ButtonGroup, Button, Col, Row, Spinner } from 'reactstrap'
import { mutations, queries } from '../../../api'
import { ROUTES } from '../../../constants'
import CardWrapper from '../../../shared/card/CardWrapper'
import { SolidButton } from '../../../shared/button'
import { Plan, SubscriptionQuote } from '../../../types'
import {
  buildPlanFeatures,
  formatPlanPrice,
  getAvailableBillingCycles,
  getYearlyPrice,
  resolveCurrencyCode,
} from './helpers'
import { toaster } from '../../../utils/custom-functions'

const PlanSubscribe = () => {
  const { slug = '' } = useParams<{ slug: string }>()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const planQuery = queries.useGetPlanBySlug(slug, {
    enabled: !!slug,
  })
  const teamDetailsQuery = queries.useGetTeamDetails()
  const currentSubscriptionQuery = queries.useGetCurrentSubscription()
  const { mutate: calculateMutate, isPending: isCalculating } = mutations.useCalculateSubscription()
  const { mutate: subscribeMutate, isPending: isSubscribing } = mutations.useSubscribeToPlan()

  const plan = planQuery.data?.data as Plan | undefined
  const currency = resolveCurrencyCode(plan)
  const availableCycles = useMemo(() => getAvailableBillingCycles(plan), [plan])
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>(availableCycles[0] ?? 'monthly')
  const [memberCount, setMemberCount] = useState<number>(1)
  const [quote, setQuote] = useState<SubscriptionQuote | null>(null)
  const hasInitializedMembers = useRef(false)

  useEffect(() => {
    if (availableCycles.length && !availableCycles.includes(billingCycle)) {
      setBillingCycle(availableCycles[0])
    }
  }, [availableCycles, billingCycle])

  const clampMembers = useCallback(
    (value: number) => {
      const parsed = Number.isNaN(value) ? 1 : Math.floor(value)
      return Math.max(parsed, 1)
    },
    [],
  )

  useEffect(() => {
    hasInitializedMembers.current = false
    setQuote(null)
  }, [plan?.id])

  const teamMemberCount = teamDetailsQuery.data?.team?.memberCount

  useEffect(() => {
    if (!plan?.id || hasInitializedMembers.current) return
    const seedCount = clampMembers(teamMemberCount ?? memberCount ?? 1)
    setMemberCount(seedCount)
    hasInitializedMembers.current = true
  }, [plan?.id, teamMemberCount, clampMembers, memberCount])

  useEffect(() => {
    if (!plan?.id || memberCount < 1) return
    const timer = setTimeout(() => {
      calculateMutate(
        {
          plan_id: plan.id,
          member_count: memberCount,
          billing_cycle: billingCycle,
        },
        {
          onSuccess: (response) => setQuote(response.data),
        },
      )
    }, 250)
    return () => clearTimeout(timer)
  }, [plan?.id, memberCount, billingCycle, calculateMutate])

  const monthlyPrice = Number(plan?.price_per_user_per_month ?? 0)
  const yearlyPrice = getYearlyPrice(plan)
  const selectedPrice = billingCycle === 'monthly' ? monthlyPrice : yearlyPrice

  const features = useMemo(() => buildPlanFeatures(plan), [plan])

  const formattedQuote = useMemo(() => {
    if (!quote) return null
    const perUser = formatPlanPrice(Number(quote.price_per_user), currency)
    const total = formatPlanPrice(Number(quote.total_amount), currency)
    const formatDate = (value?: string) => {
      if (!value) return '--'
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) return '--'
      return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    }
    return {
      perUser,  
      total,
      starts: formatDate(quote.subscription_date),
      ends: formatDate(quote.expiry_date),
      members: quote.member_count,
    }
  }, [quote, currency])

  const handleSubscribe = () => {
    if (!plan?.id || memberCount < 1) return
    subscribeMutate(
      {
        plan_id: plan.id,
        member_count: memberCount,
        billing_cycle: billingCycle,
      },
      {
        onSuccess: () => {
          toaster('success', t('subscription_success'))
          navigate(ROUTES.ADMIN.PLANS)
        },
      },
    )
  }

  const renderContent = () => {
    if (planQuery.isLoading || currentSubscriptionQuery.isLoading) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
        </div>
      )
    }

    if (planQuery.isError || !plan) {
      return (
        <Alert color="danger" className="mb-0">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <span>{t('plan_not_found')}</span>
            <button className="btn btn-sm btn-outline-light" onClick={() => planQuery.refetch()}>
              {t('retry')}
            </button>
          </div>
        </Alert>
      )
    }

    // Check if user already has an active subscription
    const hasActiveSubscription = currentSubscriptionQuery.data?.data.is_active
    if (hasActiveSubscription) {
      const currentSub = currentSubscriptionQuery?.data?.data.subscription
      return (
        <Alert color="primary" className="mb-0">
          <div>
            <h5 className="mb-2">{t('active_subscription_exists')}</h5>
            <p className="mb-2">
              {t('current_subscription_details', {
                plan: currentSub?.plan?.name || 'N/A',
                date: currentSub?.expiry_date ? new Date(currentSub.expiry_date).toLocaleDateString() : 'N/A',
              })}
            </p>
            <div className="d-flex gap-2 justify-content-end">
              <SolidButton
                color="primary"
                onClick={() => navigate(ROUTES.ADMIN.SUBSCRIPTION)}
                title="view_subscription"
              />
              <SolidButton title="back_to_plans" color="outline-primary" onClick={() => navigate(ROUTES.ADMIN.PLANS)} />
            </div>
          </div>
        </Alert>
      )
    }

    return (
      <Row className="g-4">
        <Col md={7}>
          <div className="p-4 border rounded h-100">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <div>
                <h3 className="mb-1">{plan.name}</h3>
                {plan.description && <p className="text-muted mb-0">{plan.description}</p>}
              </div>
              {plan.is_default && (
                <Badge color="primary" pill>
                  {t('recommended')}
                </Badge>
              )}
            </div>
            <h5 className="mb-3">{t('what_you_get')}</h5>
            <ul className="list-unstyled mb-0">
              {features.map((feature) => (
                <li key={feature} className="d-flex align-items-start gap-2 mb-2">
                  <span className="text-success">&#10003;</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </Col>
        <Col md={5}>
          <div className="p-4 border rounded h-100 d-flex flex-column">
            <h5 className="mb-1">{t('subscription_summary')}</h5>
            <p className="text-muted">{t('review_plan_details')}</p>
            <div className="my-3">
              <span className="text-muted d-block mb-2">{t('billing_cycle')}</span>
              <ButtonGroup>
                {availableCycles.map((cycle) => (
                  <Button
                    key={cycle}
                    color={billingCycle === cycle ? 'primary' : 'light'}
                    onClick={() => setBillingCycle(cycle)}
                  >
                    {cycle === 'monthly' ? t('monthly') : t('yearly')}
                  </Button>
                ))}
              </ButtonGroup>
            </div>
            <div className="py-3 border-top border-bottom my-3">
              <div className="d-flex justify-content-between align-items-center">
                <span className="text-muted">{t('total_due_today')}</span>
                <span className="fs-4 fw-semibold">{formatPlanPrice(selectedPrice, currency)}</span>
              </div>
              <small className="text-muted">
                {billingCycle === 'monthly' 
                  ? t('per_user_monthly')
                  : t('per_user_yearly')}
              </small>
            </div>
            {billingCycle === 'yearly' && monthlyPrice > 0 && (
              <div className="alert alert-light py-2">
                {plan?.price_per_user_per_year 
                  ? t('yearly_pricing_selected')
                  : t('yearly_discount_hint', {
                      discount: 20,
                    })}
              </div>
            )}
            <div className="bg-light-subtle border rounded p-3 my-3">
              <h6 className="mb-3">{t('cost_breakdown')}</h6>
              {isCalculating ? (
                <div className="text-center py-2">
                  <Spinner size="sm" color="primary" />
                  <div className="small text-muted mt-2">{t('calculating')}</div>
                </div>
              ) : formattedQuote ? (
                <>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">{t('member_count')}</span>
                    <span className="fw-semibold">{formattedQuote.members}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">{t('price_per_user')}</span>
                    <span className="fw-semibold">{formattedQuote.perUser}</span>
                  </div>
                  <div className="d-flex justify-content-between mb-2">
                    <span className="text-muted">{t('total_amount')}</span>
                    <span className="fw-semibold">{formattedQuote.total}</span>
                  </div>
                  <div className="d-flex justify-content-between small text-muted">
                    <span>
                      {t('starts_on')}: <span className="fw-semibold text-dark">{formattedQuote.starts}</span>
                    </span>
                    <span>
                      {t('ends_on')}: <span className="fw-semibold text-dark">{formattedQuote.ends}</span>
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted mb-0 small">
                  {t('quote_placeholder')}
                </p>
              )}
            </div>
            <SolidButton
              color="primary"
              className="w-100 mt-auto"
              loading={isSubscribing}
              disabled={!formattedQuote || isCalculating || isSubscribing}
              onClick={handleSubscribe}
            >
              {t('proceed_to_payment')}
            </SolidButton>          
          </div>
        </Col>
      </Row>
    )
  }

  return (
    <div className="admin-plan-subscribe">
      <CardWrapper
        backBtn
        heading={{
          title: 'Subscribe to plan',
          subtitle: plan ? plan.name : t('select_plan_to_continue'),
        }}
      >
        {renderContent()}
      </CardWrapper>
    </div>
  )
}

export default PlanSubscribe
