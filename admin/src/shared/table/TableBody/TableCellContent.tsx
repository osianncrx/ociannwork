import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { hideLoader, showLoader } from '../../../store/slices/loaderSlice'
import { Column } from '../../../types'
import { COLUMN_TYPE } from '../../../types/constants'
import { formatDate, formatDateTime, formatNumber, getStatusBadgeClass } from '../../../utils'
import { ConfirmModal } from '../../modal'

export const TableCellContent = <T extends Record<string, string | number | boolean | null | undefined>>({
  field,
  row,
  onActionPerform,
}: {
  field: Column<T>['dataField'][0]
  row: T
  onActionPerform?: (action: { actionToPerform: string; data: T }) => void
}) => {
  const val = row[field.field as keyof T]

  const [statusSwitchState, setStatusSwitchState] = useState({
    isSwitchOn: false,
    showConfirmation: false,
    pendingValue: null as boolean | null,
  })

  const dispatch = useAppDispatch()
  const { loading } = useAppSelector((state) => state.loader)
  const switchRef = useRef<HTMLInputElement>(null)

  const isCurrentlyActive =
    field.type === COLUMN_TYPE.StatusSwitch && field.formatOptions?.statusSwitch?.activeValue === val

  useEffect(() => {
    if (field.type === COLUMN_TYPE.StatusSwitch) {
      setStatusSwitchState((prev) => ({
        ...prev,
        isSwitchOn: isCurrentlyActive,
      }))
    }
  }, [val, field.type, field.formatOptions?.statusSwitch?.activeValue, isCurrentlyActive])

  if (field.renderer) return <Fragment>{field.renderer(row)}</Fragment>

  const handleStatusSwitchToggle = () => {
    if (loading) return

    const newValue = !statusSwitchState.isSwitchOn
    setStatusSwitchState((prev) => ({
      ...prev,
      pendingValue: newValue,
      showConfirmation: true,
    }))

    if (switchRef.current) {
      switchRef.current.checked = statusSwitchState.isSwitchOn
    }
  }

  const handleStatusSwitchConfirm = async () => {
    dispatch(showLoader())

    try {
      const action = statusSwitchState.pendingValue
        ? field.formatOptions?.statusSwitch?.actionMap?.activate || 'activate'
        : field.formatOptions?.statusSwitch?.actionMap?.deactivate || 'deactivate'

      await onActionPerform?.({
        actionToPerform: 'status',
        data: {
          ...row,
          action: action,
          field: field,
        } as T,
      })

      setStatusSwitchState((prev) => ({
        ...prev,
        isSwitchOn: prev.pendingValue!,
        showConfirmation: false,
        pendingValue: null,
      }))
      dispatch(hideLoader())
    } catch (err) {
      if (switchRef.current) {
        switchRef.current.checked = statusSwitchState.isSwitchOn
      }
      setStatusSwitchState((prev) => ({
        ...prev,
        showConfirmation: false,
        pendingValue: null,
      }))
      dispatch(hideLoader())
    }
  }

  const handleStatusSwitchCancel = () => {
    if (switchRef.current) {
      switchRef.current.checked = statusSwitchState.isSwitchOn
    }
    setStatusSwitchState((prev) => ({
      ...prev,
      showConfirmation: false,
      pendingValue: null,
    }))
  }

  const stringVal = String(val ?? '')

  switch (field.type) {
    case COLUMN_TYPE.Date:
      return (
        <span>
          {formatDate(stringVal, field.formatOptions?.dateStyle || 'medium', {
            locale: field.formatOptions?.locale,
            timeZone: field.formatOptions?.timeZone,
          })}
        </span>
      )

    case COLUMN_TYPE.DateTime:
      return (
        <span>
          {formatDateTime(
            stringVal,
            field.formatOptions?.dateStyle || 'medium',
            {
              hour12: field.formatOptions?.hour12,
              showSeconds: field.formatOptions?.showSeconds,
              timeStyle: field.formatOptions?.timeStyle,
              customFormat: field.formatOptions?.timeFormatOptions,
            },
            {
              locale: field.formatOptions?.locale,
              timeZone: field.formatOptions?.timeZone,
              separator: field.formatOptions?.separator || ' ',
            },
          )}
        </span>
      )

    case COLUMN_TYPE.Number:
      return (
        <span>
          {formatNumber(
            typeof val === 'number' ? val : Number(val),
            field.formatOptions?.decimalPlaces,
            field.formatOptions?.thousandSeparator,
          )}
        </span>
      )

    case COLUMN_TYPE.Boolean:
      return (
        <span className={`badge ${val ? 'bg-success' : 'bg-secondary'}`}>
          {val ? field.formatOptions?.trueText || 'Yes' : field.formatOptions?.falseText || 'No'}
        </span>
      )

    case COLUMN_TYPE.TextProfile:
      return <div className="text-profile">{stringVal.slice(0, field.formatOptions?.length || 2).toUpperCase()}</div>

    case COLUMN_TYPE.Link:
      return (
        <Link
          to={field.formatOptions?.baseUrl ? `${field.formatOptions.baseUrl}${stringVal}` : stringVal}
          target={field.formatOptions?.newTab ? '_blank' : '_self'}
        >
          {field.formatOptions?.linkText || stringVal}
        </Link>
      )

    case COLUMN_TYPE.Status:
      return (
        <span className={`badge ${getStatusBadgeClass(stringVal, field?.formatOptions?.statusMap)}`}>
          {field?.formatOptions?.statusMap?.[stringVal] || stringVal}
        </span>
      )

    case COLUMN_TYPE.StatusSwitch:
      return (
        <>
          <label className="custom-switch mt-3">
            <input
              type="checkbox"
              checked={statusSwitchState.isSwitchOn}
              onChange={handleStatusSwitchToggle}
              disabled={loading}
              ref={switchRef}
            />
            <span className="slider" />
            {field.formatOptions?.statusSwitch?.activeLabel && (
              <span className="switch-label">
                {loading ? 'Processing...' : statusSwitchState.isSwitchOn ? 'Active' : 'Inactive'}
              </span>
            )}
          </label>

          <ConfirmModal
            subtitle={`Are you sure you want to ${
              statusSwitchState.pendingValue ? 'activate' : 'deactivate'
            } this item?`}
            title={`Confirm ${statusSwitchState.pendingValue ? 'Activation' : 'Deactivation'}`}
            variant="info"
            isOpen={statusSwitchState.showConfirmation}
            onClose={handleStatusSwitchCancel}
            onConfirm={handleStatusSwitchConfirm}
            isLoading={loading}
          />
        </>
      )

    case COLUMN_TYPE.Switch: {
      const isChecked = field.checkCondition ? field.checkCondition(val, row) : Boolean(val)

      return (
        <label className="custom-switch mb-0">
          <input type="checkbox" checked={isChecked} onChange={() => field.onToggle?.(row)} disabled={false} />
          <span className="slider" />
        </label>
      )
    }

    default:
      return <span>{stringVal}</span>
  }
}
