import apiClient from './apiClient'

async function post<TInput, TResponse>(url: string, data?: TInput): Promise<TResponse> {
  try {
    const response = await apiClient.post<TResponse>(url, data)
    return response.data
  } catch (error) {
    throw error
  }
}

export default post
