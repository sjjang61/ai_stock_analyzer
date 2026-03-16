import axios from "axios";

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:8000",
  timeout: 60000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.response.use(
  (res) => res.data,
  (err) => {
    const message = err.response?.data?.detail ?? "서버 오류가 발생했습니다.";
    return Promise.reject(new Error(message));
  }
);
