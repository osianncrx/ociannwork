// @ts-nocheck
import {
  InvalidateQueryFilters,
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query'
import { HTTP_STATUS } from '../../constants'
import { CombinedErrorResponse } from '../../types'
import { errorMessage, toaster } from '../../utils/custom-functions'

function useApiPost<TInput, TResponse>(
  mutationKey: QueryKey,
  callback: (input: TInput) => Promise<TResponse>,
  options?: UseMutationOptions<TResponse, CombinedErrorResponse, TInput>,
) {
  const q = useQueryClient()

  return useMutation<TResponse, CombinedErrorResponse, TInput>({
    mutationKey,
    mutationFn: callback,
    ...options,
    onSuccess: (data, variables, context, mutationContext) => {
      for (let i = 1; i < mutationKey.length; i++) {
        q.invalidateQueries({ queryKey: [mutationKey[i]] } as InvalidateQueryFilters)
      }
      options?.onSuccess?.(data, variables, context, mutationContext)
    },
    onError: (error: CombinedErrorResponse, variables, context, mutationContext) => {
      if (options?.onError) {
        options.onError(error, variables, context, mutationContext)
      } else {
        switch (error.status) {
          case HTTP_STATUS.UNAUTHORIZED:
            break
          default:
            toaster('error', errorMessage(error))
            break
        }
      }
    },
  })
}

export default useApiPost
