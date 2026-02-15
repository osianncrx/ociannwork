import {
  InvalidateQueryFilters,
  QueryKey,
  useMutation,
  UseMutationOptions,
  useQueryClient,
} from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { HTTP_STATUS, ROUTES } from "../../constants";
import { useAppDispatch } from "../../store/hooks";
import { logout } from "../../store/slices/authSlice";
import { errorMessage } from "../../utils/custom-functions";
import { toaster } from "../../utils/custom-functions";
import { CombinedErrorResponse } from "../../types";

function useApiPost<TInput, TResponse>(
  mutationKey: QueryKey,
  callback: (input: TInput) => Promise<TResponse>,
  options?: UseMutationOptions<TResponse, CombinedErrorResponse, TInput>
) {
  const q = useQueryClient();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  return useMutation<TResponse, CombinedErrorResponse, TInput>({
    mutationKey,
    mutationFn: callback,
    ...options,
    onSuccess: (data, variables, undefined, context) => {
      for (let i = 1; i < mutationKey.length; i++) {
        q.invalidateQueries({ queryKey: [mutationKey[i]] } as InvalidateQueryFilters);
      }
      options?.onSuccess?.(data, variables,undefined, context);
    },
    onError: (error: CombinedErrorResponse) => {
      switch (error.status) {
        case HTTP_STATUS.UNAUTHORIZED:
          dispatch(logout());
          navigate(ROUTES.LOGIN + `?returnUrl=${window.location.pathname}`, {
            replace: true,
          });
          break;
        default:
          toaster("error", errorMessage(error));
          break;
      }
    },
  });
}

export default useApiPost;
