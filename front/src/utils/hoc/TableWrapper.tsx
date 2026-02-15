import { useEffect, useState, Children, cloneElement, ReactElement, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { FormGroup, Input } from 'reactstrap'
import { SolidButton } from '../../shared/button'
import { SvgIcon } from '../../shared/icons'
import ImportExport from '../../shared/table/ImportExport'
import CommonPagination from '../../shared/table/Pagination'
import PerPage from '../../shared/table/PerPage'
import { TableWrapperProps } from '../../types'

const TableWrapper = ({
  children,
  pagination,
  search = {
    term: '',
    onSearch: () => {},
    placeholder: 'Search...',
    debounceTime: 500,
  },
  importExportConfig,
  activeTab,
  refetch,
  // Actions
  handleBulkActions,
  showDelete = false,
  // Customization
  customTopControls,
  customBottomControls,
  // Selection
  onSelectionChange,
}: TableWrapperProps) => {
  const { t } = useTranslation()
  const [searchText, setSearchText] = useState(search.term)
  const [selectedRowsCount, setSelectedRowsCount] = useState(0)
  const [selectedRowsData, setSelectedRowsData] = useState<any[]>([])

  useEffect(() => {
    setSearchText('')
  }, [activeTab])

  useEffect(() => {
    setSearchText(search.term)
  }, [search.term])

  useEffect(() => {
    const timer = setTimeout(() => {
      search.onSearch(searchText)
    }, search.debounceTime)
    return () => clearTimeout(timer)
  }, [searchText, search.debounceTime])

  const handleSelectionChange = useCallback((data: any[]) => {
    setSelectedRowsData(data)
    setSelectedRowsCount(data.length)
    onSelectionChange?.(data)
  }, [onSelectionChange])

  const hasData = pagination.total > 0
  const startItem = hasData ? (pagination.page - 1) * pagination.size + 1 : 0
  const endItem = hasData ? Math.min(pagination.page * pagination.size, pagination.total) : 0

  return (
    <> 
      <div className="custom-selection-box flex-between margin-b-18">
        <div className="table-controls-left common-flex-start gap-3">
          <PerPage itemsPerPage={pagination.size} onChange={pagination.onSizeChange} />

          <div className="action-button common-flex-start gap-2">
            {showDelete && selectedRowsCount > 0 && (
              <SolidButton
                className="btn-outline-danger"
                onClick={() => handleBulkActions?.('delete', selectedRowsData)}
              >
                <SvgIcon iconId="table-delete" className="common-svg-hw danger-fill-stroke" />
                {t('Delete')} ({selectedRowsCount})
              </SolidButton>
            )} 

            {importExportConfig && (
              <ImportExport
                importExport={{ 
                  importUrl: importExportConfig.importUrl,
                  exportUrl: importExportConfig.exportUrl,
                  paramsProps: importExportConfig.paramsProps,
                }}
                refetch={refetch}
                moduleName={importExportConfig.moduleName || 'data'}
                exportButton={importExportConfig.exportButton !== false}
              />
            )}
            {customTopControls}
          </div>
        </div>

        {search && (
          <div className="login-form">
            <div className="login-input custom-search-input">
              <FormGroup className="text-start">
                <Input
                  placeholder={search.placeholder}
                  type="text" 
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                />
                <SvgIcon className="form-icon" iconId="search-bar" />
              </FormGroup> 
            </div>
          </div>
        )}
      </div>

      {Children.map(children, (child) => {
        return cloneElement(child as ReactElement<any>, {
          setSelectedRowsCount,
          onSelectionChange: handleSelectionChange,
        })
      })}

      <div className="flex-between pagination-footer-wrapper">
        <span>
          {hasData
            ? `${t('Showing')} ${startItem} ${t('to')} ${endItem} ${t('of')} ${pagination.total} ${t('entries')}`
            : t('No entries found')}
        </span>

        <CommonPagination
          currentPage={pagination.page}
          goToPage={pagination.onPageChange}
          itemsPerPage={pagination.size}
          handleSetPageSize={pagination.onSizeChange}
          totalItems={pagination.total}
        />

        {customBottomControls}
      </div>
    </>
  )
}

export default TableWrapper
