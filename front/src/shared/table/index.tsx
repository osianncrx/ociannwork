import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Table } from 'reactstrap'
import { Column, CommonTableProps } from '../../types'
import { processActions } from './ActionProcessors'
import { TableBody } from './TableBody'
import { TableHeader } from './TableHeader'

export const CommonTable = <T extends Record<string, any>>({
  tableConfiguration,
  onActionPerform,
  sort,
  setSelectedRowsCount,
  onSelectionChange,
  showHeader = true,
  hasChecks = true,
  className,
  isRefetching,
}: CommonTableProps<T> & {
  setSelectedRowsCount?: (count: number) => void
  showHeader?: boolean
  onSelectionChange?: (selectedData: T[]) => void
  isRefetching?: boolean
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
    const initialVisibility = tableConfiguration?.columns.reduce(
      (acc, col) => {
        acc[col.title] = !col.hidden
        return acc
      },
      {} as Record<string, boolean>,
    )
    setVisibleColumns(initialVisibility)
  }, [tableConfiguration?.columns])

  useEffect(() => {
    setSelectedRows(new Set())
  }, [tableConfiguration?.data?.length])

  const selectedData = useMemo(() => {
    return tableConfiguration?.data?.filter((row) => selectedRows.has(row.id)) || []
  }, [selectedRows, tableConfiguration.data])

  useEffect(() => {
    setSelectedRowsCount?.(selectedRows.size)
    onSelectionChange?.(selectedData)
  }, [selectedRows.size, selectedData, setSelectedRowsCount, onSelectionChange])

  const toggleSort = (col: Column<T>) => {
    if (!col.sortField) return
    const newDir = activeSort?.field === col.sortField && activeSort.direction === 'asc' ? 'desc' : 'asc'
    setActiveSort({ field: col.sortField, direction: newDir })

    if (sort) {
      sort.onSort(col.sortField as string)
      sort.toggleSort({ sortDirection: newDir })
    }
  }

  const isAllSelected = tableConfiguration?.data?.length > 0 && selectedRows.size === tableConfiguration?.data?.length

  const toggleAll = () => {
    if (isAllSelected) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(tableConfiguration?.data?.map((row) => row.id)))
    }
  }

  const toggleRowSelection = (rowId: string | number) => {
    const newSelected = new Set(selectedRows)
    if (newSelected.has(rowId)) {
      newSelected.delete(rowId)
    } else {
      newSelected.add(rowId)
    }
    setSelectedRows(newSelected)
  }

  const processedActions = useMemo(() => {
    return tableConfiguration?.actionsDropDown
      ? processActions(tableConfiguration.actionsDropDown, t, onActionPerform)
      : []
  }, [tableConfiguration?.actionsDropDown, t, onActionPerform])

  return (
    <div
      className={`common-table table-scrollbar ${tableConfiguration?.data?.length <= 1 ? 'table-fixed-height' : ''}`}
    >
      <div className="table-responsive custom-scrollbar">
        <Table hover className={`${className ? className : ''} mb-0`}>
          {showHeader && (
            <TableHeader
              columns={tableConfiguration?.columns || []}
              visibleColumns={visibleColumns}
              toggleSort={toggleSort}
              toggleAll={toggleAll}
              isAllSelected={isAllSelected}
              hasActions={tableConfiguration?.actionsDropDown?.length > 0}
              hasChecks={hasChecks}
            />
          )}
          <TableBody
            data={tableConfiguration?.data || []}
            columns={tableConfiguration?.columns || []}
            visibleColumns={visibleColumns}
            processedActions={processedActions}
            onActionPerform={onActionPerform}
            selectedRows={selectedRows}
            toggleRowSelection={toggleRowSelection}
            hasChecks={hasChecks}
            isRefetching={isRefetching}
          />
        </Table>
      </div>
    </div>
  )
}

export default CommonTable
