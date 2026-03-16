import { apiClient } from "./client";

export const indicatorsApi = {
  getList: (ticker: string, limit = 60) =>
    apiClient.get(`/api/indicators/${ticker}`, { params: { limit } }) as Promise<any[]>,

  getLatest: (ticker: string) =>
    apiClient.get(`/api/indicators/${ticker}/latest`) as Promise<any>,
};
