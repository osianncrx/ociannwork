import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getToken } from "../utils";

async function remove<T>(url: string, data?: any, customConfig: Partial<AxiosRequestConfig> = {}): Promise<T> {
  const token = getToken()
  const defaultConfig: AxiosRequestConfig = {
    method: 'DELETE',
    url,
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data,
  }

  const config: AxiosRequestConfig = {
    ...defaultConfig,
    ...customConfig,
    headers: {
      ...defaultConfig.headers,
      ...customConfig.headers,
    },
  }

  try {
    const response = await axios(config)
    return response.data
  } catch (error: any) {
    const axiosError = error as AxiosError<any>

    const responseData = axiosError.response?.data as { message?: string }

    const message = responseData?.message || axiosError.message || 'Something went wrong'

    throw new Error(message)
  }
}

export default remove;
