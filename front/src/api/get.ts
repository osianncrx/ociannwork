import { Params } from '../types'
import apiClient from './apiClient'

async function get<T>(url: string, params?: Params): Promise<T> {
  try {
    const response = await apiClient.get<T>(url, { params })
    return response.data
  } catch (error) {
    throw error
  }
}

export default get
