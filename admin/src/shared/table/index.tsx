import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Table } from 'reactstrap'
import { Action, Column, CommonTableProps } from '../../types'
import { SolidButton } from '../button/SolidButton'
import SvgIcon from '../icons/SvgIcon'
import { TableHeader } from './TableHeader'
import { TableBody } from './TableBody'

export const CommonTable = <T extends Record<string, string | number | boolean | null | undefined>>({
  tableConfiguration,
  onActionPerform,
  onSelectionChange,
  isCheckBox,
  sort,
}: CommonTableProps<T> & {
  setSelectedRowsCount?: (count: number) => void
  isCheckBox?: boolean
  sort?: {
    onSort: (sortBy: string) => void
    toggleSort: (item: { sortDirection: 'asc' | 'desc' | string }) => void
  }
}) => {
  const { t } = useTranslation()
  const [activeSort, setActiveSort] = useState<{
    field: keyof T
    direction: 'asc' | 'desc'
  } | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())

  useEffect(() => {
    const initialVisibility = tableConfiguration?.columns.reduce((acc, col) => {
      acc[col.title] = !col.hidden
      return acc
    }, {} as Record<string, boolean>)
    setVisibleColumns(initialVisibility)
  }, [tableConfiguration?.columns])

  useEffect(() => {
    if (onSelectionChange) {
      const selectedData = tableConfiguration?.data?.filter((row) => {
        const rowId = 'id' in row ? (row.id as string | number) : null
        return rowId !== null && selectedRows.has(rowId)
      })
      onSelectionChange(selectedData || [])
    }
  }, [selectedRows, onSelectionChange, tableConfiguration.data])

  const toggleSort = (col: Column<T>) => {
    if (!col.sortField) return
    const newDir = activeSort?.field === col.sortField && activeSort.direction === 'asc' ? 'desc' : 'asc'
    setActiveSort({ field: col.sortField, direction: newDir })

    if (sort) {
      sort.onSort(col.sortField as string)
      sort.toggleSort({ sortDirection: newDir })
    }
  }

  const isAllSelected =
    tableConfiguration?.data?.length > 0 &&
    tableConfiguration?.data?.every((row) => {
      const rowId = 'id' in row ? (row.id as string | number) : null
      return rowId !== null && selectedRows.has(rowId)
    })

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedRows(new Set())
    } else {
      const allIds =
        tableConfiguration?.data
          ?.map((row) => ('id' in row ? (row.id as string | number) : null))
          .filter((id): id is string | number => id !== null) || []
      setSelectedRows(new Set(allIds))
    }
  }

  const isConditionMet = (action: Action<T>, row: T): boolean | string => {
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

  const processedActions = tableConfiguration?.actionsDropDown?.map((action) => {
    if (typeof action === 'string') {
      switch (action) {
        case 'edit':
          return {
            label: t('Edit'),
            actionToPerform: 'edit',
            renderer: (row: T) => (
              <SolidButton
                className="btn-bg-secondary"
                onClick={() => onActionPerform?.({ actionToPerform: 'edit', data: row })}
              >
                <SvgIcon className="common-svg-hw" iconId="table-edit" />
              </SolidButton>
            ),
          }
        case 'delete':
          return {
            label: t('Delete'),
            actionToPerform: 'delete',
            renderer: (row: T) => (
              <SolidButton
                className="btn-bg-danger"
                onClick={() => onActionPerform?.({ actionToPerform: 'delete', data: row })}
              >
                <SvgIcon className="common-svg-hw danger-fill-stroke" iconId="table-delete" />
              </SolidButton>
            ),
          }
        case 'view':
          throw new Error('View actions must be configured with viewConfig')
        default:
          return action
      }
    }

    if (action.actionToPerform === 'view') {
      if (!action.viewConfig) {
        throw new Error('View actions must include viewConfig with redirectUrl')
      }

      const { redirectUrl, icon, className } = action.viewConfig

      return {
        ...action,
        renderer: (row: T) => (
          <Link to={redirectUrl(row)}>
            <SolidButton className={className || 'btn-bg-warning'}>
              <SvgIcon className="common-svg-hw" iconId={icon || 'show-eye'} />
            </SolidButton>
          </Link>
        ),
      }
    }

    return action
  }) as Action<T>[]

  const getButtonClasses = (action: Action<T>) => {
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

  const toggleRowSelection = (id: string | number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  return (
    <div
      className={`common-table table-scrollbar ${tableConfiguration?.data?.length <= 1 ? 'table-fixed-height' : ''}`}
    >
      <div className="table-responsive custom-scrollbar">
        <Table hover className="mb-0">
          <TableHeader
            columns={tableConfiguration?.columns || []}
            visibleColumns={visibleColumns}
            toggleSort={toggleSort}
            toggleAll={toggleAll}
            isAllSelected={isAllSelected}
            hasActions={tableConfiguration?.actionsDropDown?.length > 0}
            isCheckBox={isCheckBox}
          />
          <TableBody
            data={tableConfiguration?.data || []}
            columns={tableConfiguration?.columns || []}
            visibleColumns={visibleColumns}
            processedActions={processedActions}
            onActionPerform={onActionPerform}
            selectedRows={selectedRows}
            toggleRowSelection={toggleRowSelection}
            isCheckBox={isCheckBox}
          />
        </Table>
      </div>
    </div>
  )
}

export default CommonTable
