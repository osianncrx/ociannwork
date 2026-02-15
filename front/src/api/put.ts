import apiClient from './apiClient'

async function put<TInput, TResponse>(url: string, data?: TInput): Promise<TResponse> {
  try {
    const response = await apiClient.put<TResponse>(url, data)
    return response.data
  } catch (error) {
    throw error
  }
}

export default put
