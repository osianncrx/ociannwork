import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { Action } from '../../../types'
import { SolidButton } from '../../button/SolidButton'
import SvgIcon from '../../icons/SvgIcon'

export const ActionRenderer = <T extends Record<string, string | number | boolean | null | undefined>>({
  action,
  row,
  onActionPerform,
}: {
  action: Action<T>
  row: T
  onActionPerform?: (action: { actionToPerform: string; data: T }) => void
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const getButtonClasses = <TData extends Record<string, string | number | boolean | null | undefined>>(
    action: Action<TData>,
  ) => {
    if (action?.className) return action.className
    switch (action.actionToPerform) {
      case 'edit':
        return 'btn btn-primary'
      case 'delete':
        return 'btn btn-danger'
      case 'view':
        return 'btn btn-info'
      default:
        return 'btn btn-secondary'
    }
  }

  const isConditionMet = <TData extends Record<string, string | number | boolean | null | undefined>>(
    action: Action<TData>,
    row: TData,
  ): boolean | string => {
    if (!action.conditional || !action.conditional.field) return true
    const fieldKey = action.conditional.field
    const fieldVal = row[fieldKey]

    switch (action.conditional.condition) {
      case '?': {
        const [trueLabel, falseLabel] = action.conditional.actionLabel?.split(':') || []
        return fieldVal ? trueLabel : falseLabel
      }
      case 'include':
        return (
          Array.isArray(action.conditional.conditionValue) &&
          action.conditional.conditionValue.includes(String(fieldVal))
        )
      case 'notInclude':
        return (
          !Array.isArray(action.conditional.conditionValue) ||
          !action.conditional.conditionValue.includes(String(fieldVal))
        )
      case '===':
        return fieldVal === action.conditional.conditionValue
      case '!=':
        return fieldVal !== action.conditional.conditionValue
      default:
        return true
    }
  }

  if (action.renderer) return <Fragment>{action.renderer(row)}</Fragment>

  const label = action.conditional ? isConditionMet(action, row) : t(action.label)
  if (typeof label !== 'string') return null

  const buttonClasses = getButtonClasses(action)
  const rowId = 'id' in row ? row.id : ''

  return action.getNavigateUrl ? (
    <SolidButton className="btn-bg-secondary" onClick={() => navigate(`${rowId}`)}>
      <SvgIcon className="common-svg-hw" iconId="show-eye" />
    </SolidButton>
  ) : (
    <div
      className={buttonClasses}
      onClick={() =>
        onActionPerform?.({
          actionToPerform: action.actionToPerform!,
          data: row,
        })
      }
    >
      {label}
    </div>
  )
}
