import { AxiosRequestConfig } from 'axios'
import apiClient from './apiClient'

async function del<TResponse, TData = unknown>(
  url: string,
  data?: TData,
  config: AxiosRequestConfig = {},
): Promise<TResponse> {
  try {
    const response = await apiClient.delete<TResponse>(url, {
      ...config,
      data,
    })
    return response.data
  } catch (error) {
    throw error
  }
}

export default del
