import { Action, Column } from '../../../types'
import TableLoader from '../TableLoader'
import { ActionRenderer } from './ActionRender'
import { TableCellContent } from './TableCellContent'

export const TableBody = <T extends Record<string, any>>({
  data,
  columns,
  visibleColumns,
  processedActions,
  onActionPerform,
  selectedRows,
  toggleRowSelection,
  isRefetching = false,
  hasChecks
}: {
  data: T[]
  columns: Column<T>[]
  visibleColumns: Record<string, boolean>
  processedActions: Action<T>[]
  onActionPerform?: (action: { actionToPerform: string; data: T }) => void
  selectedRows: Set<string | number>
  toggleRowSelection: (rowId: string | number) => void
  isRefetching?: boolean
  hasChecks?: boolean
}) => {
  if (data.length === 0 && !isRefetching) {
    return (
      <tbody>
        <tr>
          <td colSpan={columns.length + 2} className="text-center py-4 no-data-found">
            No Data Found
          </td>
        </tr>
      </tbody>
    )
  }

  return (
    <tbody>
      {isRefetching && (
        <tr>
          <td colSpan={columns.length + 2} className="text-center py-4">
            <TableLoader />
          </td>
        </tr>
      )}
      {data.map((row, rowIndex) => (
        <tr key={row.id || rowIndex}>
          {hasChecks && (
            <td className="form-check-input checkbox-primary">
              <label className="custom-checkbox-wrapper">
                <input
                  type="checkbox"
                  checked={selectedRows.has(row.id)}
                  onChange={() => toggleRowSelection(row.id)}
                />
                <span className="custom-checkbox"></span>
              </label>
            </td>
          )}
          {columns.map(
            (col, colIndex) =>
              visibleColumns[col.title] && (
                <td key={colIndex}>
                  {col.dataField?.map((field, fieldIndex) => (
                    <TableCellContent key={fieldIndex} field={field} row={row} onActionPerform={onActionPerform} />
                  ))}
                </td>
              ),
          )}
          {processedActions.length > 0 && (
            <td>
              <div className="user-action">
                {processedActions.map((action, actionIndex) => (
                  <ActionRenderer key={actionIndex} action={action} row={row} onActionPerform={onActionPerform} />
                ))}
              </div>
            </td>
          )}
        </tr>
      ))}
    </tbody>
  )
}