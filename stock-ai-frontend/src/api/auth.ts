import { apiClient } from "./client";
import type { AuthUser } from "@/types/auth";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

export const authApi = {
  /** 카카오 로그인 페이지로 리다이렉트 */
  loginKakao: () => {
    window.location.href = `${BASE}/api/auth/kakao`;
  },

  /** 네이버 로그인 페이지로 리다이렉트 */
  loginNaver: () => {
    window.location.href = `${BASE}/api/auth/naver`;
  },

  /** JWT 토큰으로 내 정보 조회 */
  getMe: (token: string): Promise<AuthUser> =>
    apiClient.get("/api/auth/me", { params: { token } }) as Promise<AuthUser>,
};
