import { useCallback, useEffect, useState } from 'react'
import useDebounce from './useDebounce'
import { Params } from '../../types'

const useBasicTableFilterHelper = (initialParams?: Params) => {
  const [pageNumber, setPageNumber] = useState<number>(
    typeof initialParams?.PageNumber === 'number' ? initialParams.PageNumber : 1,
  )

  const [pageSize, setPageSize] = useState<number>(
    typeof initialParams?.PageSize === 'number' ? initialParams.PageSize : 15,
  )
  const [searchTerm, setSearchTerm] = useState<string>('')
  const [searchPlaceholder, setSearchPlaceholder] = useState<string>(
    typeof initialParams?.placeholder === 'string' ? initialParams.placeholder : 'Search...',
  )
  const debouncedSearchTerm = useDebounce(searchTerm, 500)
  const [sortBy, setSortBy] = useState(initialParams?.sortBy ?? null)
  const [sortType, setSortType] = useState(initialParams?.sortType ?? 'desc')

  const [params, setParams] = useState<Params>({
    page: pageNumber,
    limit: pageSize,
    search: searchTerm,
    ...initialParams,
  })

  useEffect(() => {
    setParams((prevParams) => ({
      ...prevParams,
      search: debouncedSearchTerm,
      page: 1,
    }))
  }, [debouncedSearchTerm])

  useEffect(() => {
    if (sortBy && sortType) {
      setParams((prevParams) => ({
        ...prevParams,
        sort_order: `${sortType}`,
        sort_by: `${sortBy}`,
      }))
    }
  }, [sortBy, sortType])

  const handleSetSearch = useCallback((e: string) => {
    // document.body.classList.add("no-loader");
    setSearchTerm(e)
  }, [])

  const toggleSortType = useCallback((item: { sortDirection: 'asc' | 'desc' | string }) => {
    setSortType((prev: string) => {
      const next = prev === 'asc' ? 'desc' : 'asc'
      item.sortDirection = next
      return next
    })
  }, [])

  const handleSetSortBy = useCallback((e: string) => {
    setSortBy(e)
  }, [])

  const goToPage = useCallback((e: number) => {
    setPageNumber(e)
    setParams((prevParams) => ({
      ...prevParams,
      page: e,
    }))
  }, [])

  const handleSetPageSize = useCallback((e: number) => {
    setPageNumber(1)
    setPageSize(e)
    setParams((prevParams) => ({
      ...prevParams,
      limit: e,
      page: 1,
    }))
  }, [])

  return {
    pageNumber,
    pageSize,
    searchTerm,
    sortBy,
    sortType,
    params,
    searchPlaceholder,

    setSearchPlaceholder,
    setParams,
    handleSetSearch,
    toggleSortType,
    handleSetSortBy,
    goToPage,
    handleSetPageSize,
  }
}

export default useBasicTableFilterHelper
