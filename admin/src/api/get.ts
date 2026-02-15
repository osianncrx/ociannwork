import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { getToken } from "../utils";
import { Params } from "../types";

async function get<T>(url: string, params?: Params,headers?: Record<string, string>): Promise<T> {
  const token = getToken();

  const config: AxiosRequestConfig = {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      ...headers
    },
    params,
  };

  try {
    const response = await axios.get<T>(url, config);
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<any>;

    const responseData = axiosError.response?.data as { message?: string };
    const message = responseData?.message || axiosError.message || "Something went wrong";

    throw new Error(message);
  }
}

export default get;
