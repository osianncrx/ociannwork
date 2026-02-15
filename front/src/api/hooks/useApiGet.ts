import { useQuery, useQueryClient, UseQueryOptions } from '@tanstack/react-query'
import { useAppDispatch } from '../../store/hooks'
import { hidePageLoader, showPageLoader } from '../../store/slices/loaderSlice'
import { CombinedErrorResponse } from '../../types'

function useApiGet<T, P = void>(
  key: unknown[],
  callback: (param?: P) => Promise<T>,
  options?: Omit<UseQueryOptions<T, CombinedErrorResponse, T, unknown[]>, 'queryKey' | 'queryFn'>,
) {
  const dispatch = useAppDispatch()
  const loaderKey = key.join('_')
  const queryClient = useQueryClient()

  return useQuery<T, CombinedErrorResponse, T, unknown[]>({
    queryKey: key,
    queryFn: async () => {
      dispatch(showPageLoader(loaderKey))
      try {
        return await callback()
      } finally {
        dispatch(hidePageLoader(loaderKey))
      }
    },

    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
    initialData: () => {
      return queryClient.getQueryData<T>(key) ?? undefined
    },
    ...options,
  })
}

export default useApiGet
