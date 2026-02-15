import { useTranslation } from 'react-i18next'
import { Column } from '../../types'
import SvgIcon from '../icons/SvgIcon'

export const TableHeader = <T extends Record<string, string | number | boolean | null | undefined>>({
  columns,
  visibleColumns,
  toggleSort,
  toggleAll,
  isAllSelected,
  hasActions,
  isCheckBox = true,
}: {
  columns: Column<T>[]
  visibleColumns: Record<string, boolean>
  toggleSort: (col: Column<T>) => void
  toggleAll: () => void
  isAllSelected: boolean
  hasActions: boolean
  isCheckBox?: boolean
}) => {
  const { t } = useTranslation()

  return (
    <thead>
      <tr>
        {isCheckBox && (
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
