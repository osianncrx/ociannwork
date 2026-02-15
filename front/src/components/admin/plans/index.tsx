import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Col, Row, Spinner } from 'reactstrap'
import { queries } from '../../../api'
import { ROUTES } from '../../../constants'
import { SolidButton } from '../../../shared/button'
import CardWrapper from '../../../shared/card/CardWrapper'
import { BillingCycleChoice, Plan } from '../../../types'
import PlanCard from './PlanCard'
import PlanChangeModal from './PlanChangeModal'

const Plans = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [isChangeModalOpen, setIsChangeModalOpen] = useState(false)
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<BillingCycleChoice>('monthly')

  const { data, isLoading, isError, refetch } = queries.useGetPlans({
    status: 'active',
    limit: 50,
    sort_by: 'display_order',
    sort_order: 'DESC',
  })

  const { data: currentSubscription, refetch: refetchSubscription } = queries.useGetCurrentSubscription()

  const plans = useMemo(() => data?.data?.plans ?? [], [data])
  const translations = {
    unableToLoad: t('unable_to_load_plans', { defaultValue: 'Unable to load plans' }),
    retry: t('retry', { defaultValue: 'Retry' }),
    empty: t('no_plans_available', { defaultValue: 'No plans available yet.' }),
  }

  const handleSubscribe = (plan: Plan) => {
    navigate(ROUTES.ADMIN.PLAN_SUBSCRIBE.replace(':slug', plan.slug))
  }

  const handleChangePlan = (plan: Plan) => {
    setSelectedPlan(plan)
    setIsChangeModalOpen(true)
  }

  const handleChangeSuccess = () => {
    refetchSubscription()
    refetch()
  }

  const renderBody = () => {
    if (isLoading) {
      return (
        <div className="text-center py-5">
          <Spinner color="primary" />
        </div>
      )
    }

    if (isError) {
      return (
        <Alert color="danger" className="mb-0">
          <div className="d-flex justify-content-between align-items-center gap-3">
            <span>{translations.unableToLoad}</span>
            <button className="btn btn-sm btn-outline-light" onClick={() => refetch()}>
              {translations.retry}
            </button>
          </div>
        </Alert>
      )
    }

    if (!plans.length) {
      return <div className="text-center py-5 text-muted">{translations.empty}</div>
    }

    return (
      <Row className="g-4">
        {plans.map((plan) => (
          <Col key={plan.id} xs={12} md={6} xl={3}>
           <PlanCard
              plan={plan}
              currentSubscription={currentSubscription?.data.subscription}
              onSubscribe={handleSubscribe}
              onChangePlan={handleChangePlan}
              selectedBillingCycle={selectedBillingCycle}
            />
          </Col>
        ))}
      </Row>
    )
  }

  const hasActiveSubscription = currentSubscription?.data.is_active
  const currentSub = currentSubscription?.data.subscription

  return (
    <div className="admin-plan-list">
      {/* Current Subscription Banner */}
      {hasActiveSubscription && currentSub && (
        <Alert color="primary" className="mb-4">
          <div className="d-flex justify-content-between align-items-center flex-wrap gap-3">
            <div>
              <h5 className="mb-1">
                {t('current_subscription', { defaultValue: 'Current Subscription' })}
              </h5>
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <Badge color="success">{currentSub.plan?.name || 'N/A'}</Badge>
                <span className="text-muted">
                  {t('expires_on', {
                    defaultValue: 'Expires on {{date}}',
                    date: new Date(currentSub.expiry_date).toLocaleDateString(),
                  })}
                </span>
                <span className="text-muted">
                  ({t('days_remaining', {
                    defaultValue: '{{days}} days remaining',
                    days: currentSubscription.data.days_remaining,
                  })})
                </span>
              </div>
            </div>
            <SolidButton
              color="primary"
              onClick={() => navigate(ROUTES.ADMIN.SUBSCRIPTION)}
            >
              {t('manage_subscription', { defaultValue: 'Manage Subscription' })}
            </SolidButton>
          </div>
        </Alert>
      )}

      <CardWrapper
        heading={{ title: 'Subscription Plans', subtitle: 'Select the right plan for your team' }}
      >
        {/* Billing Cycle Toggle */}
        <div className="row admin-plan-list-wrapper">
          <div className='col-6 btns'>
            <Button
              color={selectedBillingCycle === 'monthly' ? 'primary' : 'light'}
              onClick={() => setSelectedBillingCycle('monthly')}
              active={selectedBillingCycle === 'monthly'}
            >
              {t('monthly', { defaultValue: 'Monthly' })}
            </Button>
            <Button
              color={selectedBillingCycle === 'yearly' ? 'primary' : 'light'}
              onClick={() => setSelectedBillingCycle('yearly')}
              active={selectedBillingCycle === 'yearly'}
            >
              {t('yearly', { defaultValue: 'Yearly' })}
            </Button>
          </div>
        </div>
        {renderBody()}
      </CardWrapper>

      <PlanChangeModal
        isOpen={isChangeModalOpen}
        onClose={() => {
          setIsChangeModalOpen(false)
          setSelectedPlan(null)
        }}
        plan={selectedPlan}
        currentSubscription={currentSubscription?.data.subscription || null}
        onSuccess={handleChangeSuccess}
      />
    </div>
  )
}

export default Plans

