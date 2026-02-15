import { AxiosError } from 'axios'

type AxiosErrorShape = AxiosError<{ message?: string; error?: string }>

function isAxiosError(error: unknown): error is AxiosErrorShape {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  )
}

export const errorMessage = (
  error: AxiosErrorShape | Error | object | null | undefined,
  fallback = 'Something went wrong',
): string => {
  if (!error) return fallback

  if (isAxiosError(error)) {
    return error.response?.data?.message || error.response?.data?.error || error.message || fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}
