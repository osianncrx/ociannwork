import axios, { AxiosRequestConfig, AxiosError } from 'axios'
import { getToken } from '../utils'

async function post<TInput, TResponse>(url: string, data?: TInput): Promise<TResponse> {
  const authToken = getToken()
  const isFormData = data instanceof FormData

  const config: AxiosRequestConfig = {
    method: 'POST',
    url,
    headers: {
      Authorization: `Bearer ${authToken}`,
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    },
    data,
  }

  try {
    const response = await axios(config)
    return response.data as TResponse
  } catch (error) {
    const axiosError = error as AxiosError<any>

    const responseData = axiosError.response?.data as { message?: string }

    const message = responseData?.message || axiosError.message || 'Something went wrong'

    throw new Error(message)
  }
}

export default post
