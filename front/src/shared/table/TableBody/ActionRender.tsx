import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Fragment } from 'react/jsx-runtime'
import { Action } from '../../../types'
import { SolidButton } from '../../button'
import { SvgIcon } from '../../icons'

export const ActionRenderer = <T extends Record<string, string>>({
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

  const getButtonClasses = <T extends Record<string, string>>(action: Action<T>) => {
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

  const isConditionMet = <T extends Record<string, any>>(action: Action<T>, row: T): boolean | string => {
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

  return action.getNavigateUrl ? (
    <SolidButton className="btn-bg-secondary" onClick={() => navigate(`${row.id}`)}>
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
