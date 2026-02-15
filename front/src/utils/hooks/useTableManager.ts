import useBasicTableFilterHelper from './useBasicTableFilterHelper'

 const useTableManager = (initialParams = {}) => {
  const {
    pageNumber,
    pageSize,
    goToPage,
    handleSetPageSize,
    searchTerm,
    toggleSortType,
    handleSetSortBy,
    params,
    handleSetSearch,
    searchPlaceholder,
  } = useBasicTableFilterHelper(initialParams)

  return {
    pagination: {
      page: pageNumber,
      size: pageSize,
      total: 0,
      onPageChange: goToPage,
      onSizeChange: handleSetPageSize,
    },
    search: {
      term: searchTerm,
      placeholder: searchPlaceholder,
      onSearch: handleSetSearch,
    },
    sort: {
      onSort: handleSetSortBy,
      toggleSort: toggleSortType,
    },
    params,
  }
}

export default useTableManager
