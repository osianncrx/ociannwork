import { useTranslation } from 'react-i18next'
import { Column } from '../../types'
import { SvgIcon } from '../icons'

export const TableHeader = <T extends Record<string, any>>({
  columns,
  visibleColumns,
  toggleSort,
  toggleAll,
  isAllSelected,
  hasActions,
  hasChecks,
}: {
  columns: Column<T>[]
  visibleColumns: Record<string, boolean>
  toggleSort: (col: Column<T>) => void
  toggleAll: () => void
  isAllSelected: boolean
  hasActions: boolean
  hasChecks: boolean
}) => {
  const { t } = useTranslation()

  return (
    <thead>
      <tr>
        {hasChecks && (
          <th className="checkbox-primary">
            <label className="custom-checkbox-wrapper">
              <input type="checkbox" checked={isAllSelected} onChange={toggleAll} />
              <span className="custom-checkbox"></span>
            </label>
          </th>
        )}
        {columns.map(
          (col, i) =>
            visibleColumns[col.title] && (
              <th className="sortable-header" key={i} onClick={() => col.sortable && toggleSort(col)}>
                <div className="head-link">
                  <span>{t(col.title)}</span>
                  {col.sortable && (
                    <div className="indicators-arrow">
                      <SvgIcon className="filter-arrow-top" iconId="arrow-top"></SvgIcon>
                      <SvgIcon className="filter-arrow-bottom" iconId="arrow-bottom"></SvgIcon>
                    </div>
                  )}
                </div>
              </th>
            ),
        )}
        {hasActions && (
          <th>
            <p className="member-row">{t('actions')}</p>
          </th>
        )}
      </tr>
    </thead>
  )
}
