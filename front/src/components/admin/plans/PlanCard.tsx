import { FC, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Badge, Card, CardBody } from 'reactstrap'
import { SolidButton } from '../../../shared/button'
import { PlanCardProps } from '../../../types'
import { getAllPlanFeatures, formatPlanPrice, getYearlyPrice, resolveCurrencyCode } from './helpers'

const PlanCard: FC<PlanCardProps> = ({
  plan,
  currentSubscription,
  onSubscribe,
  onChangePlan,
  selectedBillingCycle = 'monthly',
}) => {
  const { t } = useTranslation()
  const currency = resolveCurrencyCode(plan)

  // Calculate prices directly
  const monthlyPrice = Number(plan.price_per_user_per_month ?? 0)
  const yearlyPrice = getYearlyPrice(plan)

  const cycle = (plan.billing_cycle || 'monthly').toLowerCase()
  const showMonthly = cycle === 'monthly' || cycle === 'both'
  const showYearly = cycle === 'yearly' || cycle === 'both'

  // Determine which price to display based on selected billing cycle
  const displayPrice = selectedBillingCycle === 'yearly' ? yearlyPrice : monthlyPrice
  const displayPeriod =
    selectedBillingCycle === 'yearly'
      ? t('per_user_year_short', { defaultValue: '/user/year' })
      : t('per_user_month_short', { defaultValue: '/user/month' })

  const allFeatures = useMemo(() => getAllPlanFeatures(plan), [plan])

  // Determine button state based on current subscription
  const buttonState = useMemo(() => {
    if (!currentSubscription) {
      return { type: 'subscribe' as const, label: t('subscribe', { defaultValue: 'Subscribe' }) }
    }

    const currentPlanId = currentSubscription.plan_id
    const currentPrice = Number(currentSubscription.plan?.price_per_user_per_month ?? 0)
    const thisPrice = Number(plan.price_per_user_per_month ?? 0)

    if (currentPlanId === plan.id) {
      return { type: 'subscribed' as const, label: t('subscribed', { defaultValue: 'Subscribed' }) }
    }

    if (thisPrice > currentPrice) {
      return { type: 'upgrade' as const, label: t('upgrade', { defaultValue: 'Upgrade' }) }
    }

    return { type: 'downgrade' as const, label: t('downgrade', { defaultValue: 'Downgrade' }) }
  }, [currentSubscription, plan, t])

  return (
    <Card className={`h-100 plan-card ${plan.is_default ? 'plan-card--recommended' : ''}`}>
      <CardBody className="d-flex flex-column">
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="plan-card-content">
            <h4 className="mb-1">{plan.name}</h4>
            {/* {plan.description && <p className="text-muted mb-0 small">{plan.description}</p>} */}
          </div>
          {plan.is_default && (
            <Badge color="primary" pill>
              {t('recommended', { defaultValue: 'Recommended' })}
            </Badge>
          )}
        </div>

        <div className="plan-card__pricing my-3">
          <div className="d-flex align-items-baseline gap-2">
            <h4>{formatPlanPrice(displayPrice, currency)}</h4>
            <span className="text-muted">{displayPeriod}</span>
            {selectedBillingCycle === 'yearly' &&
              showYearly &&
              !plan.price_per_user_per_year &&
              showMonthly &&
              monthlyPrice > 0 && (
                <Badge color="light" className="text-primary ms-2">
                  {t('yearly_discount_badge', { defaultValue: '20% off vs monthly' })}
                </Badge>
              )}
          </div>
        </div>

        <div className="plan-features flex-grow-1">
          <ul className="list-unstyled mb-0">
            {allFeatures.map((feature, index) => (
              <li key={`${feature.label}-${index}`} className="d-flex align-items-start gap-2 mb-2">
                {feature.available ? (
                  <span className="text-success feature-icon">&#10003;</span>
                ) : (
                  <span className="text-muted feature-icon unavailable">&#10005;</span>
                )}
                <span className={`feature-label ${feature.available ? 'text-dark' : 'text-muted'}`}>
                  {feature.label}
                  {feature.value && <span className="text-muted ms-1 feature-value">({feature.value})</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-auto">
          {buttonState.type === 'subscribed' ? (
            <SolidButton color="success" className="w-100" disabled>
              {buttonState.label}
            </SolidButton>
          ) : (
            <SolidButton
              color={buttonState.type === 'downgrade' ? 'warning' : 'primary'}
              className="w-100"
              onClick={() => {
                if (buttonState.type === 'subscribe') {
                  onSubscribe(plan)
                } else if (onChangePlan) {
                  onChangePlan(plan)
                }
              }}
            >
              {buttonState.label}
            </SolidButton>
          )}
        </div>
      </CardBody>
    </Card>
  )
}

export default PlanCard
