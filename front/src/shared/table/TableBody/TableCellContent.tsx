import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { useAppDispatch, useAppSelector } from '../../../store/hooks'
import { hideLoader, showLoader } from '../../../store/slices/loaderSlice'
import { Column } from '../../../types'
import { formatDate, formatDateTime, formatNumber, getStatusBadgeClass } from '../../../utils'
import { ConfirmModal } from '../../modal'
import { ColumnType } from '../../../constants'

export const TableCellContent = <T extends Record<string, any>>({
  field,
  row,
  onActionPerform,
}: {
  field: Column<T>['dataField'][0]
  row: T
  onActionPerform?: (action: { actionToPerform: string; data: T }) => void
}) => {
  const val = row[field.field as keyof T]

  if (field.renderer) return <Fragment>{field.renderer(row)}</Fragment>

  switch (field.type) {
    case ColumnType.Date:
      return (
        <span>
          {formatDate(val, field.formatOptions?.dateStyle || 'medium', {
            locale: field.formatOptions?.locale,
            timeZone: field.formatOptions?.timeZone,
          })}
        </span>
      )

    case ColumnType.DateTime:
      return (
        <span>
          {formatDateTime(
            val,
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

    case ColumnType.Number:
      return (
        <span>{formatNumber(val, field.formatOptions?.decimalPlaces, field.formatOptions?.thousandSeparator)}</span>
      )

    case ColumnType.Boolean:
      return (
        <span className={`badge ${val ? 'bg-success' : 'bg-secondary'}`}>
          {val ? field.formatOptions?.trueText || 'Yes' : field.formatOptions?.falseText || 'No'}
        </span>
      )

    case ColumnType.TextProfile:
      return (
        <div className="text-profile">
          {String(val)
            .slice(0, field.formatOptions?.length || 2)
            .toUpperCase()}
        </div>
      )

    case ColumnType.Link:
      return (
        <Link
          to={field.formatOptions?.baseUrl ? `${field.formatOptions.baseUrl}${val}` : String(val)}
          target={field.formatOptions?.newTab ? '_blank' : '_self'}
        >
          {field.formatOptions?.linkText || String(val)}
        </Link>
      )

    case ColumnType.Status:
      return (
        <span className={`badge ${getStatusBadgeClass(val, field.formatOptions?.statusMap)}`}>
          {field.formatOptions?.statusMap?.[val] || String(val)}
        </span>
      )

    case ColumnType.StatusSwitch: {
      const isCurrentlyActive = field.formatOptions?.statusSwitch?.activeValue === val
      const [isSwitchOn, setIsSwitchOn] = useState(isCurrentlyActive)

      const [showConfirmation, setShowConfirmation] = useState(false)
      const dispatch = useAppDispatch()
      const { loading } = useAppSelector((state) => state.loader)
      const switchRef = useRef<HTMLInputElement>(null)

      useEffect(() => {
        const newActiveState = field.formatOptions?.statusSwitch?.activeValue === val
        setIsSwitchOn(newActiveState)
      }, [val, field.formatOptions?.statusSwitch?.activeValue])

      const handleToggle = () => {
        if (loading) return
        setShowConfirmation(true)
      }

      const handleConfirm = async () => {
        dispatch(showLoader())

        const newValue = !isSwitchOn
        const originalValue = isSwitchOn

        if (switchRef.current) {
          switchRef.current.checked = originalValue
        }

        const action = newValue
          ? field.formatOptions?.statusSwitch?.actionMap?.activate || 'reactivate'
          : field.formatOptions?.statusSwitch?.actionMap?.deactivate || 'deactivate'

        try {
          await onActionPerform?.({
            actionToPerform: 'status',
            data: {
              ...row,
              action: action,
              field: field,
            },
          })

          setIsSwitchOn(newValue)
          setShowConfirmation(false)
          dispatch(hideLoader())
        } catch (err) {
          if (switchRef.current) {
            switchRef.current.checked = isSwitchOn
          }
          dispatch(hideLoader())
          setShowConfirmation(false)
        }
      }

      const handleCancel = () => {
        if (switchRef.current) {
          switchRef.current.checked = isSwitchOn
        }
        setShowConfirmation(false)
      }

      return (
        <>
          <label className="custom-switch mt-3">
            <input type="checkbox" checked={isSwitchOn} onChange={handleToggle} disabled={loading} ref={switchRef} />
            <span className="slider" />
            {field.formatOptions?.statusSwitch?.activeLabel && (
              <span className="switch-label">{loading ? 'Processing...' : isSwitchOn ? 'Active' : 'Inactive'}</span>
            )}
          </label>

          <ConfirmModal
            subtitle={`Are you sure you want to ${!isSwitchOn ? 'activate' : 'deactivate'} this item?`}
            title={`Confirm ${!isSwitchOn ? 'Activation' : 'Deactivation'}`}
            variant="info"
            isOpen={showConfirmation}
            onClose={handleCancel}
            onConfirm={handleConfirm}
            isLoading={loading}
          />
        </>
      )
    }

    default:
      return <span>{String(val)}</span>
  }
}
