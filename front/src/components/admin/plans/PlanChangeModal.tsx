import { useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Spinner } from 'reactstrap'
import { mutations } from '../../../api'
import { PlanChangeModalProps } from '../../../types'
import { formatPlanPrice, resolveCurrencyCode } from './helpers'
import { SimpleModal } from '../../../shared/modal'
import { toaster } from '../../../utils/custom-functions'

const PlanChangeModal: React.FC<PlanChangeModalProps> = ({ isOpen, onClose, plan, currentSubscription, onSuccess }) => {
  const { t } = useTranslation()
  const { mutate: previewMutate, data: previewData, isPending: isPreviewing } = mutations.usePreviewPlanChange()
  const { mutate: changeMutate, isPending: isChanging } = mutations.useChangePlan()

  const currency = useMemo(() => (plan ? resolveCurrencyCode(plan) : 'USD'), [plan])
  const memberCount = currentSubscription?.member_count ?? 1

  useEffect(() => {
    if (plan && currentSubscription && isOpen && memberCount >= 1) {
      previewMutate(
        {
          new_plan_id: plan.id,
          new_member_count: memberCount,
        },
        {
          onError: (error: any) => {
            toaster('error', error?.response?.data?.message || t('failed_to_preview_change'))
          },
        },
      )
    }
  }, [plan, currentSubscription, memberCount, isOpen, previewMutate, t])

  const preview = previewData?.data
  const changeType = preview?.change_type

  const handleConfirmChange = async () => {
    if (!plan) return

    changeMutate(
      {
        new_plan_id: plan.id,
        new_member_count: memberCount,
      },
      {
        onSuccess: () => {
          toaster('success', t('plan_change_success', { defaultValue: 'Plan changed successfully' }))
          onSuccess()
          onClose()
        },
        onError: (error: any) => {
          toaster('error', error?.response?.data?.message || t('failed_to_change_plan'))
        },
      },
    )
  }

  if (!plan || !currentSubscription) return null

  const modalTitle =
    changeType === 'upgrade' || changeType === 'increase_seats'
      ? t('upgrade_plan', { defaultValue: 'Upgrade Plan' })
      : t('downgrade_plan', { defaultValue: 'Downgrade Plan' })

  const isConfirmDisabled =
    !preview || isPreviewing || (preview?.proration.type === 'charge' && !preview?.wallet.sufficient_balance)

  return (
    <SimpleModal
      isOpen={isOpen}
      onClose={onClose}
      title={modalTitle}
      size="lg"
      closable={!isChanging}
      closeOnBackdrop={!isChanging}
      closeOnEscape={!isChanging}
      footerJustify="end"
      actions={[
        {
          text: t('cancel', { defaultValue: 'Cancel' }),
          color: 'light',
          onClick: onClose,
          disabled: isChanging,
        },
        {
          text:
            changeType === 'upgrade' || changeType === 'increase_seats'
              ? t('confirm_upgrade', { defaultValue: 'Confirm Upgrade' })
              : t('confirm_downgrade', { defaultValue: 'Confirm Downgrade' }),
          color: changeType === 'downgrade' || changeType === 'decrease_seats' ? 'warning' : 'primary',
          onClick: handleConfirmChange,
          loading: isChanging,
          disabled: isConfirmDisabled,
        },
      ]}
    >
      <div className="plans-aligns mb-4">
        <div className="w-100">
          <h5 className="mb-2">
            {t('changing_to_plan', { defaultValue: 'Changing to' })}: {plan.name}
          </h5>
          <p className="text-muted mb-0">
            {t('current_plan', { defaultValue: 'Current plan' })}: {currentSubscription.plan?.name || 'N/A'}
          </p>
        </div>
      </div>

      {isPreviewing ? (
        <div className="text-center py-4">
          <Spinner color="primary" />
          <div className="mt-2 text-muted">{t('calculating', { defaultValue: 'Calculating...' })}</div>
        </div>
      ) : preview ? (
        <div className="border rounded p-3 mb-3 summary-card">
          <h6 className="mb-3">{t('change_summary', { defaultValue: 'Change Summary' })}</h6>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">{t('days_remaining', { defaultValue: 'Days Remaining' })}:</span>
            <span className="fw-semibold">{preview.proration.days_remaining}</span>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">{t('unused_amount', { defaultValue: 'Unused Amount' })}:</span>
            <span className="fw-semibold">{formatPlanPrice(preview.proration.unused_amount, currency)}</span>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">{t('new_period_cost', { defaultValue: 'New Period Cost' })}:</span>
            <span className="fw-semibold">{formatPlanPrice(preview.proration.new_period_cost, currency)}</span>
          </div>

          <hr />

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">
              {preview.proration.type === 'charge'
                ? t('amount_to_charge', { defaultValue: 'Amount to Charge' })
                : t('amount_to_refund', { defaultValue: 'Amount to Refund' })}
              :
            </span>
            <span className={`fw-semibold ${preview.proration.type === 'charge' ? 'text-danger' : 'text-success'}`}>
              {preview.proration.type === 'charge' ? '+' : '-'}
              {formatPlanPrice(Math.abs(preview.proration.charge_or_refund), currency)}
            </span>
          </div>

          <div className="d-flex justify-content-between mb-2">
            <span className="text-muted">{t('current_wallet_balance', { defaultValue: 'Current Balance' })}:</span>
            <span className="fw-semibold">{formatPlanPrice(Number(preview.wallet.current_balance), currency)}</span>
          </div>

          <div className="d-flex justify-content-between">
            <span className="text-muted">{t('balance_after_change', { defaultValue: 'Balance After Change' })}:</span>
            <span className="fw-semibold">
              {formatPlanPrice(Number(preview.wallet.balance_after_change), currency)}
            </span>
          </div>

          {!preview.wallet.sufficient_balance && preview.proration.type === 'charge' && (
            <Alert color="warning" className="mt-3 mb-0">
              {t('insufficient_balance', {
                defaultValue: 'Insufficient wallet balance. Please add funds to your wallet.',
              })}
            </Alert>
          )}
        </div>
      ) : (
        <Alert color="info">{t('preview_unavailable', { defaultValue: 'Preview unavailable' })}</Alert>
      )}
    </SimpleModal>
  )
}

export default PlanChangeModal
