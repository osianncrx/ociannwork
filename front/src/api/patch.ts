import apiClient from './apiClient'

async function patch<TInput, TResponse>(url: string, data?: TInput): Promise<TResponse> {
  try {
    const response = await apiClient.patch<TResponse>(url, data)
    return response.data
  } catch (error) {
    throw error
  }
}

export default patch

