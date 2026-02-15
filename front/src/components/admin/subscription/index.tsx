import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Badge, Button, Col, Row, Spinner } from 'reactstrap'
import { mutations, queries } from '../../../api'
import CardWrapper from '../../../shared/card/CardWrapper'
import { SolidButton } from '../../../shared/button'
import { ConfirmModal } from '../../../shared/modal'
import CommonTable from '../../../shared/table'
import { Column, SubscriptionStatus, TableConfig, TeamSubscription } from '../../../types'
import { toaster } from '../../../utils/custom-functions'
import { capitalizeFirstLetter } from '../../../utils'
import { useAppDispatch } from '../../../store/hooks'
import { setSubscription } from '../../../store/slices/subscriptionSlice'

const SubscriptionManagement = () => {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const [historyPage, setHistoryPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | undefined>(undefined)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const {
    data: currentSubscription,
    isLoading: loadingCurrent,
    refetch: refetchCurrent,
  } = queries.useGetCurrentSubscription()

  const { data: history, isLoading: loadingHistory } = queries.useGetSubscriptionHistory({
    page: historyPage,
    limit: 10,
    status: statusFilter,
  })

  const { mutate: cancelSubscription, isPending: cancelling } = mutations.useCancelSubscription()

  const handleCancelClick = () => {
    if (!currentSubscription?.data.subscription) {
      toaster('error', 'No active subscription to cancel')
      return
    }
    setShowCancelModal(true)
  }

  const handleConfirmCancel = () => {
    if (!currentSubscription?.data.subscription) {
      return
    }

    cancelSubscription(
      { id: currentSubscription.data.subscription.id },
      {
        onSuccess: (response) => {
          toaster('success', response.message || 'Subscription cancelled successfully')
          setShowCancelModal(false)
          dispatch(
            setSubscription({
              subscription: response.data,
              days_remaining: 0,
              is_active: false,
            }),
          )
          refetchCurrent()
        },
        onError: (error) => {
          const errorMessage = (error as { message?: string })?.message || 'Failed to cancel subscription'
          toaster('error', errorMessage)
        },
      },
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount)
  }

  const getStatusBadge = (status: SubscriptionStatus) => {
    const colorMap: Record<SubscriptionStatus, string> = {
      active: 'success',
      expired: 'warning',
      cancelled: 'secondary',
    }
    return <Badge color={colorMap[status]}>{capitalizeFirstLetter(status)}</Badge>
  }

  const historyColumns: Column<TeamSubscription>[] = useMemo(
    () => [
      {
        title: t('plan', { defaultValue: 'Plan' }),
        dataField: [
          {
            field: 'plan',
            renderer: (row: TeamSubscription) => row.plan?.name || 'N/A',
          },
        ],
      },
      {
        title: t('members', { defaultValue: 'Members' }),
        dataField: [
          {
            field: 'member_count',
            renderer: (row: TeamSubscription) => row.member_count,
          },
        ],
      },
      {
        title: t('billing_cycle', { defaultValue: 'Billing Cycle' }),
        dataField: [
          {
            field: 'billing_cycle',
            renderer: (row: TeamSubscription) => row.billing_cycle,
          },
        ],
      },
      {
        title: t('amount', { defaultValue: 'Amount' }),
        dataField: [
          {
            field: 'amount_paid',
            renderer: (row: TeamSubscription) => formatCurrency(row.amount_paid),
          },
        ],
      },
      {
        title: t('status', { defaultValue: 'Status' }),
        dataField: [
          {
            field: 'status',
            renderer: (row: TeamSubscription) => getStatusBadge(row.status),
          },
        ],
      },
      {
        title: t('subscription_date', { defaultValue: 'Subscription Date' }),
        dataField: [
          {
            field: 'subscription_date',
            renderer: (row: TeamSubscription) => formatDate(row.subscription_date),
          },
        ],
      },
      {
        title: t('expiry_date', { defaultValue: 'Expiry Date' }),
        dataField: [
          {
            field: 'expiry_date',
            renderer: (row: TeamSubscription) => formatDate(row.expiry_date),
          },
        ],
      },
    ],
    [formatCurrency, formatDate, getStatusBadge, t],
  )

  const historyTableConfig: TableConfig<TeamSubscription> = useMemo(
    () => ({
      columns: historyColumns,
      data: history?.subscriptions || [],
      actionsDropDown: [],
      total: history?.total || 0,
    }),
    [history?.subscriptions, history?.total, historyColumns],
  )

  return (
    <div className="subscription-management">
      <Row className="g-0">
        {/* Current Subscription Section */}
        <Col xs={12}>
          <CardWrapper
            heading={{
              title: t('current_subscription', { defaultValue: 'Current Subscription' }),
              subtitle: t('view_active_subscription_details', {
                defaultValue: 'View your active subscription details',
              }),
            }}
          >
            {loadingCurrent ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : currentSubscription?.data.subscription ? (
              <div>
                <Row className="g-3">
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">{t('plan_name', { defaultValue: 'Plan Name' })}</div>
                      <div className="fw-semibold fs-5">
                        {currentSubscription.data.subscription.plan?.name || 'N/A'}
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">{t('status', { defaultValue: 'Status' })}</div>
                      <div>{getStatusBadge(currentSubscription.data.subscription.status)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">{t('member_count', { defaultValue: 'Members' })}</div>
                      <div className="fw-semibold">{currentSubscription.data.subscription.member_count}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">
                        {t('billing_cycle', { defaultValue: 'Billing Cycle' })}
                      </div>
                      <div className="fw-semibold text-capitalize">
                        {currentSubscription.data.subscription.billing_cycle}
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">{t('amount_paid', { defaultValue: 'Amount Paid' })}</div>
                      <div className="fw-semibold">
                        {formatCurrency(currentSubscription.data.subscription.amount_paid)}
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">
                        {t('days_remaining', { defaultValue: 'Days Remaining' })}
                      </div>
                      <div className="fw-semibold fs-5">
                        {currentSubscription.data.days_remaining}{' '}
                        <span className="small text-muted">{t('days', { defaultValue: 'days' })}</span>
                      </div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">
                        {t('subscription_date', { defaultValue: 'Subscription Date' })}
                      </div>
                      <div>{formatDate(currentSubscription.data.subscription.subscription_date)}</div>
                    </div>
                  </Col>
                  <Col md={3}>
                    <div className="p-3 border rounded current-subscription-card">
                      <div className="text-muted mb-1">{t('expiry_date', { defaultValue: 'Expiry Date' })}</div>
                      <div>{formatDate(currentSubscription.data.subscription.expiry_date)}</div>
                    </div>
                  </Col>
                </Row>
                {currentSubscription.data.is_active && (
                  <div className="mt-4 pt-3 border-top text-end cancel-subscription-btn">
                    <SolidButton color="danger" onClick={handleCancelClick} disabled={cancelling}>
                      {t('cancel_subscription', { defaultValue: 'Cancel Subscription' })}
                    </SolidButton>
                  </div>
                )}
              </div>
            ) : (
              <Alert color="info" className="mb-0">
                {t('no_active_subscription', {
                  defaultValue: 'You do not have an active subscription.',
                })}
              </Alert>
            )}
          </CardWrapper>
        </Col>

        {/* Subscription History Section */}
        <Col xs={12}>
          <CardWrapper
            heading={{
              title: t('subscription_history', { defaultValue: 'Subscription History' }),
              subtitle: t('view_all_past_subscriptions', {
                defaultValue: 'View all your past subscriptions',
              }),
            }}
          >
            {/* Filter */}
            <div className="mb-3 d-flex gap-2 align-items-center flex-wrap">
              <label className="small text-muted mb-0">
                {t('filter_by_status', { defaultValue: 'Filter by status' })}:
              </label>
              <Button
                size="sm"
                color={statusFilter === undefined ? 'primary' : 'light'}
                onClick={() => setStatusFilter(undefined)}
              >
                {t('all', { defaultValue: 'All' })}
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'active' ? 'primary' : 'light'}
                onClick={() => setStatusFilter('active')}
              >
                {t('active', { defaultValue: 'Active' })}
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'expired' ? 'primary' : 'light'}
                onClick={() => setStatusFilter('expired')}
              >
                {t('expired', { defaultValue: 'Expired' })}
              </Button>
              <Button
                size="sm"
                color={statusFilter === 'cancelled' ? 'primary' : 'light'}
                onClick={() => setStatusFilter('cancelled')}
              >
                {t('cancelled')}
              </Button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-5">
                <Spinner color="primary" />
              </div>
            ) : history && history.subscriptions.length > 0 ? (
              <>
                <CommonTable
                  className="subscription-history-table custom-scrollbar"
                  tableConfiguration={historyTableConfig}
                  hasChecks={false}
                />

                {/* Pagination */}
                {history.totalPages > 1 && (
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <div className="small text-muted">
                      {t('showing_page', {
                        defaultValue: 'Showing page {{page}} of {{total}}',
                        page: history.page,
                        total: history.totalPages,
                      })}
                    </div>
                    <div className="d-flex gap-2">
                      <Button
                        size="sm"
                        color="light"
                        disabled={historyPage === 1}
                        onClick={() => setHistoryPage(historyPage - 1)}
                      >
                        {t('previous', { defaultValue: 'Previous' })}
                      </Button>
                      <Button
                        size="sm"
                        color="light"
                        disabled={historyPage >= history.totalPages}
                        onClick={() => setHistoryPage(historyPage + 1)}
                      >
                        {t('next', { defaultValue: 'Next' })}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <Alert color="info" className="mb-0">
                {t('no_subscription_history', )}
              </Alert>
            )}
          </CardWrapper>
        </Col>
      </Row>

      {/* Cancel Subscription Confirmation Modal */}
      <ConfirmModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleConfirmCancel}
        isLoading={cancelling}
        variant="danger"
        title={t('cancel_subscription', { defaultValue: 'Cancel Subscription' })}
        subtitle={t('cancel_subscription_confirmation', {
          defaultValue: 'Are you sure you want to cancel your subscription? This action cannot be undone.',
        })}
        confirmText={t('confirm_cancel', { defaultValue: 'Yes, Cancel Subscription' })}
        cancelText={t('cancel', { defaultValue: 'Cancel' })}
        loadingText={t('cancelling_subscription', { defaultValue: 'Cancelling subscription...' })}
      />
    </div>
  )
}

export default SubscriptionManagement
